CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercises_base` (
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
INSERT INTO `__new_exercises_base`("id", "gym_id", "name", "category", "muscle_group", "youtube_video_url", "image_uri", "video_uri", "instructions", "is_unilateral", "is_catalog", "created_at", "updated_at", "sync_status") SELECT "id", "gym_id", "name", "category", "muscle_group", "youtube_video_url", "image_uri", "video_uri", "instructions", "is_unilateral", "is_catalog", "created_at", "updated_at", "sync_status" FROM `exercises_base`;--> statement-breakpoint
DROP TABLE `exercises_base`;--> statement-breakpoint
ALTER TABLE `__new_exercises_base` RENAME TO `exercises_base`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
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
INSERT INTO `__new_sessions`("id", "gym_id", "name", "description", "level", "cover_image_uri", "created_by", "is_catalog", "created_at", "updated_at", "sync_status") SELECT "id", "gym_id", "name", "description", "level", "cover_image_uri", "created_by", "is_catalog", "created_at", "updated_at", "sync_status" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE TABLE `__new_training_plans` (
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
--> statement-breakpoint
INSERT INTO `__new_training_plans`("id", "gym_id", "name", "description", "objective", "level", "target_gender", "weekly_days", "duration_weeks", "cover_image_uri", "is_catalog", "is_published", "archived_at", "created_by", "created_at", "updated_at", "sync_status") SELECT "id", "gym_id", "name", "description", "objective", "level", "target_gender", "weekly_days", "duration_weeks", "cover_image_uri", "is_catalog", "is_published", "archived_at", "created_by", "created_at", "updated_at", "sync_status" FROM `training_plans`;--> statement-breakpoint
DROP TABLE `training_plans`;--> statement-breakpoint
ALTER TABLE `__new_training_plans` RENAME TO `training_plans`;