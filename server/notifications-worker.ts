import { getDb } from './db';
import { products, cashflowTransactions, orderProfitability, fulfillments, orders, notificationPreferences } from '../drizzle/schema';
import { eq, lt, lte, sum, desc, and, gte, count } from 'drizzle-orm';
import { notifyOwner } from './_core/notification';
import { publishEvent } from './events';

/**
 * Automated Notifications Worker
 * Checks business thresholds and sends owner notifications
 * Called via /api/scheduled/notifications heartbeat cron
 */

/**
 * Check for products below reorder point
 */
export async function checkLowInventory(): Promise<{ alerts: number }> {
  const db = await getDb();
  if (!db) return { alerts: 0 };

  const lowStockProducts = await db.select({
    id: products.id,
    name: products.name,
    sku: products.sku,
    stockQuantity: products.stockQuantity,
    reorderPoint: products.reorderPoint,
  }).from(products)
    .where(lt(products.stockQuantity, products.reorderPoint));

  if (lowStockProducts.length === 0) return { alerts: 0 };

  // Build Arabic notification
  const productList = lowStockProducts.map(p => 
    `• ${p.name} (${p.sku}): ${p.stockQuantity} وحدة متبقية (الحد الأدنى: ${p.reorderPoint})`
  ).join('\n');

  await notifyOwner({
    title: `⚠️ تنبيه مخزون منخفض - ${lowStockProducts.length} منتج`,
    content: `المنتجات التالية أقل من حد إعادة الطلب:\n\n${productList}\n\nيرجى مراجعة المخزون وإعادة الطلب.`,
  });

  // Publish events for each product
  for (const product of lowStockProducts) {
    await publishEvent({
      eventType: 'low_inventory_alert',
      severity: 'warning',
      title: `Low Inventory: ${product.name}`,
      description: `Stock at ${product.stockQuantity}, below reorder point of ${product.reorderPoint}`,
      relatedProductId: product.id,
      metadata: { currentStock: product.stockQuantity, threshold: product.reorderPoint },
    });
  }

  return { alerts: lowStockProducts.length };
}

/**
 * Check for negative cashflow
 */
export async function checkNegativeCashflow(): Promise<{ isNegative: boolean; netCashflow: number }> {
  const db = await getDb();
  if (!db) return { isNegative: false, netCashflow: 0 };

  // Check last 30 days cashflow
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const incoming = await db.select({ total: sum(cashflowTransactions.amount) })
    .from(cashflowTransactions)
    .where(and(
      eq(cashflowTransactions.transactionType, 'incoming'),
      gte(cashflowTransactions.transactionDate, thirtyDaysAgo)
    ));

  const outgoing = await db.select({ total: sum(cashflowTransactions.amount) })
    .from(cashflowTransactions)
    .where(and(
      eq(cashflowTransactions.transactionType, 'outgoing'),
      gte(cashflowTransactions.transactionDate, thirtyDaysAgo)
    ));

  const netCashflow = Number(incoming[0]?.total || 0) - Number(outgoing[0]?.total || 0);

  if (netCashflow < 0) {
    await notifyOwner({
      title: '🚨 تنبيه: تدفق نقدي سلبي',
      content: `التدفق النقدي خلال آخر 30 يوم سلبي:\n\nالوارد: ${Number(incoming[0]?.total || 0).toLocaleString('ar-EG')} ج.م\nالصادر: ${Number(outgoing[0]?.total || 0).toLocaleString('ar-EG')} ج.م\nالصافي: ${netCashflow.toLocaleString('ar-EG')} ج.م\n\nيرجى مراجعة المصروفات والتحصيلات فوراً.`,
    });

    await publishEvent({
      eventType: 'negative_cashflow_alert',
      severity: 'critical',
      title: 'Negative Cashflow Alert',
      description: `Net cashflow is negative: ${netCashflow}`,
      metadata: { netCashflow, incoming: Number(incoming[0]?.total || 0), outgoing: Number(outgoing[0]?.total || 0) },
    });
  }

  return { isNegative: netCashflow < 0, netCashflow };
}

/**
 * Check for high-cost (losing) orders
 */
