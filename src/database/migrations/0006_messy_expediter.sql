PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercises_base` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`muscle_group` text NOT NULL,
	`youtube_video_url` text NOT NULL,
	`image_uri` text,
	`video_uri` text,
	`instructions` text NOT NULL,
	`is_unilateral` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_exercises_base`("id", "name", "category", "muscle_group", "youtube_video_url", "image_uri", "video_uri", "instructions", "is_unilateral", "created_at", "updated_at", "sync_status") SELECT "id", "name", "category", "muscle_group", "youtube_video_url", "image_uri", "video_uri", "instructions", "is_unilateral", "created_at", "updated_at", "sync_status" FROM `exercises_base`;--> statement-breakpoint
DROP TABLE `exercises_base`;--> statement-breakpoint
ALTER TABLE `__new_exercises_base` RENAME TO `exercises_base`;--> statement-breakpoint
PRAGMA foreign_keys=ON;