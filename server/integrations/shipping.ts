import { getDb } from '../db';
import { publishEvent } from '../events';

/**
 * Shipping Reconciliation Engine
 * Handles: COD reconciliation, delivery analysis, failed shipment tracking, shipping profitability
 */

export interface ShippingRecord {
  id: string;
  orderId: number;
  trackingNumber: string;
  carrier: string;
  shippingCost: number;
  weight: number;
  destination: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  deliveryDate?: Date;
  failureReason?: string;
  codAmount?: number;
  codCollected?: number;
  codStatus?: 'pending' | 'collected' | 'failed';
}

export interface ShippingMetrics {
  totalShipments: number;
  deliveredCount: number;
  failedCount: number;
  returnedCount: number;
  averageDeliveryTime: number; // in days
  deliverySuccessRate: number; // percentage
  totalShippingCost: number;
  totalCODAmount: number;
  totalCODCollected: number;
  codCollectionRate: number; // percentage
  failedShipmentCost: number;
  averageShippingCostPerOrder: number;
}

export interface CODReconciliation {
  orderId: number;
  expectedAmount: number;
  collectedAmount: number;
  difference: number;
  status: 'reconciled' | 'pending' | 'discrepancy';
  reconciliationDate?: Date;
}

export interface DeliveryAnalysis {
  orderId: number;
  orderDate: Date;
  deliveryDate: Date;
  deliveryDays: number;
  carrier: string;
  trackingNumber: string;
  status: 'on_time' | 'delayed' | 'failed';
  delayDays?: number;
}

export interface FailedShipmentImpact {
  orderId: number;
  trackingNumber: string;
  failureReason: string;
  shippingCost: number;
  orderValue: number;
  profitImpact: number;
  customerImpact: string;
}

/**
 * Reconciles COD (Cash on Delivery) collections
 */
export async function reconcileCOD(
  startDate: Date,
  endDate: Date
): Promise<CODReconciliation[]> {
  try {
    console.log(`[COD Reconciliation] Starting for ${startDate} to ${endDate}`);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Query orders with COD payment method
    // const codOrders = await db.query.orders.findMany({
    //   where: and(
    //     eq(orders.paymentMethod, 'cod'),
    //     gte(orders.orderDate, startDate),
    //     lte(orders.orderDate, endDate)
    //   ),
    // });

    const reconciliations: CODReconciliation[] = [];

    // For each COD order, check if amount was collected
    // const codOrders = []; // Placeholder
    // for (const order of codOrders) {
    //   const collected = await getCODCollection(order.id);
    //   const reconciliation: CODReconciliation = {
    //     orderId: order.id,
    //     expectedAmount: parseFloat(order.totalRevenue as any) || 0,
    //     collectedAmount: collected?.amount || 0,
    //     difference: (parseFloat(order.totalRevenue as any) || 0) - (collected?.amount || 0),
    //     status: collected ? 'reconciled' : 'pending',
    //     reconciliationDate: collected?.date,
    //   };
    //   reconciliations.push(reconciliation);
    // }

    console.log(`[COD Reconciliation] Reconciled ${reconciliations.length} COD orders`);
    return reconciliations;
  } catch (error) {
    console.error('[COD Reconciliation] Error:', error);
    throw error;
  }
}

/**
 * Analyzes delivery performance
 */
