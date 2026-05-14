ALTER TABLE `training_plan_days` RENAME TO `plan_week_day_exercises`;--> statement-breakpoint
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
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_plan_week_day_exercises` (
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
INSERT INTO `__new_plan_week_day_exercises`("id", "week_day_id", "session_exercise_id", "position", "prescription_mode", "rest_seconds", "intensity_mode", "tempo", "notes", "created_at", "updated_at", "sync_status") SELECT "id", "week_day_id", "session_exercise_id", "position", "prescription_mode", "rest_seconds", "intensity_mode", "tempo", "notes", "created_at", "updated_at", "sync_status" FROM `plan_week_day_exercises`;--> statement-breakpoint
DROP TABLE `plan_week_day_exercises`;--> statement-breakpoint
ALTER TABLE `__new_plan_week_day_exercises` RENAME TO `plan_week_day_exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `plan_week_day_exercises_week_day_id_session_exercise_id_unique` ON `plan_week_day_exercises` (`week_day_id`,`session_exercise_id`);--> statement-breakpoint
ALTER TABLE `training_plans` ADD `duration_weeks` integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `training_plans` DROP COLUMN `kind`;--> statement-breakpoint
ALTER TABLE `training_plans` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `sets`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `prescription_mode`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `reps_min`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `reps_max`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `duration_seconds`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `weight_kg`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `rest_seconds`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `intensity_mode`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `rir`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `rpe`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `tempo`;--> statement-breakpoint
ALTER TABLE `session_exercises` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `estimated_duration_min`;