import { publishEvent } from './events';

/**
 * Event Reliability Layer
 * Provides: retries, async queues, failure tracking, replay capability, event audit history
 */

export interface ReliableEvent {
  id: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
  nextRetryAt?: Date;
  metadata?: Record<string, any>;
}

export interface EventAuditLog {
  id: string;
  eventId: string;
  eventType: string;
  action: 'created' | 'processing' | 'completed' | 'failed' | 'retried' | 'moved_to_dlq';
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// In-memory event queue (in production, use Redis, RabbitMQ, or Bull)
const eventQueue: Map<string, ReliableEvent> = new Map();
const eventAuditLog: EventAuditLog[] = [];
const deadLetterQueue: ReliableEvent[] = [];

/**
 * Enqueues an event for reliable processing
 */
export async function enqueueEvent(
  eventType: string,
  payload: any,
  options: { maxRetries?: number; metadata?: Record<string, any> } = {}
): Promise<string> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const maxRetries = options.maxRetries || 3;

  const event: ReliableEvent = {
    id: eventId,
    eventType,
    payload,
    status: 'pending',
    retryCount: 0,
    maxRetries,
    createdAt: new Date(),
    metadata: options.metadata,
  };

  eventQueue.set(eventId, event);

  // Log to audit trail
  logEventAudit(eventId, eventType, 'created', `Event enqueued for processing`, options.metadata);

  console.log(`[Event Queue] Enqueued event: ${eventId} (${eventType})`);
  return eventId;
}

/**
 * Processes an event with retry logic
 */
