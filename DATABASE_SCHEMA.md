# Fashion ERP System - Database Schema Design

## Overview

The database schema is designed using Domain-Driven Design (DDD) principles with the following core domains:

1. **Product Domain** - Products, SKUs, costs, pricing
2. **Order Domain** - Orders, line items, fulfillment, returns
3. **Financial Domain** - Journal entries, accounts, transactions, reconciliation
4. **Integration Domain** - Shopify, Meta Ads sync metadata
5. **Team Domain** - Users, roles, permissions
6. **Notification Domain** - Events, alerts, notification history

## Core Tables

### 1. Users & Authentication
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('owner', 'accountant', 'media_buyer', 'operations', 'customer_support', 'inventory_manager') DEFAULT 'operations',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Products & Costs
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shopifyProductId VARCHAR(64) UNIQUE,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE productCosts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  fabricCost DECIMAL(12,2),
  manufacturingCost DECIMAL(12,2),
  packagingCost DECIMAL(12,2),
  shippingCost DECIMAL(12,2),
  marketingCost DECIMAL(12,2),
  influencerCost DECIMAL(12,2),
  overheadAllocation DECIMAL(12,2),
  totalCost DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(fabricCost,0) + COALESCE(manufacturingCost,0) + COALESCE(packagingCost,0) + 
    COALESCE(shippingCost,0) + COALESCE(marketingCost,0) + COALESCE(influencerCost,0) + 
    COALESCE(overheadAllocation,0)
  ),
  effectiveDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_product_date (productId, effectiveDate DESC)
);

CREATE TABLE productPricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  productId INT NOT NULL,
  sellingPrice DECIMAL(12,2) NOT NULL,
  costPrice DECIMAL(12,2) NOT NULL,
  contributionMargin DECIMAL(12,2) GENERATED ALWAYS AS (sellingPrice - costPrice),
  profitMarginPercent DECIMAL(5,2) GENERATED ALWAYS AS ((sellingPrice - costPrice) / sellingPrice * 100),
  breakEvenRoas DECIMAL(5,2) GENERATED ALWAYS AS (costPrice / (sellingPrice - costPrice)),
  effectiveDate DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_product_date (productId, effectiveDate DESC)
);
```

### 3. Orders & Fulfillment
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shopifyOrderId VARCHAR(64) UNIQUE,
  orderId VARCHAR(100) UNIQUE NOT NULL,
  customerId INT,
  orderDate DATETIME NOT NULL,
  totalRevenue DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2),
  shippingCost DECIMAL(12,2),
  taxAmount DECIMAL(12,2),
  discountAmount DECIMAL(12,2),
  gatewayFee DECIMAL(12,2),
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  fulfillmentStatus ENUM('unfulfilled', 'partially_fulfilled', 'fulfilled', 'cancelled') DEFAULT 'unfulfilled',
  paymentMethod VARCHAR(50),
  shippingAddress TEXT,
  billingAddress TEXT,
  notes TEXT,
  metaCampaignId VARCHAR(64),
  metaAdsetId VARCHAR(64),
  metaAdId VARCHAR(64),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_date (orderDate DESC),
  INDEX idx_status (status),
  INDEX idx_meta_campaign (metaCampaignId)
);

CREATE TABLE orderLineItems (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL,
  productId INT NOT NULL,
  quantity INT NOT NULL,
  unitPrice DECIMAL(12,2) NOT NULL,
  lineTotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unitPrice),
  productCost DECIMAL(12,2),
  lineProfit DECIMAL(12,2) GENERATED ALWAYS AS (lineTotal - (quantity * COALESCE(productCost, 0))),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE orderProfitability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL UNIQUE,
  revenue DECIMAL(12,2) NOT NULL,
  productCost DECIMAL(12,2),
  shippingCost DECIMAL(12,2),
  packagingCost DECIMAL(12,2),
  gatewayFee DECIMAL(12,2),
  operationalExpenseAllocation DECIMAL(12,2),
  customerAcquisitionCost DECIMAL(12,2),
  totalCost DECIMAL(12,2) GENERATED ALWAYS AS (
    COALESCE(productCost,0) + COALESCE(shippingCost,0) + COALESCE(packagingCost,0) + 
    COALESCE(gatewayFee,0) + COALESCE(operationalExpenseAllocation,0) + COALESCE(customerAcquisitionCost,0)
  ),
  netProfit DECIMAL(12,2) GENERATED ALWAYS AS (revenue - (
    COALESCE(productCost,0) + COALESCE(shippingCost,0) + COALESCE(packagingCost,0) + 
    COALESCE(gatewayFee,0) + COALESCE(operationalExpenseAllocation,0) + COALESCE(customerAcquisitionCost,0)
  )),
  profitabilityStatus ENUM('profitable', 'break_even', 'losing') DEFAULT 'break_even',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id)
);

CREATE TABLE fulfillments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL,
  shippingCompanyId INT,
  trackingNumber VARCHAR(100),
  shippingStatus ENUM('pending', 'shipped', 'in_transit', 'delivered', 'failed', 'returned') DEFAULT 'pending',
  estimatedDeliveryDate DATE,
  actualDeliveryDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id),
  INDEX idx_tracking (trackingNumber)
);

CREATE TABLE returns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL,
  returnDate DATETIME NOT NULL,
  reason VARCHAR(255),
  refundAmount DECIMAL(12,2),
  status ENUM('initiated', 'approved', 'received', 'refunded', 'rejected') DEFAULT 'initiated',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id)
);
```

