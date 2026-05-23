import {
  createBusinessEvent,
  getUnprocessedEvents,
  markEventProcessed,
  createOwnerNotification,
} from "./queries";
import { InsertBusinessEvent } from "../drizzle/schema";

/**
 * Event-Driven System for ERP
 * Handles business events and triggers automated notifications
 */

export type BusinessEventType =
  | 'order_created'
  | 'order_delivered'
  | 'order_refunded'
  | 'refund_processed'
  | 'ad_spend_synced'
  | 'inventory_updated'
  | 'low_inventory_alert'
  | 'negative_cashflow_alert'
  | 'high_cost_order'
  | 'failed_delivery'
  | 'daily_financial_summary'
  | 'losing_campaign_detected'
  | 'abnormal_expense_detected'
  | 'stock_shortage_predicted';

export interface BusinessEventPayload {
  eventType: BusinessEventType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  relatedOrderId?: number;
  relatedProductId?: number;
  metadata?: Record<string, any>;
}

/**
 * Publishes a business event
 */
export async function publishEvent(payload: BusinessEventPayload): Promise<number> {
  const eventData: InsertBusinessEvent = {
    eventType: payload.eventType,
    severity: payload.severity,
    title: payload.title,
    description: payload.description,
    relatedOrderId: payload.relatedOrderId,
    relatedProductId: payload.relatedProductId,
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : undefined,
    processed: false,
  };

  return await createBusinessEvent(eventData);
}

/**
 * Processes all unprocessed events and creates notifications
 */
export async function processEvents(): Promise<void> {
  const events = await getUnprocessedEvents();

  for (const event of events) {
    try {
      // Create notification based on event type
      const notification = createNotificationFromEvent(event);

      if (notification) {
        await createOwnerNotification({
          eventId: event.id,
          title: notification.title,
          content: notification.content,
          notificationType: notification.type,
          status: 'pending',
        });
      }

      // Mark event as processed
      await markEventProcessed(event.id);
    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);
    }
  }
}

/**
 * Creates a notification from a business event
 */
function createNotificationFromEvent(
  event: any
): { title: string; content: string; type: string } | null {
  switch (event.eventType) {
    case 'order_created':
      return {
        title: 'New Order Received',
        content: `Order #${event.relatedOrderId} has been created. Check dashboard for details.`,
        type: 'order',
      };

    case 'order_delivered':
      return {
        title: 'Order Delivered',
        content: `Order #${event.relatedOrderId} has been delivered successfully.`,
        type: 'order',
      };

    case 'order_refunded':
      return {
        title: 'Order Refunded',
        content: `Order #${event.relatedOrderId} has been refunded. Review financial impact.`,
        type: 'order',
      };

    case 'low_inventory_alert':
      const metadata = event.metadata ? JSON.parse(event.metadata) : {};
      return {
        title: 'Low Inventory Alert',
        content: `Product #${event.relatedProductId} inventory is low (${metadata.currentStock} units). Consider reordering.`,
        type: 'inventory',
      };

    case 'negative_cashflow_alert':
      return {
        title: 'Negative Cashflow Alert',
        content: 'Your business is experiencing negative cashflow. Review expenses and collections immediately.',
        type: 'cashflow',
      };

    case 'high_cost_order':
      return {
        title: 'High-Cost Order Detected',
        content: `Order #${event.relatedOrderId} has unusually high costs. Review for potential issues.`,
        type: 'order',
      };

    case 'failed_delivery':
      return {
        title: 'Delivery Failed',
        content: `Order #${event.relatedOrderId} delivery has failed. Contact customer and shipping provider.`,
        type: 'order',
      };

    case 'losing_campaign_detected':
      const campaignMeta = event.metadata ? JSON.parse(event.metadata) : {};
      return {
        title: 'Losing Campaign Detected',
        content: `Campaign "${campaignMeta.campaignName}" is operating at a loss (ROAS: ${campaignMeta.roas}). Consider pausing or optimizing.`,
        type: 'marketing',
      };

    case 'abnormal_expense_detected':
      const expenseMeta = event.metadata ? JSON.parse(event.metadata) : {};
      return {
        title: 'Abnormal Expense Detected',
        content: `An unusual expense of ${expenseMeta.amount} has been detected. Review for potential fraud or errors.`,
        type: 'financial',
      };

    case 'stock_shortage_predicted':
      const stockMeta = event.metadata ? JSON.parse(event.metadata) : {};
      return {
        title: 'Stock Shortage Predicted',
        content: `Product #${event.relatedProductId} is predicted to run out of stock in ${stockMeta.daysUntilStockout} days.`,
        type: 'inventory',
      };

    case 'daily_financial_summary':
      return {
        title: 'Daily Financial Summary',
        content: 'Your daily financial summary is ready. Check the dashboard for details.',
        type: 'financial',
      };

    default:
      return {
        title: event.title,
        content: event.description,
        type: 'general',
      };
  }
}

