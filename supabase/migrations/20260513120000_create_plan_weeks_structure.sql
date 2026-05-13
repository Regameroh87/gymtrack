-- Estructura de semanas, días y prescripción por serie dentro de un plan.
-- Reemplaza training_plan_days (plana, sin semanas) con una jerarquía:
--   plan_weeks → plan_week_days → plan_week_day_exercises → plan_week_day_exercise_sets

-- 1. plan_weeks
create table if not exists public.plan_weeks (
  id          text primary key,
  plan_id     text not null references public.training_plans(id) on delete cascade,
  week_number integer not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sync_status text not null default 'pending',
  unique(plan_id, week_number)
);

-- 2. plan_week_days
create table if not exists public.plan_week_days (
  id          text primary key,
  week_id     text not null references public.plan_weeks(id) on delete cascade,
  day_number  integer not null check (day_number between 1 and 7),
  session_id  text references public.sessions(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sync_status text not null default 'pending',
  unique(week_id, day_number)
);

-- 3. plan_week_day_exercises
create table if not exists public.plan_week_day_exercises (
  id                  text primary key,
  week_day_id         text not null references public.plan_week_days(id) on delete cascade,
  session_exercise_id text not null references public.session_exercises(id),
  position            integer not null default 0,
  prescription_mode   text not null default 'reps',   -- 'reps' | 'duration'
  rest_seconds        integer default 90,
  intensity_mode      text default 'none',             -- 'none' | 'rir' | 'rpe'
  tempo               text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  sync_status         text not null default 'pending',
  unique(week_day_id, session_exercise_id)
);

-- 4. plan_week_day_exercise_sets
create table if not exists public.plan_week_day_exercise_sets (
  id               text primary key,
  exercise_id      text not null references public.plan_week_day_exercises(id) on delete cascade,
  set_number       integer not null,
  reps_min         integer,
  reps_max         integer,
  weight_kg        real,
  duration_seconds integer,
  rir              real,
  rpe              real,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  sync_status      text not null default 'pending',
  unique(exercise_id, set_number)
);

-- Triggers updated_at para las 4 tablas nuevas
do $do$
declare
  t text;
  tables text[] := array[
    'plan_weeks',
    'plan_week_days',
    'plan_week_day_exercises',
    'plan_week_day_exercise_sets'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I', t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$do$;
