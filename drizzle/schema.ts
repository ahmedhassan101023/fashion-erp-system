import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with ERP-specific roles and permissions.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "accountant", "media_buyer", "operations", "customer_support", "inventory_manager"]).default("operations").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("idx_role").on(table.role),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ PRODUCTS & COSTS ============

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  shopifyProductId: varchar("shopifyProductId", { length: 64 }).unique(),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  reorderPoint: int("reorderPoint").default(10).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "discontinued"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  skuIdx: index("idx_sku").on(table.sku),
  shopifyIdx: index("idx_shopify_product").on(table.shopifyProductId),
}));

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const productCosts = mysqlTable("productCosts", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  fabricCost: decimal("fabricCost", { precision: 12, scale: 2 }),
  manufacturingCost: decimal("manufacturingCost", { precision: 12, scale: 2 }),
  packagingCost: decimal("packagingCost", { precision: 12, scale: 2 }),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }),
  marketingCost: decimal("marketingCost", { precision: 12, scale: 2 }),
  influencerCost: decimal("influencerCost", { precision: 12, scale: 2 }),
  overheadAllocation: decimal("overheadAllocation", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  effectiveDate: date("effectiveDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productDateIdx: index("idx_product_cost_date").on(table.productId, table.effectiveDate),
}));

export type ProductCost = typeof productCosts.$inferSelect;
export type InsertProductCost = typeof productCosts.$inferInsert;

export const productPricing = mysqlTable("productPricing", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  sellingPrice: decimal("sellingPrice", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }).notNull(),
  contributionMargin: decimal("contributionMargin", { precision: 12, scale: 2 }),
  profitMarginPercent: decimal("profitMarginPercent", { precision: 5, scale: 2 }),
  breakEvenRoas: decimal("breakEvenRoas", { precision: 5, scale: 2 }),
  effectiveDate: date("effectiveDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  productDateIdx: index("idx_product_pricing_date").on(table.productId, table.effectiveDate),
}));

export type ProductPricing = typeof productPricing.$inferSelect;
export type InsertProductPricing = typeof productPricing.$inferInsert;