### 4. Financial Accounting
```sql
CREATE TABLE chartOfAccounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountCode VARCHAR(20) UNIQUE NOT NULL,
  accountName VARCHAR(255) NOT NULL,
  accountType ENUM('asset', 'liability', 'equity', 'revenue', 'expense') NOT NULL,
  subType VARCHAR(50),
  normalBalance ENUM('debit', 'credit') NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journalEntries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entryDate DATETIME NOT NULL,
  description VARCHAR(255),
  referenceType VARCHAR(50),
  referenceId INT,
  status ENUM('draft', 'posted', 'reversed') DEFAULT 'draft',
  createdBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id),
  INDEX idx_entry_date (entryDate DESC),
  INDEX idx_reference (referenceType, referenceId)
);

CREATE TABLE journalLines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  journalEntryId INT NOT NULL,
  accountId INT NOT NULL,
  debitAmount DECIMAL(12,2),
  creditAmount DECIMAL(12,2),
  lineNumber INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journalEntryId) REFERENCES journalEntries(id),
  FOREIGN KEY (accountId) REFERENCES chartOfAccounts(id),
  INDEX idx_account (accountId)
);

CREATE TABLE generalLedger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountId INT NOT NULL,
  journalLineId INT NOT NULL,
  transactionDate DATETIME NOT NULL,
  debitAmount DECIMAL(12,2),
  creditAmount DECIMAL(12,2),
  balance DECIMAL(12,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (accountId) REFERENCES chartOfAccounts(id),
  FOREIGN KEY (journalLineId) REFERENCES journalLines(id),
  INDEX idx_account_date (accountId, transactionDate DESC)
);

CREATE TABLE reconciliation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  accountId INT NOT NULL,
  reconciliationDate DATE NOT NULL,
  bankBalance DECIMAL(12,2),
  ledgerBalance DECIMAL(12,2),
  difference DECIMAL(12,2),
  status ENUM('pending', 'reconciled', 'discrepancy') DEFAULT 'pending',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (accountId) REFERENCES chartOfAccounts(id)
);
```

### 5. Cashflow Tracking
```sql
CREATE TABLE cashflowTransactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transactionDate DATETIME NOT NULL,
  transactionType ENUM('incoming', 'outgoing') NOT NULL,
  category VARCHAR(100),
  description VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  relatedOrderId INT,
  relatedSupplierId INT,
  paymentMethod VARCHAR(50),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (transactionDate DESC),
  INDEX idx_type (transactionType),
  FOREIGN KEY (relatedOrderId) REFERENCES orders(id)
);

CREATE TABLE cashflowProjection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectionDate DATE NOT NULL,
  projectedIncoming DECIMAL(12,2),
  projectedOutgoing DECIMAL(12,2),
  projectedBalance DECIMAL(12,2),
  actualIncoming DECIMAL(12,2),
  actualOutgoing DECIMAL(12,2),
  actualBalance DECIMAL(12,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (projectionDate DESC)
);
```

### 6. Shopify Integration
```sql
CREATE TABLE shopifyIntegration (
  id INT PRIMARY KEY AUTO_INCREMENT,
  shopName VARCHAR(255) UNIQUE NOT NULL,
  accessToken VARCHAR(255),
  apiVersion VARCHAR(20),
  status ENUM('active', 'inactive', 'error') DEFAULT 'active',
  lastSyncDate DATETIME,
  syncErrorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE shopifySyncLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  syncType ENUM('orders', 'products', 'inventory', 'customers', 'fulfillment') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  itemsProcessed INT,
  itemsFailed INT,
  errorMessage TEXT,
  startTime DATETIME,
  endTime DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_type (syncType),
  INDEX idx_status (status)
);

CREATE TABLE shopifyWebhookEvents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  webhookId VARCHAR(100),
  eventType VARCHAR(100),
  resourceId VARCHAR(100),
  payload JSON,
  processed BOOLEAN DEFAULT FALSE,
  processedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_processed (processed)
);
```

