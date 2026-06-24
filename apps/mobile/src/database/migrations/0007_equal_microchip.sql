CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
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
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`objective` text,
	`level` text,
	`estimated_duration_min` integer,
	`cover_image_uri` text,
	`status` text DEFAULT 'borrador' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
