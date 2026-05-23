import crypto from 'crypto';
import { getDb } from '../db';
import { publishEvent } from '../events';
import {
  syncShopifyOrder,
  handleOrderFulfilledWebhook,
  handleRefundCreatedWebhook,
} from '../integrations/shopify';

/**
 * Shopify Webhook Infrastructure
 * Handles: signature validation, retry logic, idempotency, dead-letter queue, detailed logging
 */

export interface WebhookPayload {
  id: string;
  topic: string;
  timestamp: string;
  data: any;
  signature: string;
  headers: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  topic: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

// In-memory webhook event store (in production, use database)
const webhookStore: Map<string, WebhookEvent> = new Map();
const deadLetterQueue: WebhookEvent[] = [];

/**
 * Validates Shopify webhook signature
 * Uses HMAC-SHA256 with the webhook secret
 */
export function validateShopifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Generates idempotency key from webhook data
 * Prevents duplicate processing of the same event
 */
export function generateIdempotencyKey(topic: string, data: any): string {
  const key = `${topic}:${data.id}:${data.updated_at || data.created_at}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Checks if webhook has already been processed (idempotency)
 */
export function isWebhookProcessed(idempotencyKey: string): boolean {
  return webhookStore.has(idempotencyKey);
}

/**
 * Stores webhook event for idempotency tracking
 */
export function storeWebhookEvent(
  idempotencyKey: string,
  topic: string,
  payload: any
): WebhookEvent {
  const event: WebhookEvent = {
    id: idempotencyKey,
    topic,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date(),
  };

  webhookStore.set(idempotencyKey, event);
  return event;
}

/**
 * Updates webhook event status
 */
export function updateWebhookStatus(
  idempotencyKey: string,
  status: WebhookEvent['status'],
  error?: string
): void {
  const event = webhookStore.get(idempotencyKey);
  if (event) {
    event.status = status;
    if (error) event.lastError = error;
    if (status === 'completed' || status === 'dead_letter') {
      event.processedAt = new Date();
    }
    webhookStore.set(idempotencyKey, event);
  }
}

/**
 * Increments retry count for a webhook
 */
export function incrementRetryCount(idempotencyKey: string): number {
  const event = webhookStore.get(idempotencyKey);
  if (event) {
    event.retryCount++;
    webhookStore.set(idempotencyKey, event);
    return event.retryCount;
  }
  return 0;
}

/**
 * Moves webhook to dead-letter queue after max retries
 */
export function moveToDeadLetterQueue(idempotencyKey: string, error: string): void {
  const event = webhookStore.get(idempotencyKey);
  if (event) {
    event.status = 'dead_letter';
    event.lastError = error;
    event.processedAt = new Date();
    deadLetterQueue.push(event);
    
    console.error(`[DLQ] Webhook moved to dead-letter queue: ${idempotencyKey}`, {
      topic: event.topic,
      retryCount: event.retryCount,
      error,
    });

    // Publish critical event for monitoring
    publishEvent({
      eventType: 'abnormal_expense_detected',
      severity: 'critical',
      title: 'Webhook Processing Failed',
      description: `Shopify webhook ${event.topic} failed after ${event.retryCount} retries`,
      metadata: { idempotencyKey, error, topic: event.topic },
    }).catch(err => console.error('Failed to publish DLQ event:', err));
  }
}

/**
 * Processes Shopify webhook with retry logic
 */
export async function processShopifyWebhook(
  topic: string,
  payload: any,
  idempotencyKey: string,
  maxRetries: number = 3
): Promise<void> {
  try {
    // Check idempotency
    if (isWebhookProcessed(idempotencyKey)) {
      console.log(`[Idempotency] Webhook already processed: ${idempotencyKey}`);
      return;
    }

    // Store webhook event
    storeWebhookEvent(idempotencyKey, topic, payload);
    updateWebhookStatus(idempotencyKey, 'processing');

    // Route to appropriate handler
    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(payload, idempotencyKey);
        break;
      case 'orders/updated':
        await handleOrderUpdated(payload, idempotencyKey);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(payload, idempotencyKey);
        break;
      case 'refunds/create':
        await handleRefundCreate(payload, idempotencyKey);
        break;
      case 'fulfillments/create':
        await handleFulfillmentCreate(payload, idempotencyKey);
        break;
      case 'inventory_levels/update':
        await handleInventoryUpdate(payload, idempotencyKey);
        break;
      default:
        console.warn(`[Webhook] Unknown topic: ${topic}`);
    }

    updateWebhookStatus(idempotencyKey, 'completed');
    console.log(`[Webhook] Successfully processed: ${topic} (${idempotencyKey})`);
  } catch (error) {
    const retryCount = incrementRetryCount(idempotencyKey);
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[Webhook] Error processing ${topic} (attempt ${retryCount}/${maxRetries}):`, error);

    if (retryCount >= maxRetries) {
      moveToDeadLetterQueue(idempotencyKey, errorMessage);
      throw new Error(`Webhook processing failed after ${maxRetries} retries: ${errorMessage}`);
    }

    // Exponential backoff retry
    const backoffMs = Math.pow(2, retryCount - 1) * 1000;
    console.log(`[Webhook] Retrying in ${backoffMs}ms...`);
    
    // In production, use a job queue (Bull, RabbitMQ, etc.)
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    await processShopifyWebhook(topic, payload, idempotencyKey, maxRetries);
  }
}

// ============ WEBHOOK HANDLERS ============

