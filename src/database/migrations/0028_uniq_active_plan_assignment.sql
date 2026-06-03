CREATE UNIQUE INDEX IF NOT EXISTS `uniq_active_plan_assignment` ON `plan_assignments` (`user_id`) WHERE `status` = 'active';
