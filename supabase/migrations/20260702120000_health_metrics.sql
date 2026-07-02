-- ==========================================
-- Health metrics: agregados diarios de HealthKit / Health Connect.
--
-- Modelo: UNA fila ancha por (user_id, date). El health store del device es
-- la fuente autoritativa; el cliente re-sube por upsert idempotente, así que
-- no hay tombstones ni sync_status (esta tabla vive FUERA del pipeline SQLite,
-- que purga sus tablas al switchear de gym).
--
-- Sin gym_id: el dato es de la persona, no del gym. El acceso del staff se
-- deriva de memberships en read-time (user_in_staff_gym), igual que
-- user_in_admin_gym pero incluyendo coaches.
--
-- user_id = auth.users.id (auth uid), como las tablas custom_*, para que las
-- policies comparen directo contra auth.uid() sin joins a profiles.
-- ==========================================

-- ¿p_user tiene membership activa en algún gym donde el caller es staff
-- (owner/admin/coach)? DEFINER para que la RLS de memberships no recorte
-- la subquery al caller.
create or replace function public.user_in_staff_gym(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user
      and m.status = 'active'
      and public.is_staff_of(m.gym_id)
  );
$$;

revoke execute on function public.user_in_staff_gym(uuid) from anon, public;

create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps integer,
  active_calories real,      -- kcal
  distance_meters real,
  avg_heart_rate real,       -- bpm, agregado diario
  min_heart_rate real,
  max_heart_rate real,
  resting_heart_rate real,
  weight_kg real,
  source text not null check (source in ('healthkit', 'health_connect')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index health_metrics_user_date_idx
  on public.health_metrics (user_id, date desc);

create trigger health_metrics_set_updated_at
  before update on public.health_metrics
  for each row execute function public.set_updated_at();

alter table public.health_metrics enable row level security;

-- Consentimiento explícito para subir datos de salud off-device (requisito de
-- App Review 5.1.3 / política de salud de Play). No está en la lista de
-- columnas privilegiadas de guard_profile_self_update, así que el self-update
-- ya pasa. Null = sin consentimiento; el timestamp documenta cuándo lo dio.
alter table public.profiles
  add column if not exists health_sync_consent_at timestamptz;

create policy health_metrics_select_own on public.health_metrics
  for select using (user_id = auth.uid());

create policy health_metrics_select_staff on public.health_metrics
  for select using (public.user_in_staff_gym(user_id));

-- Solo el propio usuario escribe, y solo con consentimiento vigente
-- (enforcement server-side: un cliente desincronizado no puede subir).
create policy health_metrics_insert_own on public.health_metrics
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.health_sync_consent_at is not null
    )
  );

create policy health_metrics_update_own on public.health_metrics
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.health_sync_consent_at is not null
    )
  );

-- El delete NO exige consentimiento: revocarlo borra las filas propias.
create policy health_metrics_delete_own on public.health_metrics
  for delete using (user_id = auth.uid());
