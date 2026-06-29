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
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`name` text NOT NULL,
	`image_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercises_base` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`muscle_group` text NOT NULL,
	`youtube_video_url` text NOT NULL,
	`image_uri` text,
	`video_uri` text,
	`instructions` text NOT NULL,
	`is_unilateral` integer DEFAULT false NOT NULL,
	`is_catalog` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_assignments` (
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
);
--> statement-breakpoint
CREATE TABLE `plan_week_day_exercise_sets` (
	`id` text PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`exercise_id`) REFERENCES `plan_week_day_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_week_day_exercise_sets_exercise_id_set_number_unique` ON `plan_week_day_exercise_sets` (`exercise_id`,`set_number`);--> statement-breakpoint
CREATE TABLE `plan_week_day_exercises` (
	`id` text PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`week_day_id`) REFERENCES `plan_week_days`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_week_day_exercises_week_day_id_session_exercise_id_unique` ON `plan_week_day_exercises` (`week_day_id`,`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `plan_week_days` (
	`id` text PRIMARY KEY NOT NULL,
	`week_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`session_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`week_id`) REFERENCES `plan_weeks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_week_days_week_id_day_number_unique` ON `plan_week_days` (`week_id`,`day_number`);--> statement-breakpoint
CREATE TABLE `plan_weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`week_number` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `training_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_weeks_plan_id_week_number_unique` ON `plan_weeks` (`plan_id`,`week_number`);--> statement-breakpoint
CREATE TABLE `session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_exercises_session_id_exercise_id_unique` ON `session_exercises` (`session_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`plan_id` text,
	`custom_plan_id` text,
	`week_number` integer,
	`day_number` integer,
	`duration_seconds` integer,
	`completed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` text,
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
	`deleted_at` text,
	FOREIGN KEY (`session_log_id`) REFERENCES `session_logs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_set_logs_session_log_id_exercise_id_set_number_unique` ON `session_set_logs` (`session_log_id`,`exercise_id`,`set_number`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text,
	`name` text NOT NULL,
	`description` text,
	`level` text,
	`cover_image_uri` text,
	`created_by` text,
	`is_catalog` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `training_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`gym_id` text,
	`name` text NOT NULL,
	`description` text,
	`objective` text,
	`level` text,
	`target_gender` text DEFAULT 'ambos' NOT NULL,
	`weekly_days` integer DEFAULT 3 NOT NULL,
	`duration_weeks` integer DEFAULT 8 NOT NULL,
	`cover_image_uri` text,
	`is_catalog` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `uniq_active_plan_assignment` ON `plan_assignments` (`user_id`) WHERE `status` = 'active';