export async function checkHighCostOrders(): Promise<{ alerts: number }> {
  const db = await getDb();
  if (!db) return { alerts: 0 };

  // Find recent losing orders (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const losingOrders = await db.select({
    id: orderProfitability.id,
    orderId: orderProfitability.orderId,
    revenue: orderProfitability.revenue,
    totalCost: orderProfitability.totalCost,
    netProfit: orderProfitability.netProfit,
  }).from(orderProfitability)
    .where(and(
      eq(orderProfitability.profitabilityStatus, 'losing'),
      gte(orderProfitability.createdAt, oneDayAgo)
    ));

  if (losingOrders.length === 0) return { alerts: 0 };

  const orderList = losingOrders.map(o => 
    `• طلب #${o.orderId}: إيراد ${Number(o.revenue).toLocaleString('ar-EG')} ج.م | تكلفة ${Number(o.totalCost).toLocaleString('ar-EG')} ج.م | خسارة ${Math.abs(Number(o.netProfit)).toLocaleString('ar-EG')} ج.م`
  ).join('\n');

  await notifyOwner({
    title: `⚠️ طلبات خاسرة - ${losingOrders.length} طلب`,
    content: `تم اكتشاف طلبات ذات تكلفة مرتفعة خلال آخر 24 ساعة:\n\n${orderList}\n\nيرجى مراجعة هيكل التكاليف.`,
  });

  for (const order of losingOrders) {
    await publishEvent({
      eventType: 'high_cost_order',
      severity: 'warning',
      title: `High-Cost Order #${order.orderId}`,
      description: `Order is losing money: revenue ${order.revenue}, cost ${order.totalCost}`,
      relatedOrderId: order.orderId,
      metadata: { revenue: order.revenue, totalCost: order.totalCost, netProfit: order.netProfit },
    });
  }

  return { alerts: losingOrders.length };
}

/**
 * Check for failed deliveries
 */
export async function checkFailedDeliveries(): Promise<{ alerts: number }> {
  const db = await getDb();
  if (!db) return { alerts: 0 };

  // Find recently failed fulfillments (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const failedFulfillments = await db.select({
    id: fulfillments.id,
    orderId: fulfillments.orderId,
    trackingNumber: fulfillments.trackingNumber,
  }).from(fulfillments)
    .where(and(
      eq(fulfillments.shippingStatus, 'failed'),
      gte(fulfillments.updatedAt, oneDayAgo)
    ));

  if (failedFulfillments.length === 0) return { alerts: 0 };

  const failedList = failedFulfillments.map(f => 
    `• طلب #${f.orderId} (تتبع: ${f.trackingNumber || 'غير متوفر'})`
  ).join('\n');

  await notifyOwner({
    title: `🚨 شحنات فاشلة - ${failedFulfillments.length} شحنة`,
    content: `تم اكتشاف شحنات فاشلة خلال آخر 24 ساعة:\n\n${failedList}\n\nيرجى التواصل مع شركة الشحن والعملاء.`,
  });

  for (const f of failedFulfillments) {
    await publishEvent({
      eventType: 'failed_delivery',
      severity: 'critical',
      title: `Failed Delivery for Order #${f.orderId}`,
      description: `Fulfillment ${f.id} has failed delivery`,
      relatedOrderId: f.orderId,
      metadata: { trackingNumber: f.trackingNumber },
    });
  }

  return { alerts: failedFulfillments.length };
}

/**
 * Generate daily financial summary
 */
export async function generateDailyFinancialSummary(): Promise<{ sent: boolean }> {
  const db = await getDb();
  if (!db) return { sent: false };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Orders today
  const todayOrders = await db.select({
    orderCount: count(),
    totalRevenue: sum(orders.totalRevenue),
  }).from(orders)
    .where(and(gte(orders.orderDate, yesterday), lt(orders.orderDate, today)));

  // Cashflow today
  const todayIncoming = await db.select({ total: sum(cashflowTransactions.amount) })
    .from(cashflowTransactions)
    .where(and(
      eq(cashflowTransactions.transactionType, 'incoming'),
      gte(cashflowTransactions.transactionDate, yesterday),
      lt(cashflowTransactions.transactionDate, today)
    ));

  const todayOutgoing = await db.select({ total: sum(cashflowTransactions.amount) })
    .from(cashflowTransactions)
    .where(and(
      eq(cashflowTransactions.transactionType, 'outgoing'),
      gte(cashflowTransactions.transactionDate, yesterday),
      lt(cashflowTransactions.transactionDate, today)
    ));

  const revenue = Number(todayOrders[0]?.totalRevenue || 0);
  const orderCount = Number(todayOrders[0]?.orderCount || 0);
  const cashIn = Number(todayIncoming[0]?.total || 0);
  const cashOut = Number(todayOutgoing[0]?.total || 0);
  const netCashflow = cashIn - cashOut;

  const dateStr = yesterday.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  await notifyOwner({
    title: `📊 الملخص المالي اليومي - ${dateStr}`,
    content: [
      `الملخص المالي ليوم ${dateStr}:`,
      '',
      `📦 الطلبات: ${orderCount} طلب`,
      `💰 الإيرادات: ${revenue.toLocaleString('ar-EG')} ج.م`,
      `📈 التدفق الوارد: ${cashIn.toLocaleString('ar-EG')} ج.م`,
      `📉 التدفق الصادر: ${cashOut.toLocaleString('ar-EG')} ج.م`,
      `${netCashflow >= 0 ? '✅' : '🚨'} صافي التدفق: ${netCashflow.toLocaleString('ar-EG')} ج.م`,
      '',
      'راجع لوحة التحكم لمزيد من التفاصيل.',
    ].join('\n'),
  });

  await publishEvent({
    eventType: 'daily_financial_summary',
    severity: 'info',
    title: 'Daily Financial Summary',
    description: `Revenue: ${revenue}, Orders: ${orderCount}, Net Cashflow: ${netCashflow}`,
    metadata: { revenue, orderCount, cashIn, cashOut, netCashflow, date: yesterday.toISOString() },
  });

  return { sent: true };
}

