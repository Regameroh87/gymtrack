<<<<<<< HEAD
CREATE UNIQUE INDEX IF NOT EXISTS `session_exercises_session_id_exercise_id_unique` ON `session_exercises` (`session_id`,`exercise_id`);
=======
DELETE FROM `session_exercises` WHERE `id` NOT IN (
  SELECT MIN(`id`) FROM `session_exercises` GROUP BY `session_id`, `exercise_id`
);
CREATE UNIQUE INDEX `session_exercises_session_id_exercise_id_unique` ON `session_exercises` (`session_id`,`exercise_id`);
>>>>>>> 4e5a8ea (fix: remove duplicate session exercises before creating unique constraint)