async function handleOrderCreate(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Order Create] Processing order: ${payload.id}`);
  
  try {
    const orderId = await syncShopifyOrder(payload);
    
    await publishEvent({
      eventType: 'order_created',
      severity: 'info',
      title: 'Shopify Order Synced',
      description: `Order #${payload.name} synced from Shopify`,
      relatedOrderId: orderId,
      metadata: {
        shopifyOrderId: payload.id,
        orderId: payload.name,
        totalPrice: payload.total_price,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Order Create] Failed to sync order ${payload.id}:`, error);
    throw error;
  }
}

async function handleOrderUpdated(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Order Updated] Processing order update: ${payload.id}`);
  
  try {
    // Update order status, fulfillment status, etc.
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Map Shopify status to ERP status
    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'processing',
      partially_paid: 'processing',
      paid: 'processing',
      partially_refunded: 'refunded',
      refunded: 'refunded',
      voided: 'cancelled',
    };

    const erpStatus = statusMap[payload.financial_status] || 'pending';

    // Update order in database
    // await db.update(orders).set({ status: erpStatus }).where(eq(orders.shopifyOrderId, payload.id));

    await publishEvent({
      eventType: 'order_created', // Use appropriate event type
      severity: 'info',
      title: 'Shopify Order Updated',
      description: `Order #${payload.name} updated (status: ${erpStatus})`,
      metadata: {
        shopifyOrderId: payload.id,
        newStatus: erpStatus,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Order Updated] Failed to update order ${payload.id}:`, error);
    throw error;
  }
}

async function handleOrderCancelled(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Order Cancelled] Processing order cancellation: ${payload.id}`);
  
  try {
    // Mark order as cancelled in database
    // Update related financial entries
    
    await publishEvent({
      eventType: 'order_created', // Use appropriate event type
      severity: 'warning',
      title: 'Shopify Order Cancelled',
      description: `Order #${payload.name} cancelled`,
      metadata: {
        shopifyOrderId: payload.id,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Order Cancelled] Failed to cancel order ${payload.id}:`, error);
    throw error;
  }
}

async function handleRefundCreate(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Refund Create] Processing refund: ${payload.id}`);
  
  try {
    await handleRefundCreatedWebhook(payload);
    
    await publishEvent({
      eventType: 'order_refunded',
      severity: 'warning',
      title: 'Shopify Refund Processed',
      description: `Refund created for order #${payload.order_id}`,
      metadata: {
        shopifyRefundId: payload.id,
        shopifyOrderId: payload.order_id,
        refundAmount: payload.transactions?.[0]?.amount,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Refund Create] Failed to process refund ${payload.id}:`, error);
    throw error;
  }
}

async function handleFulfillmentCreate(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Fulfillment Create] Processing fulfillment: ${payload.id}`);
  
  try {
    await handleOrderFulfilledWebhook(payload);
    
    await publishEvent({
      eventType: 'order_delivered',
      severity: 'info',
      title: 'Shopify Fulfillment Created',
      description: `Fulfillment created for order #${payload.order_id}`,
      metadata: {
        shopifyFulfillmentId: payload.id,
        shopifyOrderId: payload.order_id,
        status: payload.status,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Fulfillment Create] Failed to process fulfillment ${payload.id}:`, error);
    throw error;
  }
}

async function handleInventoryUpdate(payload: any, idempotencyKey: string): Promise<void> {
  console.log(`[Inventory Update] Processing inventory update: ${payload.inventory_item_id}`);
  
  try {
    // Update inventory levels in database
    // Check for low stock alerts
    
    await publishEvent({
      eventType: 'inventory_updated',
      severity: 'info',
      title: 'Inventory Updated',
      description: `Inventory level updated for item ${payload.inventory_item_id}`,
      metadata: {
        inventoryItemId: payload.inventory_item_id,
        availableQuantity: payload.available,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error(`[Inventory Update] Failed to process inventory update ${payload.inventory_item_id}:`, error);
    throw error;
  }
}

/**
 * Retrieves dead-letter queue events for monitoring/replay
 */
export function getDeadLetterQueueEvents(): WebhookEvent[] {
  return [...deadLetterQueue];
}

/**
 * Replays a webhook from dead-letter queue
 */
export async function replayWebhookFromDLQ(idempotencyKey: string): Promise<void> {
  const event = deadLetterQueue.find(e => e.id === idempotencyKey);
  if (!event) {
    throw new Error(`Event not found in DLQ: ${idempotencyKey}`);
  }

  console.log(`[DLQ Replay] Replaying webhook: ${idempotencyKey}`);
  
  // Reset the event for replay
  webhookStore.delete(idempotencyKey);
  deadLetterQueue.splice(deadLetterQueue.indexOf(event), 1);

  // Reprocess
  await processShopifyWebhook(event.topic, event.payload, idempotencyKey);
}

/**
 * Gets webhook event status
 */
export function getWebhookStatus(idempotencyKey: string): WebhookEvent | undefined {
  return webhookStore.get(idempotencyKey);
}

/**
 * Cleans up old webhook events (older than 30 days)
 */
export function cleanupOldWebhooks(daysOld: number = 30): number {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for (const [key, event] of Array.from(webhookStore.entries())) {
    if (event.createdAt < cutoffDate && event.status === 'completed') {
      webhookStore.delete(key);
      deletedCount++;
    }
  }

  console.log(`[Webhook Cleanup] Deleted ${deletedCount} old webhook events`);
  return deletedCount;
}
