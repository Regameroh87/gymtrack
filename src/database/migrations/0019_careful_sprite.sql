ALTER TABLE `equipment` ADD `gym_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises_base` ADD `gym_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `gym_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `training_plans` ADD `gym_id` text NOT NULL;