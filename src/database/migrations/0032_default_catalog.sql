ALTER TABLE `exercises_base` ADD `is_catalog` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `sessions` ADD `is_catalog` integer NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `training_plans` ADD `is_catalog` integer NOT NULL DEFAULT false;
