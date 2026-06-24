CREATE TABLE `session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`prescription_mode` text DEFAULT 'reps' NOT NULL,
	`reps_min` integer,
	`reps_max` integer,
	`duration_seconds` integer,
	`weight_kg` real,
	`rest_seconds` integer,
	`intensity_mode` text DEFAULT 'none' NOT NULL,
	`rir` integer,
	`rpe` real,
	`tempo` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `plan_assignments`;--> statement-breakpoint
DROP TABLE `routine_exercises`;--> statement-breakpoint
DROP TABLE `training_plan_days`;--> statement-breakpoint
DROP TABLE `training_plans`;