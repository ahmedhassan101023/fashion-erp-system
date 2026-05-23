import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  products, productCosts, productPricing, orders, orderLineItems, orderProfitability,
  chartOfAccounts, journalEntries, journalLines, cashflowTransactions,
  shopifyIntegration, metaAdsIntegration, metaCampaigns, businessEvents, ownerNotifications,
  InsertProduct, InsertProductCost, InsertOrder, InsertOrderLineItem, InsertOrderProfitability,
  InsertJournalEntry, InsertJournalLine, InsertCashflowTransaction, InsertBusinessEvent,
  Product, Order, OrderProfitability, MetaCampaign
} from "../drizzle/schema";

// ============ PRODUCT QUERIES ============

export async function createProduct(data: InsertProduct): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(products).values(data);
  const productId = result[0].insertId;
  
  const created = await db.select().from(products).where(eq(products.id, Number(productId))).limit(1);
  if (!created.length) throw new Error("Failed to create product");
  
  return created[0];
}

export async function getProductBySku(sku: string): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLatestProductCost(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(productCosts)
    .where(eq(productCosts.productId, productId))
    .orderBy(desc(productCosts.effectiveDate))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getLatestProductPricing(productId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(productPricing)
    .where(eq(productPricing.productId, productId))
    .orderBy(desc(productPricing.effectiveDate))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

// ============ ORDER QUERIES ============

export async function createOrder(data: InsertOrder): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(orders).values(data);
  const orderId = result[0].insertId;
  
  const created = await db.select().from(orders).where(eq(orders.id, Number(orderId))).limit(1);
  if (!created.length) throw new Error("Failed to create order");
  
  return created[0];
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrderByShopifyId(shopifyOrderId: string): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(orders).where(eq(orders.shopifyOrderId, shopifyOrderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrdersByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(orders)
    .where(and(gte(orders.orderDate, startDate), lte(orders.orderDate, endDate)))
    .orderBy(desc(orders.orderDate));
}

export async function addOrderLineItem(data: InsertOrderLineItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(orderLineItems).values(data);
  return result;
}

export async function getOrderLineItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, orderId));
}

// ============ ORDER PROFITABILITY QUERIES ============

export async function createOrderProfitability(data: InsertOrderProfitability): Promise<OrderProfitability> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(orderProfitability).values(data);
  const profitId = result[0].insertId;
  
  const created = await db.select().from(orderProfitability).where(eq(orderProfitability.id, Number(profitId))).limit(1);
  if (!created.length) throw new Error("Failed to create order profitability");
  
  return created[0];
}

export async function getOrderProfitability(orderId: number): Promise<OrderProfitability | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(orderProfitability).where(eq(orderProfitability.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProfitableOrders(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(orderProfitability)
    .innerJoin(orders, eq(orderProfitability.orderId, orders.id))
    .where(and(
      eq(orderProfitability.profitabilityStatus, 'profitable'),
      gte(orders.orderDate, startDate),
      lte(orders.orderDate, endDate)
    ))
    .orderBy(desc(orders.orderDate));
}

// ============ FINANCIAL QUERIES ============

export async function createJournalEntry(data: InsertJournalEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(journalEntries).values(data);
  return result[0].insertId;
}

export async function addJournalLine(data: InsertJournalLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(journalLines).values(data);
}

export async function getChartOfAccounts() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.status, 'active'));
}

export async function getAccountByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ CASHFLOW QUERIES ============

export async function createCashflowTransaction(data: InsertCashflowTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(cashflowTransactions).values(data);
}

export async function getCashflowByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(cashflowTransactions)
    .where(and(
      gte(cashflowTransactions.transactionDate, startDate),
      lte(cashflowTransactions.transactionDate, endDate)
    ))
    .orderBy(desc(cashflowTransactions.transactionDate));
}

export async function calculateCashPosition(asOfDate: Date) {
  const db = await getDb();
  if (!db) return { incoming: 0, outgoing: 0, balance: 0 };
  
  const transactions = await db
    .select()
    .from(cashflowTransactions)
    .where(and(
      lte(cashflowTransactions.transactionDate, asOfDate),
      eq(cashflowTransactions.status, 'completed')
    ));
  
  let incoming = 0;
  let outgoing = 0;
  
  transactions.forEach(tx => {
    const amount = parseFloat(tx.amount as any);
    if (tx.transactionType === 'incoming') {
      incoming += amount;
    } else {
      outgoing += amount;
    }
  });
  
  return {
    incoming,
    outgoing,
    balance: incoming - outgoing
  };
}

// ============ SHOPIFY INTEGRATION QUERIES ============

export async function getShopifyIntegration() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(shopifyIntegration).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateShopifyIntegration(id: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(shopifyIntegration).set(data).where(eq(shopifyIntegration.id, id));
}

// ============ META ADS INTEGRATION QUERIES ============

export async function getMetaAdsIntegration() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(metaAdsIntegration).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMetaCampaigns(startDate?: Date, endDate?: Date): Promise<MetaCampaign[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (startDate && endDate) {
    return await db
      .select()
      .from(metaCampaigns)
      .where(and(
        gte(metaCampaigns.startDate, startDate),
        lte(metaCampaigns.endDate, endDate)
      ))
      .orderBy(desc(metaCampaigns.startDate));
  }
  
  return await db
    .select()
    .from(metaCampaigns)
    .orderBy(desc(metaCampaigns.startDate));
}

export async function getMetaCampaignById(id: number): Promise<MetaCampaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(metaCampaigns).where(eq(metaCampaigns.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ BUSINESS EVENTS & NOTIFICATIONS ============

export async function createBusinessEvent(data: InsertBusinessEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(businessEvents).values(data);
  return result[0].insertId;
}

export async function getUnprocessedEvents() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(businessEvents)
    .where(eq(businessEvents.processed, false))
    .orderBy(desc(businessEvents.createdAt));
}

export async function markEventProcessed(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(businessEvents).set({ processed: true }).where(eq(businessEvents.id, eventId));
}

export async function createOwnerNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(ownerNotifications).values(data);
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(ownerNotifications)
    .where(eq(ownerNotifications.status, 'pending'))
    .orderBy(desc(ownerNotifications.createdAt));
}