// ============ ORDERS & FULFILLMENT ============

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  shopifyOrderId: varchar("shopifyOrderId", { length: 64 }).unique(),
  orderId: varchar("orderId", { length: 100 }).unique().notNull(),
  customerId: int("customerId"),
  orderDate: timestamp("orderDate").notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }),
  gatewayFee: decimal("gatewayFee", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]).default("pending"),
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["unfulfilled", "partially_fulfilled", "fulfilled", "cancelled"]).default("unfulfilled"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  shippingAddress: text("shippingAddress"),
  billingAddress: text("billingAddress"),
  notes: text("notes"),
  metaCampaignId: varchar("metaCampaignId", { length: 64 }),
  metaAdsetId: varchar("metaAdsetId", { length: 64 }),
  metaAdId: varchar("metaAdId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderDateIdx: index("idx_order_date").on(table.orderDate),
  statusIdx: index("idx_order_status").on(table.status),
  metaCampaignIdx: index("idx_order_meta_campaign").on(table.metaCampaignId),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderLineItems = mysqlTable("orderLineItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }),
  productCost: decimal("productCost", { precision: 12, scale: 2 }),
  lineProfit: decimal("lineProfit", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  orderIdx: index("idx_order_line_items").on(table.orderId),
}));

export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = typeof orderLineItems.$inferInsert;

export const orderProfitability = mysqlTable("orderProfitability", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull(),
  productCost: decimal("productCost", { precision: 12, scale: 2 }),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }),
  packagingCost: decimal("packagingCost", { precision: 12, scale: 2 }),
  gatewayFee: decimal("gatewayFee", { precision: 12, scale: 2 }),
  operationalExpenseAllocation: decimal("operationalExpenseAllocation", { precision: 12, scale: 2 }),
  customerAcquisitionCost: decimal("customerAcquisitionCost", { precision: 12, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  netProfit: decimal("netProfit", { precision: 12, scale: 2 }),
  profitabilityStatus: mysqlEnum("profitabilityStatus", ["profitable", "break_even", "losing"]).default("break_even"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderProfitability = typeof orderProfitability.$inferSelect;
export type InsertOrderProfitability = typeof orderProfitability.$inferInsert;

export const fulfillments = mysqlTable("fulfillments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  shippingCompanyId: int("shippingCompanyId"),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  shippingStatus: mysqlEnum("shippingStatus", ["pending", "shipped", "in_transit", "delivered", "failed", "returned"]).default("pending"),
  estimatedDeliveryDate: date("estimatedDeliveryDate"),
  actualDeliveryDate: date("actualDeliveryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  trackingIdx: index("idx_tracking_number").on(table.trackingNumber),
}));

export type Fulfillment = typeof fulfillments.$inferSelect;
export type InsertFulfillment = typeof fulfillments.$inferInsert;

export const returns = mysqlTable("returns", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  returnDate: timestamp("returnDate").notNull(),
  reason: varchar("reason", { length: 255 }),
  refundAmount: decimal("refundAmount", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["initiated", "approved", "received", "refunded", "rejected"]).default("initiated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  orderIdx: index("idx_return_order").on(table.orderId),
}));

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

// ============ FINANCIAL ACCOUNTING ============

export const chartOfAccounts = mysqlTable("chartOfAccounts", {
  id: int("id").autoincrement().primaryKey(),
  accountCode: varchar("accountCode", { length: 20 }).unique().notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", ["asset", "liability", "equity", "revenue", "expense"]).notNull(),
  subType: varchar("subType", { length: 50 }),
  normalBalance: mysqlEnum("normalBalance", ["debit", "credit"]).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = typeof chartOfAccounts.$inferInsert;

export const journalEntries = mysqlTable("journalEntries", {
  id: int("id").autoincrement().primaryKey(),
  entryDate: timestamp("entryDate").notNull(),
  description: varchar("description", { length: 255 }),
  referenceType: varchar("referenceType", { length: 50 }),
  referenceId: int("referenceId"),
  status: mysqlEnum("status", ["draft", "posted", "reversed"]).default("draft"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  entryDateIdx: index("idx_entry_date").on(table.entryDate),
  referenceIdx: index("idx_reference").on(table.referenceType, table.referenceId),
}));

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

export const journalLines = mysqlTable("journalLines", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journalEntryId").notNull(),
  accountId: int("accountId").notNull(),
  debitAmount: decimal("debitAmount", { precision: 12, scale: 2 }),
  creditAmount: decimal("creditAmount", { precision: 12, scale: 2 }),
  lineNumber: int("lineNumber"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  accountIdx: index("idx_account").on(table.accountId),
}));

export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = typeof journalLines.$inferInsert;

// ============ CASHFLOW TRACKING ============

export const cashflowTransactions = mysqlTable("cashflowTransactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionDate: timestamp("transactionDate").notNull(),
  transactionType: mysqlEnum("transactionType", ["incoming", "outgoing"]).notNull(),
  category: varchar("category", { length: 100 }),
  description: varchar("description", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending"),
  relatedOrderId: int("relatedOrderId"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dateIdx: index("idx_cashflow_date").on(table.transactionDate),
  typeIdx: index("idx_cashflow_type").on(table.transactionType),
}));

export type CashflowTransaction = typeof cashflowTransactions.$inferSelect;
export type InsertCashflowTransaction = typeof cashflowTransactions.$inferInsert;

// ============ SHOPIFY INTEGRATION ============

export const shopifyIntegration = mysqlTable("shopifyIntegration", {
  id: int("id").autoincrement().primaryKey(),
  shopName: varchar("shopName", { length: 255 }).unique().notNull(),
  accessToken: varchar("accessToken", { length: 255 }),
  apiVersion: varchar("apiVersion", { length: 20 }),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active"),
  lastSyncDate: timestamp("lastSyncDate"),
  syncErrorMessage: text("syncErrorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShopifyIntegration = typeof shopifyIntegration.$inferSelect;
export type InsertShopifyIntegration = typeof shopifyIntegration.$inferInsert;

export const shopifySyncLog = mysqlTable("shopifySyncLog", {
  id: int("id").autoincrement().primaryKey(),
  syncType: mysqlEnum("syncType", ["orders", "products", "inventory", "customers", "fulfillment"]).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending"),
  itemsProcessed: int("itemsProcessed"),
  itemsFailed: int("itemsFailed"),
  errorMessage: text("errorMessage"),
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  syncTypeIdx: index("idx_sync_type").on(table.syncType),
  statusIdx: index("idx_sync_status").on(table.status),
}));

export type ShopifySyncLog = typeof shopifySyncLog.$inferSelect;
export type InsertShopifySyncLog = typeof shopifySyncLog.$inferInsert;

// ============ META ADS INTEGRATION ============

export const metaAdsIntegration = mysqlTable("metaAdsIntegration", {
  id: int("id").autoincrement().primaryKey(),
  businessAccountId: varchar("businessAccountId", { length: 100 }).unique().notNull(),
  accessToken: varchar("accessToken", { length: 255 }),
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active"),
  lastSyncDate: timestamp("lastSyncDate"),
  syncErrorMessage: text("syncErrorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetaAdsIntegration = typeof metaAdsIntegration.$inferSelect;
export type InsertMetaAdsIntegration = typeof metaAdsIntegration.$inferInsert;

export const metaCampaigns = mysqlTable("metaCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  metaCampaignId: varchar("metaCampaignId", { length: 100 }).unique().notNull(),
  campaignName: varchar("campaignName", { length: 255 }),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  spend: decimal("spend", { precision: 12, scale: 2 }),
  impressions: int("impressions"),
  clicks: int("clicks"),
  conversions: int("conversions"),
  roas: decimal("roas", { precision: 5, scale: 2 }),
  cac: decimal("cac", { precision: 12, scale: 2 }),
  cpp: decimal("cpp", { precision: 12, scale: 2 }),
  ctr: decimal("ctr", { precision: 5, scale: 2 }),
  cpm: decimal("cpm", { precision: 12, scale: 2 }),
  startDate: date("startDate"),
  endDate: date("endDate"),
  lastSyncDate: timestamp("lastSyncDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  campaignDateIdx: index("idx_campaign_date").on(table.startDate, table.endDate),
}));

export type MetaCampaign = typeof metaCampaigns.$inferSelect;
export type InsertMetaCampaign = typeof metaCampaigns.$inferInsert;

// ============ NOTIFICATIONS & EVENTS ============

export const businessEvents = mysqlTable("businessEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info"),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  relatedOrderId: int("relatedOrderId"),
  relatedProductId: int("relatedProductId"),
  metadata: json("metadata"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("idx_event_type").on(table.eventType),
  processedIdx: index("idx_event_processed").on(table.processed),
}));

export type BusinessEvent = typeof businessEvents.$inferSelect;
export type InsertBusinessEvent = typeof businessEvents.$inferInsert;

export const ownerNotifications = mysqlTable("ownerNotifications", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  notificationType: varchar("notificationType", { length: 50 }),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending"),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("idx_notification_status").on(table.status),
}));

export type OwnerNotification = typeof ownerNotifications.$inferSelect;
export type InsertOwnerNotification = typeof ownerNotifications.$inferInsert;

// ============ AUDIT LOGGING ============

export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  oldValues: json("oldValues"),
  newValues: json("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("idx_audit_entity").on(table.entityType, table.entityId),
  userIdx: index("idx_audit_user").on(table.userId),
  timestampIdx: index("idx_audit_timestamp").on(table.createdAt),
}));

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

