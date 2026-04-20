ALTER TABLE `equipment` RENAME COLUMN "local_image_uri" TO "image_uri";--> statement-breakpoint
ALTER TABLE `exercises_base` RENAME COLUMN "local_image_uri" TO "image_uri";--> statement-breakpoint
ALTER TABLE `exercises_base` RENAME COLUMN "local_video_uri" TO "video_uri";--> statement-breakpoint
ALTER TABLE `equipment` DROP COLUMN `cloudinary_image_public_id`;--> statement-breakpoint
ALTER TABLE `exercises_base` DROP COLUMN `cloudinary_video_public_id`;--> statement-breakpoint
ALTER TABLE `exercises_base` DROP COLUMN `cloudinary_image_public_id`;