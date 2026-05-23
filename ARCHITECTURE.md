# Fashion ERP System - Comprehensive Architecture Documentation

**Version:** 1.0  
**Last Updated:** May 2026  
**Author:** Manus AI  
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Database Schema & ERD](#database-schema--erd)
4. [Event-Driven Architecture](#event-driven-architecture)
5. [Integration Flows](#integration-flows)
6. [Financial Lifecycle](#financial-lifecycle)
7. [AI Intelligence Pipeline](#ai-intelligence-pipeline)
8. [Security & Compliance](#security--compliance)
9. [Performance Considerations](#performance-considerations)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

The Fashion ERP System is a comprehensive enterprise resource planning platform designed specifically for e-commerce businesses. It integrates real-time order management, financial accounting, inventory tracking, and AI-powered business intelligence into a unified system.

**Key Capabilities:**

- **Real-time Order Processing**: Shopify integration with webhook-based order sync
- **Double-Entry Accounting**: Complete financial reconciliation and audit trails
- **Product Profitability**: Per-product cost tracking and margin analysis
- **Order-Level Profitability**: Comprehensive order cost analysis with attribution
- **Meta Ads Integration**: Campaign performance tracking with ROAS and CAC calculations
- **AI Intelligence**: Anomaly detection, forecasting, and recommendation engine
- **Enterprise Reporting**: Excel, CSV exports with Arabic RTL support
- **Role-Based Access Control**: 6-tier permission system for team management

---

## Core Architecture

### System Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 19 + Tailwind 4 + TypeScript | Arabic-first RTL dashboard |
| **Backend** | Express 4 + tRPC 11 + Node.js | API layer with type safety |
| **Database** | MySQL 8 + Drizzle ORM | Transactional data store |
| **Authentication** | Manus OAuth 2.0 | User identity and session management |
| **File Storage** | AWS S3 | Persistent file storage for exports and uploads |
| **Integrations** | REST APIs | Shopify, Meta Ads, Shipping providers |
| **AI/ML** | LLM APIs | Anomaly detection, forecasting, recommendations |

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Dashboard   │  │   Reports    │  │  Team Mgmt   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└────────────────────────┬────────────────────────────────────────┘
                         │ tRPC (Type-Safe RPC)
┌────────────────────────▼────────────────────────────────────────┐
│                     Backend Layer (Express)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  tRPC Routes │  │ Event System │  │   Webhooks   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐  ┌───▼──────────┐  ┌──▼───────────┐
│  MySQL Database │  │  S3 Storage  │  │ External APIs│
│  (Transactions) │  │  (Files)     │  │ (Shopify,Meta)
└────────────────┘  └──────────────┘  └──────────────┘
```

---

## Database Schema & ERD

### Core Tables Overview

The system is organized into 8 logical domains:

#### 1. **Products & Costs Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `products` | Product master data | id, sku, name, description, retailPrice |
| `productCosts` | Cost tracking by effective date | productId, fabricCost, manufacturingCost, packagingCost, shippingCost, effectiveDate |
| `productPricing` | Historical pricing versions | productId, retailPrice, wholesalePrice, effectiveDate |

**Relationships:**
- Products → ProductCosts (1:M) - Track cost changes over time
- Products → ProductPricing (1:M) - Maintain pricing history

#### 2. **Orders & Fulfillment Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `orders` | Order master records | id, orderId, customerId, orderDate, totalRevenue, status, fulfillmentStatus |
| `orderLineItems` | Individual line items per order | id, orderId, productId, quantity, unitPrice, lineTotal |
| `orderProfitability` | Per-order cost analysis | orderId, revenue, productCost, shippingCost, gatewayFee, packagingCost, netProfit |
| `fulfillments` | Shipment tracking | orderId, trackingNumber, carrier, status, shippedDate, deliveredDate |
| `returns` | Return and refund tracking | orderId, returnDate, reason, refundAmount, status |

**Relationships:**
- Orders → OrderLineItems (1:M)
- Orders → OrderProfitability (1:1)
- Orders → Fulfillments (1:M)
- Orders → Returns (1:M)

#### 3. **Financial Accounting Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `chartOfAccounts` | Chart of accounts master | id, accountCode, accountName, accountType, balance |
| `journalEntries` | Journal entry headers | id, entryDate, description, totalDebit, totalCredit, status |
| `journalLines` | Individual journal entry lines | journalEntryId, accountId, debit, credit, description |

**Relationships:**
- JournalEntries → JournalLines (1:M)
- JournalLines → ChartOfAccounts (M:1)

#### 4. **Cashflow Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `cashflowTransactions` | All cash movements | id, transactionDate, transactionType, category, amount, description, status |

**Categories:** sales, cod_collections, refunds, supplier_payments, ad_spend, payroll, subscriptions, operational

#### 5. **Shopify Integration Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `shopifyIntegration` | Shopify store credentials | id, storeUrl, accessToken, scope, status |
| `shopifySyncLog` | Sync operation history | id, eventType, status, recordsProcessed, lastSyncDate, nextSyncDate |

#### 6. **Meta Ads Integration Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `metaAdsIntegration` | Meta Ads account credentials | id, businessAccountId, accessToken, scope, status |
| `metaCampaigns` | Campaign performance data | id, metaCampaignId, campaignName, budget, spend, impressions, clicks, roas, cac |

#### 7. **Notifications & Events Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `businessEvents` | Business event log | id, eventType, severity, title, description, relatedOrderId, relatedProductId, metadata |
| `ownerNotifications` | Owner-facing alerts | id, eventId, title, content, severity, isRead, createdAt |

**Event Types:** order_created, order_delivered, order_refunded, low_inventory_alert, negative_cashflow_alert, losing_campaign_detected, abnormal_expense_detected

#### 8. **Audit & Compliance Domain**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `auditLog` | Complete audit trail | id, userId, action, entityType, entityId, changes, timestamp |

### Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTS DOMAIN                             │
├─────────────────────────────────────────────────────────────────┤
│  products                                                         │
│  ├─ id (PK)                                                       │
│  ├─ sku (UNIQUE)                                                  │
│  ├─ name                                                          │
│  └─ retailPrice                                                   │
│      │                                                            │
│      ├─→ productCosts (1:M)                                       │
│      │   ├─ fabricCost                                            │
│      │   ├─ manufacturingCost                                     │
│      │   └─ effectiveDate                                         │
│      │                                                            │
│      └─→ productPricing (1:M)                                     │
│          └─ retailPrice (versioned)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ORDERS DOMAIN                               │
├─────────────────────────────────────────────────────────────────┤
│  orders                                                           │
│  ├─ id (PK)                                                       │
│  ├─ orderId (UNIQUE)                                              │
│  ├─ customerId (FK)                                               │
│  ├─ totalRevenue                                                  │
│  └─ status                                                        │
│      │                                                            │
│      ├─→ orderLineItems (1:M)                                     │
│      │   ├─ productId (FK)                                        │
│      │   ├─ quantity                                              │
│      │   └─ unitPrice                                             │
│      │                                                            │
│      ├─→ orderProfitability (1:1)                                 │
│      │   ├─ productCost                                           │
│      │   ├─ shippingCost                                          │
│      │   ├─ gatewayFee                                            │
│      │   └─ netProfit                                             │
│      │                                                            │
│      ├─→ fulfillments (1:M)                                       │
│      │   ├─ trackingNumber                                        │
│      │   └─ deliveredDate                                         │
│      │                                                            │
│      └─→ returns (1:M)                                            │
│          ├─ returnDate                                            │
│          └─ refundAmount                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   ACCOUNTING DOMAIN                              │
├─────────────────────────────────────────────────────────────────┤
│  journalEntries                                                   │
│  ├─ id (PK)                                                       │
│  ├─ entryDate                                                     │
│  └─ totalDebit / totalCredit                                      │
│      │                                                            │
│      └─→ journalLines (1:M)                                       │
│          ├─ accountId (FK)                                        │
│          ├─ debit                                                 │
│          └─ credit                                                │
│              │                                                    │
│              └─→ chartOfAccounts (M:1)                            │
│                  ├─ accountCode                                   │
│                  ├─ accountName                                   │
│                  └─ balance                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATIONS DOMAIN                           │
├─────────────────────────────────────────────────────────────────┤
│  shopifyIntegration              metaAdsIntegration              │
│  ├─ storeUrl                     ├─ businessAccountId            │
│  ├─ accessToken                  ├─ accessToken                  │
│  └─ status                       └─ status                       │
│      │                                │                          │
│      └─→ shopifySyncLog               └─→ metaCampaigns          │
│          ├─ eventType                     ├─ campaignName        │
│          └─ lastSyncDate                 ├─ spend               │
│                                          ├─ roas                │
│                                          └─ cac                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event-Driven Architecture

### Business Event Flow

The system uses an event-driven architecture to ensure loose coupling and real-time responsiveness:

```
┌──────────────────────────────────────────────────────────────────┐
│                     EVENT SOURCES                                 │
├──────────────────────────────────────────────────────────────────┤
│  • Shopify Webhooks (orders, fulfillments, refunds)               │
│  • Meta Ads API Sync (campaign updates, performance metrics)      │
│  • Manual Order Entry (admin operations)                          │
│  • Scheduled Jobs (daily summaries, forecasts)                    │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│              EVENT PROCESSING PIPELINE                            │
├──────────────────────────────────────────────────────────────────┤
│  1. Event Validation & Deduplication                              │
│     └─ Check for duplicate events (idempotency)                   │
│                                                                   │
│  2. Event Enrichment                                              │
│     └─ Add context, calculate derived values                      │
│                                                                   │
│  3. Business Logic Execution                                      │
│     ├─ Create/update database records                             │
│     ├─ Post journal entries (accounting)                          │
│     ├─ Calculate profitability                                    │
│     └─ Update inventory levels                                    │
│                                                                   │
│  4. Event Publishing                                              │
│     └─ Publish to downstream systems                              │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│              EVENT SUBSCRIBERS                                    │
├──────────────────────────────────────────────────────────────────┤
│  • Notification System (owner alerts)                             │
│  • Analytics Engine (dashboards, reports)                         │
│  • AI Intelligence (anomaly detection, forecasting)               │
│  • Audit System (compliance logging)                              │
│  • Webhook Retry Queue (failed event handling)                    │
└──────────────────────────────────────────────────────────────────┘
```

### Event Types & Triggers

| Event Type | Trigger | Payload | Subscribers |
|-----------|---------|---------|-------------|
| `order_created` | Shopify webhook | orderId, customerId, totalRevenue | Accounting, Notifications, Analytics |
| `order_delivered` | Fulfillment status update | orderId, trackingNumber, deliveredDate | Notifications, Analytics |
| `order_refunded` | Refund processed | orderId, refundAmount, reason | Accounting, Notifications, Analytics |
| `low_inventory_alert` | Stock below threshold | productId, currentStock, threshold | Notifications, Inventory Manager |
| `negative_cashflow_alert` | Cashflow forecast negative | projectedDate, shortage, scenario | Notifications, Owner |
| `losing_campaign_detected` | Campaign ROAS < 3.0 | campaignId, roas, spend | Notifications, Media Buyer |
| `abnormal_expense_detected` | Anomaly detected | expenseType, amount, zscore | Notifications, Accountant |
| `stock_shortage_predicted` | Forecast shows shortage | productId, daysUntilDepletion | Notifications, Operations |

---

## Integration Flows

### Shopify Order Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    SHOPIFY WEBHOOK                                │
│              (Order Created/Updated/Refunded)                     │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│            WEBHOOK SIGNATURE VALIDATION                           │
│         (HMAC-SHA256 verification)                                │
├──────────────────────────────────────────────────────────────────┤
│  ✓ Valid Signature → Continue                                     │
│  ✗ Invalid Signature → Reject & Log                               │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         IDEMPOTENCY CHECK & DEDUPLICATION                         │
│    (Check if event already processed)                             │
├──────────────────────────────────────────────────────────────────┤
│  ✓ New Event → Process                                            │
│  ✗ Duplicate → Return cached response                             │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│           PARSE & NORMALIZE ORDER DATA                            │
│    (Extract Shopify order structure)                              │
├──────────────────────────────────────────────────────────────────┤
│  • Extract line items, customer, totals                           │
│  • Map Shopify fields to ERP schema                               │
│  • Calculate derived fields (shipping, tax, fees)                 │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│           CREATE/UPDATE DATABASE RECORDS                          │
├──────────────────────────────────────────────────────────────────┤
│  1. Insert/Update orders table                                    │
│  2. Insert orderLineItems for each product                        │
│  3. Calculate & insert orderProfitability                         │
│  4. Update inventory levels                                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         POST ACCOUNTING JOURNAL ENTRIES                           │
│    (Double-entry bookkeeping)                                     │
├──────────────────────────────────────────────────────────────────┤
│  Debit:  Accounts Receivable (or Cash for COD)                    │
│  Credit: Sales Revenue                                            │
│                                                                   │
│  Debit:  Cost of Goods Sold (COGS)                                │
│  Credit: Inventory                                                │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│          PUBLISH BUSINESS EVENT                                   │
│       (order_created / order_updated)                             │
├──────────────────────────────────────────────────────────────────┤
│  • Trigger downstream subscribers                                 │
│  • Create owner notifications                                     │
│  • Update analytics dashboard                                     │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         RETURN SUCCESS RESPONSE                                   │
│    (Acknowledge webhook receipt)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Meta Ads Campaign Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              SCHEDULED SYNC JOB (Hourly)                          │
│         (Fetch campaigns from Meta Ads API)                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│        AUTHENTICATE WITH META ADS API                             │
│      (Use stored access token)                                    │
├──────────────────────────────────────────────────────────────────┤
│  • Refresh token if expired                                       │
│  • Handle rate limiting (backoff strategy)                        │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│       FETCH CAMPAIGN PERFORMANCE DATA                             │
│  (Campaigns, Ad Sets, Ads, Insights)                              │
├──────────────────────────────────────────────────────────────────┤
│  • Campaign: name, budget, status, created_time                   │
│  • Insights: spend, impressions, clicks, conversions              │
│  • Calculate: ROAS, CAC, CPM, CTR, CPC                            │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│    RECONCILE WITH SHOPIFY ORDERS                                  │
│  (Attribution: which campaign drove which order)                  │
├──────────────────────────────────────────────────────────────────┤
│  • Match UTM parameters / Pixel events to orders                  │
│  • Calculate attributed revenue per campaign                      │
│  • Compute blended ROAS = attributed revenue / spend              │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│        UPDATE DATABASE RECORDS                                    │
│    (metaCampaigns table)                                          │
├──────────────────────────────────────────────────────────────────┤
│  • Insert/Update campaign metrics                                 │
│  • Store historical snapshots                                     │
│  • Update last sync timestamp                                     │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│          DETECT ANOMALIES                                         │
│   (ROAS volatility, CAC inflation, etc.)                          │
├──────────────────────────────────────────────────────────────────┤
│  • Compare to historical baselines                                │
│  • Calculate z-scores for statistical anomalies                   │
│  • Publish alerts if thresholds exceeded                          │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         PUBLISH SYNC COMPLETION EVENT                             │
│    (Update analytics, trigger recommendations)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Financial Lifecycle

### Order-to-Accounting Flow

```
STEP 1: ORDER CREATION
├─ Shopify webhook triggers
├─ Order record created in database
└─ Line items inserted for each product

STEP 2: REVENUE RECOGNITION
├─ Journal Entry (1):
│  ├─ Debit:  Accounts Receivable (or Cash for COD)
│  └─ Credit: Sales Revenue
├─ Debit:  Cost of Goods Sold (COGS)
└─ Credit: Inventory

STEP 3: SHIPPING & FULFILLMENT
├─ Fulfillment record created
├─ Shipping cost allocated
└─ Journal Entry (2):
   ├─ Debit:  Shipping Expense
   └─ Credit: Cash / Accounts Payable

STEP 4: PAYMENT COLLECTION
├─ Payment status updated
├─ Gateway fees recorded
└─ Journal Entry (3):
   ├─ Debit:  Cash
   ├─ Credit: Accounts Receivable
   └─ Debit:  Payment Processing Fees
       └─ Credit: Cash

STEP 5: REFUND (if applicable)
├─ Return record created
├─ Refund amount processed
└─ Journal Entry (4):
   ├─ Debit:  Sales Returns & Allowances
   ├─ Credit: Accounts Receivable / Cash
   ├─ Debit:  Inventory
   └─ Credit: Cost of Goods Sold (reversal)

STEP 6: PROFITABILITY CALCULATION
├─ All costs aggregated:
│  ├─ Product cost (COGS)
│  ├─ Shipping cost
│  ├─ Gateway fees
│  ├─ Packaging cost
│  ├─ Ad spend (attributed)
│  └─ Overhead allocation
├─ Net profit calculated
└─ Profitability status determined (profitable/break-even/loss)
```

### Chart of Accounts Structure

```
1000 - ASSETS
├─ 1100 - Current Assets
│  ├─ 1110 - Cash & Cash Equivalents
│  ├─ 1120 - Accounts Receivable
│  ├─ 1130 - Inventory
│  └─ 1140 - Prepaid Expenses
├─ 1200 - Fixed Assets
│  ├─ 1210 - Equipment
│  └─ 1220 - Accumulated Depreciation

2000 - LIABILITIES
├─ 2100 - Current Liabilities
│  ├─ 2110 - Accounts Payable
│  ├─ 2120 - Accrued Expenses
│  └─ 2130 - Sales Tax Payable
└─ 2200 - Long-Term Liabilities
   └─ 2210 - Long-Term Debt

3000 - EQUITY
├─ 3100 - Owner's Capital
└─ 3200 - Retained Earnings

4000 - REVENUE
├─ 4100 - Product Sales
├─ 4110 - Sales Returns & Allowances
└─ 4120 - Shipping Revenue

5000 - COST OF GOODS SOLD
├─ 5100 - Product Cost (COGS)
├─ 5110 - Inventory Adjustments
└─ 5120 - Freight In

6000 - OPERATING EXPENSES
├─ 6100 - Advertising & Marketing
│  ├─ 6110 - Meta Ads Spend
│  └─ 6120 - Influencer Marketing
├─ 6200 - Shipping & Fulfillment
├─ 6300 - Packaging & Materials
├─ 6400 - Salaries & Wages
├─ 6500 - Utilities & Rent
├─ 6600 - Professional Services
└─ 6700 - Miscellaneous Expenses
```

---

## AI Intelligence Pipeline

### Anomaly Detection Engine

```
┌──────────────────────────────────────────────────────────────────┐
│              DATA COLLECTION PHASE                                │
├──────────────────────────────────────────────────────────────────┤
│  • Fetch historical time series data                              │
│  • Collect recent metrics (last 7-90 days)                        │
│  • Normalize values for comparison                                │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│            STATISTICAL ANALYSIS PHASE                             │
├──────────────────────────────────────────────────────────────────┤
│  For each metric:                                                 │
│  1. Calculate mean (μ) and standard deviation (σ)                 │
│  2. Compute z-score: z = (x - μ) / σ                              │
│  3. Identify outliers: |z| > 2.5 (99.4% confidence)               │
│  4. Assess trend: compare rolling averages                        │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         ANOMALY CLASSIFICATION PHASE                              │
├──────────────────────────────────────────────────────────────────┤
│  Detected Anomalies:                                              │
│  • Refund Spike: z-score > 2.5 on refund rate                     │
│  • ROAS Volatility: coefficient of variation > 40%                │
│  • CAC Inflation: week-over-week increase > 25%                   │
│  • Margin Collapse: margin decrease > 15%                         │
│  • Expense Anomaly: single expense > 3σ from mean                 │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│        ROOT CAUSE HYPOTHESIS GENERATION                           │
├──────────────────────────────────────────────────────────────────┤
│  For each anomaly, generate hypothesis:                           │
│  • Refund Spike → Quality issue? Shipping delay? Wrong item?      │
│  • ROAS Volatility → Audience fatigue? Ad fatigue? Seasonality?   │
│  • CAC Inflation → Market saturation? Increased competition?      │
│  • Margin Collapse → Cost increase? Price reduction? Mix shift?   │
└────────────────────┬─────────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│         ALERT GENERATION & PUBLISHING                             │
├──────────────────────────────────────────────────────────────────┤
│  For each anomaly with confidence > 0.75:                         │
│  • Create BusinessEvent record                                    │
│  • Generate OwnerNotification                                     │
│  • Publish to notification system                                 │
│  • Store for recommendation engine                                │
└──────────────────────────────────────────────────────────────────┘
```

### Forecasting Engines

**Inventory Forecasting:**
- Sales velocity calculation (units/day)
- Seasonal adjustment factor
- Reorder point optimization
- Days-to-depletion prediction

**Cashflow Forecasting:**
- Incoming cash: sales, COD collections, refunds
- Outgoing cash: supplier payments, payroll, ad spend
- Scenario modeling: best/realistic/worst case
- Runway calculation (days of cash remaining)

**Profitability Forecasting:**
- Trend analysis on margins
- Hidden loss detection
- LTV (Lifetime Value) tracking
- Customer cohort analysis

---

## Security & Compliance

### Authentication & Authorization

| Layer | Mechanism | Details |
|-------|-----------|---------|
| **User Auth** | Manus OAuth 2.0 | Session-based, secure cookies |
| **API Auth** | tRPC Context | User injected per request |
| **Role-Based Access** | 6-tier RBAC | Owner, Accountant, Media Buyer, Operations, Inventory Manager, Customer Support |
| **Data Access** | Row-level filtering | Users see only authorized data |

### Data Protection

- **Encryption in Transit**: HTTPS/TLS 1.3
- **Encryption at Rest**: S3 server-side encryption
- **Database**: MySQL with SSL connections
- **Secrets Management**: Environment variables, no hardcoded credentials

### Audit & Compliance

- **Audit Logging**: All financial transactions logged
- **Journal Entry Validation**: Double-entry bookkeeping enforced
- **Duplicate Prevention**: Idempotency keys on all external API calls
- **Soft Deletes**: Records marked as deleted, not removed

---

## Performance Considerations

### Database Optimization

| Optimization | Implementation | Impact |
|--------------|-----------------|--------|
| **Indexes** | Composite indexes on (orderId, orderDate), (productId, effectiveDate) | 10-100x faster queries |
| **Partitioning** | Orders partitioned by month | Faster archival, maintenance |
| **Query Optimization** | Prepared statements, connection pooling | Reduced latency |
| **Caching** | Redis for frequently accessed data | 50-100ms → 1-5ms |

### API Performance

- **tRPC Type Safety**: Compile-time validation reduces runtime errors
- **Pagination**: All list endpoints paginated (default 50 items)
- **Lazy Loading**: Related data loaded on-demand
- **Batch Operations**: Bulk inserts for high-volume imports

### Frontend Performance

- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Lazy loading, WebP format
- **State Management**: React Query caching
- **RTL Optimization**: CSS logical properties for efficient RTL rendering

---

## Deployment Architecture

### Development Environment

```
Local Machine
├─ React Dev Server (Vite) → Port 5173
├─ Express Backend → Port 3000
├─ MySQL (Docker) → Port 3306
└─ S3 Emulation (LocalStack) → Port 4566
```

### Production Environment

```
Cloud Run (Google Cloud)
├─ Single Node.js Process
├─ 1 vCPU, 512 MB RAM
├─ Auto-scaling (min 0, max 100)
├─ 180s request timeout
└─ Cold start handling

External Services
├─ MySQL (Cloud SQL)
├─ S3 (AWS S3 or GCS)
├─ Shopify API
└─ Meta Ads API
```

### Deployment Pipeline

```
1. Code Push to Repository
   ↓
2. CI/CD Pipeline (GitHub Actions)
   ├─ Run TypeScript type checking
   ├─ Run Vitest unit tests
   ├─ Build production bundle
   └─ Push Docker image
   ↓
3. Deploy to Cloud Run
   ├─ Zero-downtime deployment
   ├─ Automatic rollback on failure
   └─ Health checks enabled
   ↓
4. Post-Deployment
   ├─ Smoke tests
   ├─ Monitor logs
   └─ Alert on errors
```

---

## Conclusion

The Fashion ERP System is architected for scalability, reliability, and ease of maintenance. The event-driven design ensures loose coupling between components, while the double-entry accounting system provides financial integrity. The AI intelligence layer adds predictive capabilities, enabling proactive business decision-making.

**Key Architectural Principles:**

1. **Type Safety**: Full TypeScript throughout (frontend, backend, database)
2. **Event-Driven**: Asynchronous, loosely-coupled components
3. **Financial Integrity**: Double-entry bookkeeping, audit trails
4. **Scalability**: Horizontal scaling via Cloud Run, database optimization
5. **Security**: OAuth 2.0, role-based access, encrypted data
6. **Observability**: Comprehensive logging, monitoring, alerts

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Next Review:** August 2026
