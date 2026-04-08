ALTER TABLE `equipment` ADD `cloudinary_image_public_id` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `local_image_uri` text;--> statement-breakpoint
ALTER TABLE `equipment` DROP COLUMN `image_public_id`;--> statement-breakpoint
ALTER TABLE `exercises_base` ADD `cloudinary_video_public_id` text;--> statement-breakpoint
ALTER TABLE `exercises_base` ADD `cloudinary_image_public_id` text;--> statement-breakpoint
ALTER TABLE `exercises_base` ADD `local_image_uri` text;--> statement-breakpoint
ALTER TABLE `exercises_base` ADD `local_video_uri` text;--> statement-breakpoint
ALTER TABLE `exercises_base` DROP COLUMN `video_public_id`;--> statement-breakpoint
ALTER TABLE `exercises_base` DROP COLUMN `image_public_id`;