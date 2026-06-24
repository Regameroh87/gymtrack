PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `plan_assignments_new` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`custom_plan_id` text,
	`user_id` text NOT NULL,
	`assigned_by` text NOT NULL,
	`gym_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);--> statement-breakpoint
INSERT INTO `plan_assignments_new` SELECT `id`, `plan_id`, NULL, `user_id`, `assigned_by`, `gym_id`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`, `sync_status` FROM `plan_assignments`;--> statement-breakpoint
DROP TABLE `plan_assignments`;--> statement-breakpoint
ALTER TABLE `plan_assignments_new` RENAME TO `plan_assignments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
