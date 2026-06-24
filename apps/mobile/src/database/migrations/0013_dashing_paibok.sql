ALTER TABLE `routines` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
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
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises_base`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_session_exercises`("id", "session_id", "exercise_id", "position", "sets", "prescription_mode", "reps_min", "reps_max", "duration_seconds", "weight_kg", "rest_seconds", "intensity_mode", "rir", "rpe", "tempo", "notes", "created_at", "updated_at", "sync_status") SELECT "id", "session_id", "exercise_id", "position", "sets", "prescription_mode", "reps_min", "reps_max", "duration_seconds", "weight_kg", "rest_seconds", "intensity_mode", "rir", "rpe", "tempo", "notes", "created_at", "updated_at", "sync_status" FROM `session_exercises`;--> statement-breakpoint
DROP TABLE `session_exercises`;--> statement-breakpoint
ALTER TABLE `__new_session_exercises` RENAME TO `session_exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;