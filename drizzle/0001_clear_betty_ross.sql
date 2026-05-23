CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100),
	`entityType` varchar(50),
	`entityId` int,
	`oldValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`severity` enum('info','warning','critical') DEFAULT 'info',
	`title` varchar(255),
	`description` text,
	`relatedOrderId` int,
	`relatedProductId` int,
	`metadata` json,
	`processed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashflowTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`transactionType` enum('incoming','outgoing') NOT NULL,
	`category` varchar(100),
	`description` varchar(255),
	`amount` decimal(12,2) NOT NULL,
	`status` enum('pending','completed','failed') DEFAULT 'pending',
	`relatedOrderId` int,
	`paymentMethod` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cashflowTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chartOfAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountCode` varchar(20) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountType` enum('asset','liability','equity','revenue','expense') NOT NULL,
	`subType` varchar(50),
	`normalBalance` enum('debit','credit') NOT NULL,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chartOfAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `chartOfAccounts_accountCode_unique` UNIQUE(`accountCode`)
);
--> statement-breakpoint
CREATE TABLE `fulfillments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`shippingCompanyId` int,
	`trackingNumber` varchar(100),
	`shippingStatus` enum('pending','shipped','in_transit','delivered','failed','returned') DEFAULT 'pending',
	`estimatedDeliveryDate` date,
	`actualDeliveryDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fulfillments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journalEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryDate` timestamp NOT NULL,
	`description` varchar(255),
	`referenceType` varchar(50),
	`referenceId` int,
	`status` enum('draft','posted','reversed') DEFAULT 'draft',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journalEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journalLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journalEntryId` int NOT NULL,
	`accountId` int NOT NULL,
	`debitAmount` decimal(12,2),
	`creditAmount` decimal(12,2),
	`lineNumber` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journalLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metaAdsIntegration` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessAccountId` varchar(100) NOT NULL,
	`accessToken` varchar(255),
	`status` enum('active','inactive','error') DEFAULT 'active',
	`lastSyncDate` timestamp,
	`syncErrorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metaAdsIntegration_id` PRIMARY KEY(`id`),
	CONSTRAINT `metaAdsIntegration_businessAccountId_unique` UNIQUE(`businessAccountId`)
);
--> statement-breakpoint
CREATE TABLE `metaCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metaCampaignId` varchar(100) NOT NULL,
	`campaignName` varchar(255),
	`status` enum('active','paused','archived') DEFAULT 'active',
	`budget` decimal(12,2),
	`spend` decimal(12,2),
	`impressions` int,
	`clicks` int,
	`conversions` int,
	`roas` decimal(5,2),
	`cac` decimal(12,2),
	`cpp` decimal(12,2),
	`ctr` decimal(5,2),
	`cpm` decimal(12,2),
	`startDate` date,
	`endDate` date,
	`lastSyncDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `metaCampaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `metaCampaigns_metaCampaignId_unique` UNIQUE(`metaCampaignId`)
);
--> statement-breakpoint
CREATE TABLE `orderLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`lineTotal` decimal(12,2),
	`productCost` decimal(12,2),
	`lineProfit` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderProfitability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`revenue` decimal(12,2) NOT NULL,
	`productCost` decimal(12,2),
	`shippingCost` decimal(12,2),
	`packagingCost` decimal(12,2),
	`gatewayFee` decimal(12,2),
	`operationalExpenseAllocation` decimal(12,2),
	`customerAcquisitionCost` decimal(12,2),
	`totalCost` decimal(12,2),
	`netProfit` decimal(12,2),
	`profitabilityStatus` enum('profitable','break_even','losing') DEFAULT 'break_even',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orderProfitability_id` PRIMARY KEY(`id`),
	CONSTRAINT `orderProfitability_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyOrderId` varchar(64),
	`orderId` varchar(100) NOT NULL,
	`customerId` int,
	`orderDate` timestamp NOT NULL,
	`totalRevenue` decimal(12,2) NOT NULL,
	`subtotal` decimal(12,2),
	`shippingCost` decimal(12,2),
	`taxAmount` decimal(12,2),
	`discountAmount` decimal(12,2),
	`gatewayFee` decimal(12,2),
	`status` enum('pending','processing','shipped','delivered','cancelled','refunded') DEFAULT 'pending',
	`fulfillmentStatus` enum('unfulfilled','partially_fulfilled','fulfilled','cancelled') DEFAULT 'unfulfilled',
	`paymentMethod` varchar(50),
	`shippingAddress` text,
	`billingAddress` text,
	`notes` text,
	`metaCampaignId` varchar(64),
	`metaAdsetId` varchar(64),
	`metaAdId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_shopifyOrderId_unique` UNIQUE(`shopifyOrderId`),
	CONSTRAINT `orders_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `ownerNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`title` varchar(255),
	`content` text,
	`notificationType` varchar(50),
	`status` enum('pending','sent','failed') DEFAULT 'pending',
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ownerNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productCosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`fabricCost` decimal(12,2),
	`manufacturingCost` decimal(12,2),
	`packagingCost` decimal(12,2),
	`shippingCost` decimal(12,2),
	`marketingCost` decimal(12,2),
	`influencerCost` decimal(12,2),
	`overheadAllocation` decimal(12,2),
	`totalCost` decimal(12,2),
	`effectiveDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productCosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productPricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`sellingPrice` decimal(12,2) NOT NULL,
	`costPrice` decimal(12,2) NOT NULL,
	`contributionMargin` decimal(12,2),
	`profitMarginPercent` decimal(5,2),
	`breakEvenRoas` decimal(5,2),
	`effectiveDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productPricing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyProductId` varchar(64),
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`status` enum('active','inactive','discontinued') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_shopifyProductId_unique` UNIQUE(`shopifyProductId`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`returnDate` timestamp NOT NULL,
	`reason` varchar(255),
	`refundAmount` decimal(12,2),
	`status` enum('initiated','approved','received','refunded','rejected') DEFAULT 'initiated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shopifyIntegration` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopName` varchar(255) NOT NULL,
	`accessToken` varchar(255),
	`apiVersion` varchar(20),
	`status` enum('active','inactive','error') DEFAULT 'active',
	`lastSyncDate` timestamp,
	`syncErrorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shopifyIntegration_id` PRIMARY KEY(`id`),
	CONSTRAINT `shopifyIntegration_shopName_unique` UNIQUE(`shopName`)
);
--> statement-breakpoint
CREATE TABLE `shopifySyncLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncType` enum('orders','products','inventory','customers','fulfillment') NOT NULL,
	`status` enum('pending','in_progress','completed','failed') DEFAULT 'pending',
	`itemsProcessed` int,
	`itemsFailed` int,
	`errorMessage` text,
	`startTime` timestamp,
	`endTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shopifySyncLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('owner','accountant','media_buyer','operations','customer_support','inventory_manager') NOT NULL DEFAULT 'operations';--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `auditLog` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_audit_user` ON `auditLog` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_audit_timestamp` ON `auditLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `businessEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `idx_event_processed` ON `businessEvents` (`processed`);--> statement-breakpoint
CREATE INDEX `idx_cashflow_date` ON `cashflowTransactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_cashflow_type` ON `cashflowTransactions` (`transactionType`);--> statement-breakpoint
CREATE INDEX `idx_tracking_number` ON `fulfillments` (`trackingNumber`);--> statement-breakpoint
CREATE INDEX `idx_entry_date` ON `journalEntries` (`entryDate`);--> statement-breakpoint
CREATE INDEX `idx_reference` ON `journalEntries` (`referenceType`,`referenceId`);--> statement-breakpoint
CREATE INDEX `idx_account` ON `journalLines` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_campaign_date` ON `metaCampaigns` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `idx_order_line_items` ON `orderLineItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `idx_order_date` ON `orders` (`orderDate`);--> statement-breakpoint
CREATE INDEX `idx_order_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_order_meta_campaign` ON `orders` (`metaCampaignId`);--> statement-breakpoint
CREATE INDEX `idx_notification_status` ON `ownerNotifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_product_cost_date` ON `productCosts` (`productId`,`effectiveDate`);--> statement-breakpoint
CREATE INDEX `idx_product_pricing_date` ON `productPricing` (`productId`,`effectiveDate`);--> statement-breakpoint
CREATE INDEX `idx_sku` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_shopify_product` ON `products` (`shopifyProductId`);--> statement-breakpoint
CREATE INDEX `idx_return_order` ON `returns` (`orderId`);--> statement-breakpoint
CREATE INDEX `idx_sync_type` ON `shopifySyncLog` (`syncType`);--> statement-breakpoint
CREATE INDEX `idx_sync_status` ON `shopifySyncLog` (`status`);--> statement-breakpoint
CREATE INDEX `idx_role` ON `users` (`role`);