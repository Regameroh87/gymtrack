ALTER TABLE training_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS cover_image_uri text,
  ADD COLUMN IF NOT EXISTS duration_weeks integer NOT NULL DEFAULT 8;
