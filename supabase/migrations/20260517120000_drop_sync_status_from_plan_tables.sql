-- sync_status es un concepto local del cliente (SQLite) y no debe vivir en Supabase.
alter table public.plan_weeks               drop column if exists sync_status;
alter table public.plan_week_days           drop column if exists sync_status;
alter table public.plan_week_day_exercises  drop column if exists sync_status;
alter table public.plan_week_day_exercise_sets drop column if exists sync_status;