### 7. Meta Ads Integration
```sql
CREATE TABLE metaAdsIntegration (
  id INT PRIMARY KEY AUTO_INCREMENT,
  businessAccountId VARCHAR(100) UNIQUE NOT NULL,
  accessToken VARCHAR(255),
  status ENUM('active', 'inactive', 'error') DEFAULT 'active',
  lastSyncDate DATETIME,
  syncErrorMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE metaCampaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metaCampaignId VARCHAR(100) UNIQUE NOT NULL,
  campaignName VARCHAR(255),
  status ENUM('active', 'paused', 'archived') DEFAULT 'active',
  budget DECIMAL(12,2),
  spend DECIMAL(12,2),
  impressions INT,
  clicks INT,
  conversions INT,
  roas DECIMAL(5,2),
  cac DECIMAL(12,2),
  cpp DECIMAL(12,2),
  ctr DECIMAL(5,2),
  cpm DECIMAL(12,2),
  startDate DATE,
  endDate DATE,
  lastSyncDate DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_date (startDate, endDate)
);

CREATE TABLE metaAdsets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metaAdsetId VARCHAR(100) UNIQUE NOT NULL,
  metaCampaignId INT NOT NULL,
  adsetName VARCHAR(255),
  status ENUM('active', 'paused', 'archived') DEFAULT 'active',
  budget DECIMAL(12,2),
  spend DECIMAL(12,2),
  impressions INT,
  clicks INT,
  conversions INT,
  roas DECIMAL(5,2),
  cac DECIMAL(12,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (metaCampaignId) REFERENCES metaCampaigns(id)
);

CREATE TABLE metaAds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metaAdId VARCHAR(100) UNIQUE NOT NULL,
  metaAdsetId INT NOT NULL,
  adName VARCHAR(255),
  status ENUM('active', 'paused', 'archived') DEFAULT 'active',
  spend DECIMAL(12,2),
  impressions INT,
  clicks INT,
  conversions INT,
  roas DECIMAL(5,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (metaAdsetId) REFERENCES metaAdsets(id)
);

CREATE TABLE metaFunnelAnalytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  metaCampaignId INT NOT NULL,
  funnelStage VARCHAR(50),
  impressions INT,
  clicks INT,
  conversions INT,
  conversionRate DECIMAL(5,2),
  costPerConversion DECIMAL(12,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (metaCampaignId) REFERENCES metaCampaigns(id)
);

CREATE TABLE metaSyncLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  syncType ENUM('campaigns', 'adsets', 'ads', 'analytics') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  itemsProcessed INT,
  itemsFailed INT,
  errorMessage TEXT,
  startTime DATETIME,
  endTime DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_type (syncType)
);
```

### 8. Notifications & Events
```sql
CREATE TABLE businessEvents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventType VARCHAR(100) NOT NULL,
  severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
  title VARCHAR(255),
  description TEXT,
  relatedOrderId INT,
  relatedProductId INT,
  metadata JSON,
  processed BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (eventType),
  INDEX idx_processed (processed)
);

CREATE TABLE ownerNotifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  eventId INT NOT NULL,
  title VARCHAR(255),
  content TEXT,
  notificationType VARCHAR(50),
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sentAt DATETIME,
  failureReason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (eventId) REFERENCES businessEvents(id),
  INDEX idx_status (status)
);
```

### 9. Audit Logging
```sql
CREATE TABLE auditLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT,
  action VARCHAR(100),
  entityType VARCHAR(50),
  entityId INT,
  oldValues JSON,
  newValues JSON,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_entity (entityType, entityId),
  INDEX idx_user (userId),
  INDEX idx_timestamp (createdAt DESC)
);

CREATE TABLE duplicateDetection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entityType VARCHAR(50),
  entityId INT,
  duplicateOf INT,
  confidence DECIMAL(5,2),
  detectedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvedAt DATETIME,
  resolutionMethod VARCHAR(100),
  INDEX idx_entity (entityType, entityId)
);
```

## Indexes Strategy

All tables include strategic indexes on:
- Primary keys (automatic)
- Foreign keys (for joins)
- Date fields (for range queries)
- Status fields (for filtering)
- Unique business identifiers (shopifyOrderId, metaCampaignId, etc.)

## Constraints & Validations

1. **Financial Integrity**: All journal entries must balance (total debits = total credits)
2. **Duplicate Prevention**: Unique constraints on external IDs (Shopify, Meta)
3. **Referential Integrity**: Foreign key constraints prevent orphaned records
4. **Audit Trail**: All financial changes logged with user and timestamp
5. **Reconciliation**: Cashflow and ledger must reconcile daily

## Migration Strategy

Migrations will be generated using Drizzle ORM and applied incrementally:
1. Core tables (users, products, orders)
2. Financial tables (journal, ledger, reconciliation)
3. Integration tables (Shopify, Meta)
4. Notification and audit tables
