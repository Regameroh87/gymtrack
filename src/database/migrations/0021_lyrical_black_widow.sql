CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`plan_id` text,
	`week_number` integer,
	`day_number` integer,
	`duration_seconds` integer,
	`completed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`plan_id`) REFERENCES `training_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `session_set_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_log_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight_kg` real,
	`rest_seconds` integer,
	`notes` text,
	`rir` real,
	`rpe` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_set_logs_session_log_id_exercise_id_set_number_unique` ON `session_set_logs` (`session_log_id`,`exercise_id`,`set_number`);