// ============ CUSTOMERS / CRM ============

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  shopifyCustomerId: varchar("shopifyCustomerId", { length: 64 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  totalOrders: int("totalOrders").default(0),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).default("0"),
  lastOrderDate: timestamp("lastOrderDate"),
  tags: text("tags"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index("idx_customer_email").on(table.email),
  shopifyIdx: index("idx_customer_shopify").on(table.shopifyCustomerId),
}));

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============ SUPPLIERS ============

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ============ TEAM TASKS ============

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assignedTo"),
  createdBy: int("createdBy").notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"]).default("pending"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  assignedIdx: index("idx_task_assigned").on(table.assignedTo),
  statusIdx: index("idx_task_status").on(table.status),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ============ TEAM NOTES ============

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  content: text("content").notNull(),
  createdBy: int("createdBy").notNull(),
  relatedType: varchar("relatedType", { length: 50 }),
  relatedId: int("relatedId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index("idx_note_created_by").on(table.createdBy),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ============ CAPITAL & DAILY EXPENSES ============

export const capitalEntries = mysqlTable("capitalEntries", {
  id: int("id").autoincrement().primaryKey(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: varchar("description", { length: 255 }),
  entryDate: timestamp("entryDate").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CapitalEntry = typeof capitalEntries.$inferSelect;
export type InsertCapitalEntry = typeof capitalEntries.$inferInsert;

export const dailyExpenses = mysqlTable("dailyExpenses", {
  id: int("id").autoincrement().primaryKey(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  supplierId: int("supplierId"),
  expenseDate: timestamp("expenseDate").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyExpense = typeof dailyExpenses.$inferSelect;
export type InsertDailyExpense = typeof dailyExpenses.$inferInsert;

// ============ UPLOADED FILES (S3 PERSISTENCE) ============

export const uploadedFiles = mysqlTable("uploadedFiles", {
  id: int("id").autoincrement().primaryKey(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // bytes
  uploadedBy: int("uploadedBy").notNull(),
  relatedType: varchar("relatedType", { length: 50 }), // 'supplier_invoice', 'product_image', 'receipt', etc.
  relatedId: int("relatedId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uploadedByIdx: index("idx_file_uploaded_by").on(table.uploadedBy),
  relatedIdx: index("idx_file_related").on(table.relatedType, table.relatedId),
}));

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

// ============ EXPORT HISTORY ============

export const exportHistory = mysqlTable("exportHistory", {
  id: int("id").autoincrement().primaryKey(),
  reportType: varchar("reportType", { length: 100 }).notNull(),
  format: varchar("format", { length: 10 }).notNull(), // 'excel', 'csv', 'pdf'
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  generatedBy: int("generatedBy").notNull(),
  dateRangeStart: timestamp("dateRangeStart"),
  dateRangeEnd: timestamp("dateRangeEnd"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
}, (table) => ({
  generatedByIdx: index("idx_export_generated_by").on(table.generatedBy),
  reportTypeIdx: index("idx_export_report_type").on(table.reportType),
}));

export type ExportHistoryRecord = typeof exportHistory.$inferSelect;
export type InsertExportHistory = typeof exportHistory.$inferInsert;

// ============ NOTIFICATION PREFERENCES ============

export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  lowInventory: boolean("lowInventory").default(true).notNull(),
  negativeCashflow: boolean("negativeCashflow").default(true).notNull(),
  highCostOrders: boolean("highCostOrders").default(true).notNull(),
  failedDelivery: boolean("failedDelivery").default(true).notNull(),
  dailySummary: boolean("dailySummary").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
