PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cloudinary_image_public_id` text,
	`local_image_uri` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_equipment`("id", "name", "cloudinary_image_public_id", "local_image_uri", "created_at", "updated_at", "sync_status") SELECT "id", "name", "cloudinary_image_public_id", "local_image_uri", "created_at", "updated_at", "sync_status" FROM `equipment`;--> statement-breakpoint
DROP TABLE `equipment`;--> statement-breakpoint
ALTER TABLE `__new_equipment` RENAME TO `equipment`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_exercises_base` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`muscle_group` text NOT NULL,
	`youtube_video_url` text NOT NULL,
	`cloudinary_video_public_id` text,
	`cloudinary_image_public_id` text,
	`local_image_uri` text,
	`local_video_uri` text,
	`instructions` text NOT NULL,
	`is_unilateral` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_exercises_base`("id", "name", "category", "muscle_group", "youtube_video_url", "cloudinary_video_public_id", "cloudinary_image_public_id", "local_image_uri", "local_video_uri", "instructions", "is_unilateral", "created_at", "updated_at", "sync_status") SELECT "id", "name", "category", "muscle_group", "youtube_video_url", "cloudinary_video_public_id", "cloudinary_image_public_id", "local_image_uri", "local_video_uri", "instructions", "is_unilateral", "created_at", "updated_at", "sync_status" FROM `exercises_base`;--> statement-breakpoint
DROP TABLE `exercises_base`;--> statement-breakpoint
ALTER TABLE `__new_exercises_base` RENAME TO `exercises_base`;--> statement-breakpoint
ALTER TABLE `exercise_equipment` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_equipment` ADD `updated_at` text NOT NULL;