export async function analyzeDeliveryPerformance(
  startDate: Date,
  endDate: Date,
  expectedDeliveryDays: number = 5
): Promise<DeliveryAnalysis[]> {
  try {
    console.log(`[Delivery Analysis] Starting for ${startDate} to ${endDate}`);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Query fulfillments with delivery dates
    // const fulfillments = await db.query.fulfillments.findMany({
    //   where: and(
    //     gte(fulfillments.createdAt, startDate),
    //     lte(fulfillments.createdAt, endDate),
    //     isNotNull(fulfillments.deliveryDate)
    //   ),
    // });

    const analysis: DeliveryAnalysis[] = [];

    // For each fulfillment, calculate delivery time
    // for (const fulfillment of fulfillments) {
    //   const order = await getOrder(fulfillment.orderId);
    //   if (!order) continue;

    //   const deliveryDays = Math.floor(
    //     (fulfillment.deliveryDate.getTime() - order.orderDate.getTime()) /
    //       (1000 * 60 * 60 * 24)
    //   );

    //   const status =
    //     deliveryDays <= expectedDeliveryDays
    //       ? 'on_time'
    //       : 'delayed';

    //   analysis.push({
    //     orderId: fulfillment.orderId,
    //     orderDate: order.orderDate,
    //     deliveryDate: fulfillment.deliveryDate,
    //     deliveryDays,
    //     carrier: fulfillment.carrier || 'unknown',
    //     trackingNumber: fulfillment.trackingNumber || 'unknown',
    //     status,
    //     delayDays: status === 'delayed' ? deliveryDays - expectedDeliveryDays : undefined,
    //   });
    // }

    console.log(`[Delivery Analysis] Analyzed ${analysis.length} deliveries`);
    return analysis;
  } catch (error) {
    console.error('[Delivery Analysis] Error:', error);
    throw error;
  }
}

/**
 * Tracks failed shipments and their impact
 */
export async function trackFailedShipments(
  startDate: Date,
  endDate: Date
): Promise<FailedShipmentImpact[]> {
  try {
    console.log(`[Failed Shipments] Starting analysis for ${startDate} to ${endDate}`);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Query failed fulfillments
    // const failedFulfillments = await db.query.fulfillments.findMany({
    //   where: and(
    //     eq(fulfillments.status, 'failed'),
    //     gte(fulfillments.createdAt, startDate),
    //     lte(fulfillments.createdAt, endDate)
    //   ),
    // });

    const impacts: FailedShipmentImpact[] = [];

    // For each failed shipment, calculate impact
    // for (const fulfillment of failedFulfillments) {
    //   const order = await getOrder(fulfillment.orderId);
    //   const profitability = await getOrderProfitability(fulfillment.orderId);

    //   if (!order || !profitability) continue;

    //   const shippingCost = parseFloat(order.shippingCost as any) || 0;
    //   const orderValue = parseFloat(order.totalRevenue as any) || 0;
    //   const profit = parseFloat(profitability.netProfit as any) || 0;

    //   impacts.push({
    //     orderId: fulfillment.orderId,
    //     trackingNumber: fulfillment.trackingNumber || 'unknown',
    //     failureReason: fulfillment.failureReason || 'unknown',
    //     shippingCost,
    //     orderValue,
    //     profitImpact: profit - shippingCost, // Lost profit due to shipping cost
    //     customerImpact: 'Failed delivery - customer satisfaction impact',
    //   });
    // }

    // Publish critical events for failed shipments
    for (const impact of impacts) {
      if (impact.profitImpact < 0) {
        await publishEvent({
          eventType: 'failed_delivery',
          severity: 'critical',
          title: 'Failed Shipment - Profit Impact',
          description: `Order #${impact.orderId} failed delivery: ${impact.failureReason}`,
          relatedOrderId: impact.orderId,
          metadata: {
            trackingNumber: impact.trackingNumber,
            failureReason: impact.failureReason,
            shippingCost: impact.shippingCost,
            profitImpact: impact.profitImpact,
          },
        });
      }
    }

    console.log(`[Failed Shipments] Tracked ${impacts.length} failed shipments`);
    return impacts;
  } catch (error) {
    console.error('[Failed Shipments] Error:', error);
    throw error;
  }
}

/**
 * Calculates shipping metrics
 */
