CREATE TABLE `plan_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`user_id` text NOT NULL,
	`assigned_by` text NOT NULL,
	`gym_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `training_plans`(`id`) ON UPDATE no action ON DELETE no action
);
