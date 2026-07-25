-- Agenda de clases del gym: horarios semanales recurrentes por actividad
-- (activity_schedules) + instancias materializadas por fecha (activity_classes).
--
-- Se materializa cada clase como fila propia porque: (a) el pago por clase al
-- coach cuenta clases REALMENTE dictadas (cancelaciones/feriados), (b) las
-- suplencias necesitan coach efectivo por fecha, y (c) las reservas de socios a
-- futuro referenciarán una clase concreta (FK class_id).
--
-- Entidades ONLINE (panel admin): no entran al sync offline. La materialización
-- es on-demand vía RPC idempotente generate_activity_classes, llamada desde la
-- UI al abrir el período.

-- ── Horarios semanales recurrentes ──
create table public.activity_schedules (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  weekday     smallint not null,           -- 0=domingo … 6=sábado (convención JS getDay())
  start_time  time not null,
  end_time    time not null,
  capacity    integer,                     -- null = sin cupo
  coach_id    uuid references public.profiles(id) on delete set null,  -- coach titular
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint activity_schedules_weekday_valid check (weekday between 0 and 6),
  constraint activity_schedules_time_valid check (start_time < end_time),
  constraint activity_schedules_capacity_positive
    check (capacity is null or capacity > 0)
);

-- Solapamiento entre actividades permitido (no se modelan salas); solo se evita
-- el duplicado exacto del mismo slot.
create unique index activity_schedules_slot_uniq
  on public.activity_schedules (activity_id, weekday, start_time);
create index activity_schedules_gym_idx on public.activity_schedules (gym_id);
create index activity_schedules_coach_idx on public.activity_schedules (coach_id);

create trigger activity_schedules_set_updated_at
  before update on public.activity_schedules
  for each row execute function public.set_updated_at();

alter table public.activity_schedules enable row level security;

-- SELECT: cualquier miembro del gym (base para reservas de socios a futuro).
create policy activity_schedules_select on public.activity_schedules
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

-- WRITE: solo admin/owner.
create policy activity_schedules_admin_write on public.activity_schedules
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- ── Clases materializadas (una fila por fecha) ──
create table public.activity_classes (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  schedule_id uuid references public.activity_schedules(id) on delete set null, -- null = clase ad-hoc
  date        date not null,
  start_time  time not null,               -- snapshot del horario (puede editarse puntualmente)
  end_time    time not null,
  capacity    integer,                     -- snapshot (base de reservas)
  coach_id    uuid references public.profiles(id) on delete set null,  -- coach EFECTIVO (suplencias)
  status      text not null default 'scheduled'
    check (status in ('scheduled','completed','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint activity_classes_time_valid check (start_time < end_time)
);

-- Idempotencia de la materialización: una sola instancia por (horario, fecha).
create unique index activity_classes_occurrence_uniq
  on public.activity_classes (schedule_id, date) where schedule_id is not null;
create index activity_classes_gym_date_idx on public.activity_classes (gym_id, date);
create index activity_classes_coach_date_idx on public.activity_classes (coach_id, date);

create trigger activity_classes_set_updated_at
  before update on public.activity_classes
  for each row execute function public.set_updated_at();

alter table public.activity_classes enable row level security;

-- SELECT: cualquier miembro del gym (el socio verá la grilla al reservar).
create policy activity_classes_select on public.activity_classes
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

-- WRITE: admin/owner gestiona la agenda completa.
create policy activity_classes_admin_write on public.activity_classes
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- El coach puede actualizar SU clase (marcarla dictada); no puede reasignarse
-- a otro (with check exige que siga siendo suya).
create policy activity_classes_coach_update on public.activity_classes
  for update using (coach_id = public.auth_profile_id())
  with check (coach_id = public.auth_profile_id());

-- ── Materialización on-demand ──
-- Genera las clases del rango a partir de los horarios activos del gym.
-- Idempotente: los (schedule_id, date) ya existentes se saltean, así las clases
-- editadas (canceladas, con suplente) no se pisan al re-generar.
create or replace function public.generate_activity_classes(
  p_gym_id uuid,
  p_from   date,
  p_to     date
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;
  if p_from > p_to then
    raise exception 'Rango de fechas inválido';
  end if;
  if p_to - p_from > 62 then
    raise exception 'Rango máximo: 62 días';
  end if;

  insert into public.activity_classes
    (gym_id, activity_id, schedule_id, date, start_time, end_time, capacity, coach_id)
  select s.gym_id, s.activity_id, s.id, d::date, s.start_time, s.end_time,
         s.capacity, s.coach_id
  from public.activity_schedules s
  cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  join public.activities a on a.id = s.activity_id and a.is_active
  where s.gym_id = p_gym_id
    and s.is_active
    and extract(dow from d)::int = s.weekday
  on conflict (schedule_id, date) where schedule_id is not null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