export async function calculateShippingMetrics(
  startDate: Date,
  endDate: Date
): Promise<ShippingMetrics> {
  try {
    console.log(`[Shipping Metrics] Calculating for ${startDate} to ${endDate}`);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Query all shipments in date range
    // const shipments = await db.query.fulfillments.findMany({
    //   where: and(
    //     gte(fulfillments.createdAt, startDate),
    //     lte(fulfillments.createdAt, endDate)
    //   ),
    // });

    const shipments: any[] = []; // Placeholder

    const deliveredCount = shipments.filter(s => s.status === 'delivered').length;
    const failedCount = shipments.filter(s => s.status === 'failed').length;
    const returnedCount = shipments.filter(s => s.status === 'returned').length;

    const totalShippingCost = shipments.reduce((sum, s) => sum + (s.shippingCost || 0), 0);
    const totalCODAmount = shipments.reduce((sum, s) => sum + (s.codAmount || 0), 0);
    const totalCODCollected = shipments.reduce((sum, s) => sum + (s.codCollected || 0), 0);

    // Calculate average delivery time
    let totalDeliveryDays = 0;
    let deliveredShipments = 0;

    for (const shipment of shipments) {
      if (shipment.status === 'delivered' && shipment.deliveryDate) {
        const days = Math.floor(
          (shipment.deliveryDate.getTime() - shipment.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        totalDeliveryDays += days;
        deliveredShipments++;
      }
    }

    const averageDeliveryTime = deliveredShipments > 0 ? totalDeliveryDays / deliveredShipments : 0;
    const deliverySuccessRate =
      shipments.length > 0 ? (deliveredCount / shipments.length) * 100 : 0;
    const codCollectionRate = totalCODAmount > 0 ? (totalCODCollected / totalCODAmount) * 100 : 0;

    const failedShipmentCost = shipments
      .filter(s => s.status === 'failed')
      .reduce((sum, s) => sum + (s.shippingCost || 0), 0);

    const averageShippingCostPerOrder =
      shipments.length > 0 ? totalShippingCost / shipments.length : 0;

    return {
      totalShipments: shipments.length,
      deliveredCount,
      failedCount,
      returnedCount,
      averageDeliveryTime,
      deliverySuccessRate,
      totalShippingCost,
      totalCODAmount,
      totalCODCollected,
      codCollectionRate,
      failedShipmentCost,
      averageShippingCostPerOrder,
    };
  } catch (error) {
    console.error('[Shipping Metrics] Error:', error);
    throw error;
  }
}

/**
 * Analyzes shipping profitability impact
 */
export async function analyzeShippingProfitability(
  startDate: Date,
  endDate: Date
): Promise<{
  totalShippingCost: number;
  shippingCostPercentageOfRevenue: number;
  profitImpactFromShipping: number;
  averageShippingMargin: number;
}> {
  try {
    console.log(`[Shipping Profitability] Analyzing for ${startDate} to ${endDate}`);

    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Query all orders in date range
    // const orders = await db.query.orders.findMany({
    //   where: and(
    //     gte(orders.orderDate, startDate),
    //     lte(orders.orderDate, endDate)
    //   ),
    // });

    const orders: any[] = []; // Placeholder

    const totalShippingCost = orders.reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalRevenue || 0), 0);
    const shippingCostPercentageOfRevenue =
      totalRevenue > 0 ? (totalShippingCost / totalRevenue) * 100 : 0;

    // Calculate profit impact (shipping cost as negative impact)
    let totalProfit = 0;
    for (const order of orders) {
      const profitability = await getOrderProfitability(order.id);
      if (profitability) {
        totalProfit += parseFloat(profitability.netProfit as any) || 0;
      }
    }

    const profitImpactFromShipping = totalProfit - totalShippingCost;
    const averageShippingMargin =
      orders.length > 0 ? (totalShippingCost / orders.length) * -1 : 0;

    return {
      totalShippingCost,
      shippingCostPercentageOfRevenue,
      profitImpactFromShipping,
      averageShippingMargin,
    };
  } catch (error) {
    console.error('[Shipping Profitability] Error:', error);
    throw error;
  }
}

/**
 * Placeholder for getOrderProfitability - should be imported from queries
 */
async function getOrderProfitability(orderId: number): Promise<any> {
  // Implement based on your queries module
  return null;
}
