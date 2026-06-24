CREATE TABLE IF NOT EXISTS `exercises_base` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`muscle_group` text NOT NULL,
	`equipment` text NOT NULL,
	`video_public_id` text NOT NULL,
	`youtube_video_url` text NOT NULL,
	`image_public_id` text NOT NULL,
	`instructions` text NOT NULL,
	`is_unilateral` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
