-- Multi-tenant — paso 2
-- Agrega `gym_id` NOT NULL a las 4 tablas que llevan tenant directo:
--   exercises_base, equipment, sessions, training_plans
-- Las hijas (session_exercises, exercise_equipment, plan_weeks y descendientes)
-- heredan el gym vía FK al padre — no se agrega columna allí.
--
-- Asume base vacía (dev). Si hubiera filas previas, esta migración falla
-- al imponer NOT NULL, lo cual es intencional para no quedarnos con datos
-- huérfanos sin gym.

alter table public.exercises_base
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.equipment
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.sessions
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

alter table public.training_plans
  add column gym_id uuid not null references public.gyms(id) on delete cascade;

-- Índices para filtros por gym (todas las queries van a llevar gym_id en where)
create index exercises_base_gym_id_idx on public.exercises_base(gym_id);
create index equipment_gym_id_idx      on public.equipment(gym_id);
create index sessions_gym_id_idx       on public.sessions(gym_id);
create index training_plans_gym_id_idx on public.training_plans(gym_id);
