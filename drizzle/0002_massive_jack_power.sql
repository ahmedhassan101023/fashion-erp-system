CREATE TABLE `capitalEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` varchar(255),
	`entryDate` timestamp NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capitalEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopifyCustomerId` varchar(64),
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`city` varchar(100),
	`country` varchar(100),
	`totalOrders` int DEFAULT 0,
	`totalSpent` decimal(12,2) DEFAULT '0',
	`lastOrderDate` timestamp,
	`tags` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_shopifyCustomerId_unique` UNIQUE(`shopifyCustomerId`)
);
--> statement-breakpoint
CREATE TABLE `dailyExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` varchar(255) NOT NULL,
	`supplierId` int,
	`expenseDate` timestamp NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` text NOT NULL,
	`createdBy` int NOT NULL,
	`relatedType` varchar(50),
	`relatedId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255),
	`phone` varchar(50),
	`email` varchar(320),
	`address` text,
	`balance` decimal(12,2) DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` int,
	`createdBy` int NOT NULL,
	`dueDate` timestamp,
	`status` enum('pending','in_progress','completed','overdue') DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_customer_email` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `idx_customer_shopify` ON `customers` (`shopifyCustomerId`);--> statement-breakpoint
CREATE INDEX `idx_note_created_by` ON `notes` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_task_assigned` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_task_status` ON `tasks` (`status`);