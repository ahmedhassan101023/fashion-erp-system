CREATE TABLE `exportHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportType` varchar(100) NOT NULL,
	`format` varchar(10) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`generatedBy` int NOT NULL,
	`dateRangeStart` timestamp,
	`dateRangeEnd` timestamp,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exportHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lowInventory` boolean NOT NULL DEFAULT true,
	`negativeCashflow` boolean NOT NULL DEFAULT true,
	`highCostOrders` boolean NOT NULL DEFAULT true,
	`failedDelivery` boolean NOT NULL DEFAULT true,
	`dailySummary` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `uploadedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`relatedType` varchar(50),
	`relatedId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploadedFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_export_generated_by` ON `exportHistory` (`generatedBy`);--> statement-breakpoint
CREATE INDEX `idx_export_report_type` ON `exportHistory` (`reportType`);--> statement-breakpoint
CREATE INDEX `idx_file_uploaded_by` ON `uploadedFiles` (`uploadedBy`);--> statement-breakpoint
CREATE INDEX `idx_file_related` ON `uploadedFiles` (`relatedType`,`relatedId`);