ALTER TABLE public.session_exercises
  DROP COLUMN IF EXISTS sets,
  DROP COLUMN IF EXISTS prescription_mode,
  DROP COLUMN IF EXISTS reps_min,
  DROP COLUMN IF EXISTS reps_max,
  DROP COLUMN IF EXISTS duration_seconds,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS rest_seconds,
  DROP COLUMN IF EXISTS intensity_mode,
  DROP COLUMN IF EXISTS rir,
  DROP COLUMN IF EXISTS rpe,
  DROP COLUMN IF EXISTS tempo,
  DROP COLUMN IF EXISTS notes;