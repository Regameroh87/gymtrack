-- Pases por actividad: el precio de un gimnasio depende de la frecuencia
-- (musculación 2x/semana vs 3x/semana vs libre). Modelamos cada frecuencia como
-- un PASE de la actividad, no como una actividad aparte. El precio se mueve de
-- activities al pase; la suscripción futura referenciará un activity_plan_id.

-- El precio ahora vive en el pase, no en la actividad (activities está vacía).
alter table public.activities drop column price;

create table public.activity_plans (
  id                 uuid primary key default gen_random_uuid(),
  activity_id        uuid not null references public.activities(id) on delete cascade,
  label              text not null,            -- "2 veces/semana", "Libre", "Pase mensual"
  frequency_per_week int,                      -- null = libre/ilimitado
  price              numeric(10,2),
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint activity_plans_freq_positive
    check (frequency_per_week is null or frequency_per_week > 0)
);

create index activity_plans_activity_id_idx on public.activity_plans (activity_id);
create unique index activity_plans_label_uniq
  on public.activity_plans (activity_id, lower(label));

create trigger activity_plans_set_updated_at
  before update on public.activity_plans
  for each row execute function public.set_updated_at();

alter table public.activity_plans enable row level security;

-- RLS por la actividad padre (patrón de tablas hijas del repo: EXISTS sobre el padre).
create policy activity_plans_select on public.activity_plans
  for select using (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id
        and (a.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

create policy activity_plans_admin_write on public.activity_plans
  for all using (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id and public.is_admin_of(a.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id and public.is_admin_of(a.gym_id)
    )
  );