/**
 * Get owner notification preferences
 */
async function getOwnerPreferences(): Promise<{
  lowInventory: boolean;
  negativeCashflow: boolean;
  highCostOrders: boolean;
  failedDelivery: boolean;
  dailySummary: boolean;
}> {
  const db = await getDb();
  if (!db) return { lowInventory: true, negativeCashflow: true, highCostOrders: true, failedDelivery: true, dailySummary: true };
  
  // Get owner's preferences (user id 1 is typically owner)
  const result = await db.select().from(notificationPreferences).limit(1);
  if (result.length === 0) {
    return { lowInventory: true, negativeCashflow: true, highCostOrders: true, failedDelivery: true, dailySummary: true };
  }
  return {
    lowInventory: result[0].lowInventory ?? true,
    negativeCashflow: result[0].negativeCashflow ?? true,
    highCostOrders: result[0].highCostOrders ?? true,
    failedDelivery: result[0].failedDelivery ?? true,
    dailySummary: result[0].dailySummary ?? true,
  };
}

/**
 * Run all notification checks
 * Called by the scheduled handler
 * Respects owner notification preferences
 */
export async function runAllNotificationChecks(): Promise<{
  lowInventory: { alerts: number };
  negativeCashflow: { isNegative: boolean; netCashflow: number };
  highCostOrders: { alerts: number };
  failedDeliveries: { alerts: number };
  dailySummary: { sent: boolean };
}> {
  console.log('[Notifications] Running all notification checks...');

  // Load preferences to respect user settings
  const prefs = await getOwnerPreferences();
  console.log('[Notifications] Owner preferences:', prefs);

  const [lowInventory, negativeCashflow, highCostOrders, failedDeliveries, dailySummary] = await Promise.all([
    prefs.lowInventory
      ? checkLowInventory().catch(e => { console.error('[Notifications] Low inventory check failed:', e); return { alerts: 0 }; })
      : Promise.resolve({ alerts: 0 }),
    prefs.negativeCashflow
      ? checkNegativeCashflow().catch(e => { console.error('[Notifications] Cashflow check failed:', e); return { isNegative: false, netCashflow: 0 }; })
      : Promise.resolve({ isNegative: false, netCashflow: 0 }),
    prefs.highCostOrders
      ? checkHighCostOrders().catch(e => { console.error('[Notifications] High cost orders check failed:', e); return { alerts: 0 }; })
      : Promise.resolve({ alerts: 0 }),
    prefs.failedDelivery
      ? checkFailedDeliveries().catch(e => { console.error('[Notifications] Failed deliveries check failed:', e); return { alerts: 0 }; })
      : Promise.resolve({ alerts: 0 }),
    prefs.dailySummary
      ? generateDailyFinancialSummary().catch(e => { console.error('[Notifications] Daily summary failed:', e); return { sent: false }; })
      : Promise.resolve({ sent: false }),
  ]);

  console.log('[Notifications] Check results:', { lowInventory, negativeCashflow, highCostOrders, failedDeliveries, dailySummary });

  return { lowInventory, negativeCashflow, highCostOrders, failedDeliveries, dailySummary };
}
