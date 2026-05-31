CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`tempPassword` varchar(255),
	`role` enum('accountant','media_buyer','operations','customer_support','inventory_manager','admin') NOT NULL DEFAULT 'operations',
	`permissions` json DEFAULT ('[]'),
	`status` enum('pending','active','suspended') NOT NULL DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`lastLoginAt` timestamp,
	`notes` text,
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teamMembers_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `teamMembers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_team_email` ON `teamMembers` (`email`);--> statement-breakpoint
CREATE INDEX `idx_team_status` ON `teamMembers` (`status`);