export async function processEventWithRetry(eventId: string): Promise<boolean> {
  const event = eventQueue.get(eventId);
  if (!event) {
    console.error(`[Event Processing] Event not found: ${eventId}`);
    return false;
  }

  try {
    event.status = 'processing';
    logEventAudit(eventId, event.eventType, 'processing', 'Processing event');

    // Execute the event processing logic
    await executeEvent(event);

    event.status = 'completed';
    event.processedAt = new Date();
    logEventAudit(eventId, event.eventType, 'completed', 'Event processed successfully');

    console.log(`[Event Processing] Successfully processed: ${eventId}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    event.lastError = errorMessage;
    event.retryCount++;

    console.error(
      `[Event Processing] Error processing ${eventId} (attempt ${event.retryCount}/${event.maxRetries}):`,
      error
    );

    if (event.retryCount >= event.maxRetries) {
      event.status = 'dead_letter';
      event.processedAt = new Date();
      deadLetterQueue.push(event);
      logEventAudit(
        eventId,
        event.eventType,
        'moved_to_dlq',
        `Event moved to DLQ after ${event.retryCount} failed attempts`,
        { error: errorMessage }
      );

      console.error(`[Event Processing] Event moved to DLQ: ${eventId}`);
      return false;
    }

    // Schedule retry with exponential backoff
    const backoffMs = Math.pow(2, event.retryCount - 1) * 1000;
    event.status = 'pending';
    event.nextRetryAt = new Date(Date.now() + backoffMs);
    logEventAudit(
      eventId,
      event.eventType,
      'retried',
      `Scheduled retry in ${backoffMs}ms`,
      { retryCount: event.retryCount, nextRetryAt: event.nextRetryAt }
    );

    console.log(`[Event Processing] Scheduled retry for ${eventId} in ${backoffMs}ms`);
    return false;
  }
}

/**
 * Executes the actual event processing logic
 */
async function executeEvent(event: ReliableEvent): Promise<void> {
  // Route to appropriate handler based on event type
  switch (event.eventType) {
    case 'order_created':
      await handleOrderCreated(event.payload);
      break;
    case 'order_refunded':
      await handleOrderRefunded(event.payload);
      break;
    case 'order_delivered':
      await handleOrderDelivered(event.payload);
      break;
    case 'inventory_updated':
      await handleInventoryUpdated(event.payload);
      break;
    case 'losing_campaign_detected':
      await handleLosingCampaign(event.payload);
      break;
    case 'low_inventory_alert':
      await handleLowInventory(event.payload);
      break;
    case 'negative_cashflow_alert':
      await handleNegativeCashflow(event.payload);
      break;
    case 'failed_delivery':
      await handleFailedDelivery(event.payload);
      break;
    default:
      console.warn(`[Event Execution] Unknown event type: ${event.eventType}`);
  }
}

/**
 * Event handlers
 */

async function handleOrderCreated(payload: any): Promise<void> {
  console.log('[Event Handler] Processing order created:', payload);
  // Implement order creation logic
}

async function handleOrderRefunded(payload: any): Promise<void> {
  console.log('[Event Handler] Processing order refunded:', payload);
  // Implement refund logic
}

async function handleOrderDelivered(payload: any): Promise<void> {
  console.log('[Event Handler] Processing order delivered:', payload);
  // Implement delivery logic
}

async function handleInventoryUpdated(payload: any): Promise<void> {
  console.log('[Event Handler] Processing inventory updated:', payload);
  // Implement inventory logic
}

async function handleLosingCampaign(payload: any): Promise<void> {
  console.log('[Event Handler] Processing losing campaign:', payload);
  // Implement campaign analysis logic
}

async function handleLowInventory(payload: any): Promise<void> {
  console.log('[Event Handler] Processing low inventory alert:', payload);
  // Implement inventory alert logic
}

async function handleNegativeCashflow(payload: any): Promise<void> {
  console.log('[Event Handler] Processing negative cashflow alert:', payload);
  // Implement cashflow alert logic
}

async function handleFailedDelivery(payload: any): Promise<void> {
  console.log('[Event Handler] Processing failed delivery:', payload);
  // Implement failed delivery logic
}

/**
 * Logs event to audit trail
 */
function logEventAudit(
  eventId: string,
  eventType: string,
  action: EventAuditLog['action'],
  details: string,
  metadata?: Record<string, any>
): void {
  const auditEntry: EventAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventId,
    eventType,
    action,
    details,
    timestamp: new Date(),
    metadata,
  };

  eventAuditLog.push(auditEntry);
  console.log(`[Event Audit] ${action.toUpperCase()}: ${eventId} - ${details}`);
}

/**
 * Processes pending events from queue
 * Should be called periodically (e.g., every 5 seconds)
 */
export async function processPendingEvents(): Promise<number> {
  let processedCount = 0;

  const entries = Array.from(eventQueue.entries());
  for (const [eventId, event] of entries) {
    if (event.status === 'pending') {
      // Check if it's time to retry
      if (event.nextRetryAt && event.nextRetryAt > new Date()) {
        continue; // Not ready for retry yet
      }

      const success = await processEventWithRetry(eventId);
      if (success) {
        processedCount++;
      }
    }
  }

  return processedCount;
}

/**
 * Gets event status
 */
export function getEventStatus(eventId: string): ReliableEvent | undefined {
  return eventQueue.get(eventId);
}

/**
 * Gets dead-letter queue events
 */
export function getDeadLetterQueueEvents(): ReliableEvent[] {
  return [...deadLetterQueue];
}

/**
 * Replays an event from dead-letter queue
 */
export async function replayEventFromDLQ(eventId: string): Promise<boolean> {
  const event = deadLetterQueue.find(e => e.id === eventId);
  if (!event) {
    console.error(`[Event Replay] Event not found in DLQ: ${eventId}`);
    return false;
  }

  console.log(`[Event Replay] Replaying event from DLQ: ${eventId}`);

  // Reset event for replay
  event.status = 'pending';
  event.retryCount = 0;
  event.lastError = undefined;
  event.nextRetryAt = undefined;

  // Remove from DLQ and add back to queue
  deadLetterQueue.splice(deadLetterQueue.indexOf(event), 1);
  eventQueue.set(eventId, event);

  logEventAudit(eventId, event.eventType, 'retried', 'Replayed from dead-letter queue');

  // Process immediately
  return await processEventWithRetry(eventId);
}

/**
 * Gets event audit history
 */
export function getEventAuditHistory(eventId?: string): EventAuditLog[] {
  if (eventId) {
    return eventAuditLog.filter(log => log.eventId === eventId);
  }
  return [...eventAuditLog];
}

/**
 * Cleans up old events (older than 30 days)
 */
export function cleanupOldEvents(daysOld: number = 30): number {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  const entries = Array.from(eventQueue.entries());
  for (const [eventId, event] of entries) {
    if (event.createdAt < cutoffDate && event.status === 'completed') {
      eventQueue.delete(eventId);
      deletedCount++;
    }
  }

  console.log(`[Event Cleanup] Deleted ${deletedCount} old events`);
  return deletedCount;
}

/**
 * Gets queue statistics
 */
export function getQueueStats(): {
  totalEvents: number;
  pendingEvents: number;
  processingEvents: number;
  completedEvents: number;
  failedEvents: number;
  deadLetterQueueSize: number;
} {
  let pending = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;

  const events = Array.from(eventQueue.values());
  for (const event of events) {
    if (event.status === 'pending') pending++;
    else if (event.status === 'processing') processing++;
    else if (event.status === 'completed') completed++;
    else if (event.status === 'failed') failed++;
  }

  return {
    totalEvents: eventQueue.size,
    pendingEvents: pending,
    processingEvents: processing,
    completedEvents: completed,
    failedEvents: failed,
    deadLetterQueueSize: deadLetterQueue.length,
  };
}

/**
 * Starts background processing of pending events
 * Should be called once at application startup
 */
export function startEventProcessor(intervalMs: number = 5000): NodeJS.Timer {
  console.log(`[Event Processor] Started with ${intervalMs}ms interval`);

  return setInterval(async () => {
    try {
      const processed = await processPendingEvents();
      if (processed > 0) {
        console.log(`[Event Processor] Processed ${processed} events`);
      }
    } catch (error) {
      console.error('[Event Processor] Error processing events:', error);
    }
  }, intervalMs);
}