/**
 * Event handlers for specific business operations
 */

export async function onOrderCreated(
  orderId: number,
  revenue: number,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'order_created',
    severity: 'info',
    title: 'Order Created',
    description: `New order created with revenue of ${revenue}`,
    relatedOrderId: orderId,
    metadata,
  });
}

export async function onOrderDelivered(orderId: number, metadata?: Record<string, any>): Promise<void> {
  await publishEvent({
    eventType: 'order_delivered',
    severity: 'info',
    title: 'Order Delivered',
    description: `Order has been delivered to customer`,
    relatedOrderId: orderId,
    metadata,
  });
}

export async function onLowInventoryAlert(
  productId: number,
  currentStock: number,
  threshold: number,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'low_inventory_alert',
    severity: 'warning',
    title: 'Low Inventory Alert',
    description: `Product inventory is below threshold (${currentStock} < ${threshold})`,
    relatedProductId: productId,
    metadata: { ...metadata, currentStock, threshold },
  });
}

export async function onNegativeCashflowAlert(
  cashflowBalance: number,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'negative_cashflow_alert',
    severity: 'critical',
    title: 'Negative Cashflow Alert',
    description: `Business cashflow has turned negative: ${cashflowBalance}`,
    metadata: { ...metadata, cashflowBalance },
  });
}

export async function onHighCostOrder(
  orderId: number,
  totalCost: number,
  revenue: number,
  metadata?: Record<string, any>
): Promise<void> {
  const costRatio = totalCost / revenue;
  await publishEvent({
    eventType: 'high_cost_order',
    severity: 'warning',
    title: 'High-Cost Order Detected',
    description: `Order cost ratio is high (${(costRatio * 100).toFixed(2)}%)`,
    relatedOrderId: orderId,
    metadata: { ...metadata, totalCost, revenue, costRatio },
  });
}

export async function onFailedDelivery(
  orderId: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'failed_delivery',
    severity: 'critical',
    title: 'Delivery Failed',
    description: `Order delivery failed: ${reason}`,
    relatedOrderId: orderId,
    metadata: { ...metadata, reason },
  });
}

export async function onLosingCampaignDetected(
  campaignId: number,
  campaignName: string,
  roas: number,
  spend: number,
  revenue: number,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'losing_campaign_detected',
    severity: 'warning',
    title: 'Losing Campaign Detected',
    description: `Campaign "${campaignName}" is operating at a loss (ROAS: ${roas})`,
    metadata: { ...metadata, campaignId, campaignName, roas, spend, revenue },
  });
}

export async function onAbnormalExpenseDetected(
  amount: number,
  category: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'abnormal_expense_detected',
    severity: 'warning',
    title: 'Abnormal Expense Detected',
    description: `Unusual expense detected in ${category}: ${reason}`,
    metadata: { ...metadata, amount, category, reason },
  });
}

export async function onStockShortagePredictor(
  productId: number,
  daysUntilStockout: number,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'stock_shortage_predicted',
    severity: 'warning',
    title: 'Stock Shortage Predicted',
    description: `Product will run out of stock in approximately ${daysUntilStockout} days`,
    relatedProductId: productId,
    metadata: { ...metadata, daysUntilStockout },
  });
}

export async function onDailyFinancialSummary(
  summaryData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await publishEvent({
    eventType: 'daily_financial_summary',
    severity: 'info',
    title: 'Daily Financial Summary',
    description: 'Daily financial summary generated',
    metadata: { ...metadata, ...summaryData },
  });
}
