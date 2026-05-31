CREATE TABLE `custom_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`muscle_group` text NOT NULL,
	`youtube_video_url` text DEFAULT '' NOT NULL,
	`image_uri` text,
	`video_uri` text,
	`instructions` text DEFAULT '' NOT NULL,
	`is_unilateral` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_plan_week_day_exercise_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps_min` integer,
	`reps_max` integer,
	`weight_kg` real,
	`duration_seconds` integer,
	`rir` real,
	`rpe` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `custom_plan_week_day_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_plan_week_day_exercise_sets_exercise_id_set_number_unique` ON `custom_plan_week_day_exercise_sets` (`exercise_id`,`set_number`);--> statement-breakpoint
CREATE TABLE `custom_plan_week_day_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_day_id` text NOT NULL,
	`session_exercise_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`prescription_mode` text DEFAULT 'reps' NOT NULL,
	`rest_seconds` integer DEFAULT 90,
	`intensity_mode` text DEFAULT 'none',
	`tempo` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`week_day_id`) REFERENCES `custom_plan_week_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `custom_session_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_plan_week_day_exercises_week_day_id_session_exercise_id_unique` ON `custom_plan_week_day_exercises` (`week_day_id`,`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `custom_plan_week_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`week_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`session_source` text DEFAULT 'custom',
	`session_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`week_id`) REFERENCES `custom_plan_weeks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_plan_week_days_week_id_day_number_unique` ON `custom_plan_week_days` (`week_id`,`day_number`);--> statement-breakpoint
CREATE TABLE `custom_plan_weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`week_number` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `custom_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_plan_weeks_plan_id_week_number_unique` ON `custom_plan_weeks` (`plan_id`,`week_number`);--> statement-breakpoint
CREATE TABLE `custom_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`objective` text,
	`level` text,
	`weekly_days` integer DEFAULT 3 NOT NULL,
	`duration_weeks` integer DEFAULT 8 NOT NULL,
	`cover_image_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`exercise_source` text DEFAULT 'base' NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `custom_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom_session_exercises_session_id_exercise_id_unique` ON `custom_session_exercises` (`session_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `custom_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`level` text,
	`cover_image_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `training_plans` ADD `is_published` integer DEFAULT false NOT NULL;