ALTER TABLE `products` ADD `stockQuantity` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `reorderPoint` int DEFAULT 10 NOT NULL;