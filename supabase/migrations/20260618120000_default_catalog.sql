-- Catálogo de contenido por default (ejercicios + sesiones + planes), activable por gym.
--
-- Modelo: el catálogo NO se clona. Vive como filas de las tablas existentes
-- (exercises_base / sessions / training_plans + sus hijas) con gym_id NULL e
-- is_catalog = true, curadas por el super_admin y legibles por cualquier gym.
-- Editar = forkear a custom_* (flujo ya existente, sin cambios). El flag
-- gyms.default_catalog decide en el cliente si la biblioteca del gym lo muestra.
--
-- Escritura: las policies de insert/update/delete existentes están keyeadas por
-- is_staff_of(gym_id)/is_admin_of(gym_id). Para una fila de catálogo gym_id es NULL,
-- y is_staff_of(NULL) = is_admin_of(NULL) = is_super_admin() (porque m.gym_id = NULL
-- nunca matchea). Por eso esas policies YA bloquean a staff y YA permiten al
-- super_admin sobre filas de catálogo, sin necesidad de modificarlas. Igual abajo
-- agregamos una policy aditiva explícita para garantizar el CRUD del super_admin.

-- ── 1. Columnas ────────────────────────────────────────────────────────────
alter table public.exercises_base add column if not exists is_catalog boolean not null default false;
alter table public.sessions       add column if not exists is_catalog boolean not null default false;
alter table public.training_plans  add column if not exists is_catalog boolean not null default false;
alter table public.gyms            add column if not exists default_catalog boolean not null default false;

-- ── 2. gym_id NULLable (el catálogo no tiene dueño) ────────────────────────
alter table public.exercises_base alter column gym_id drop not null;
alter table public.sessions       alter column gym_id drop not null;
alter table public.training_plans  alter column gym_id drop not null;

-- Índices parciales para que el pull dedicado de catálogo y la biblioteca filtren rápido.
create index if not exists exercises_base_is_catalog_idx on public.exercises_base (is_catalog) where is_catalog;
create index if not exists sessions_is_catalog_idx       on public.sessions (is_catalog)       where is_catalog;
create index if not exists training_plans_is_catalog_idx on public.training_plans (is_catalog) where is_catalog;

-- ── 3. SELECT policies: sumar `or is_catalog` (padres) / `or <padre>.is_catalog` (hijas) ──

drop policy if exists exercises_base_select on public.exercises_base;
create policy exercises_base_select on public.exercises_base
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists training_plans_select on public.training_plans;
create policy training_plans_select on public.training_plans
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists exercise_equipment_select on public.exercise_equipment;
create policy exercise_equipment_select on public.exercise_equipment
  for select using (
    exists (
      select 1 from public.exercises_base e
      where e.id = exercise_equipment.exercise_id
        and (e.gym_id in (select public.auth_gym_ids()) or e.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists session_exercises_select on public.session_exercises;
create policy session_exercises_select on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and (s.gym_id in (select public.auth_gym_ids()) or s.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists plan_weeks_select on public.plan_weeks;
create policy plan_weeks_select on public.plan_weeks
  for select using (
    exists (
      select 1 from public.training_plans tp
      where tp.id = plan_weeks.plan_id
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists plan_week_days_select on public.plan_week_days;
create policy plan_week_days_select on public.plan_week_days
  for select using (
    exists (
      select 1
      from public.plan_weeks pw
      join public.training_plans tp on tp.id = pw.plan_id
      where pw.id = plan_week_days.week_id
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists plan_week_day_exercises_select on public.plan_week_day_exercises;
create policy plan_week_day_exercises_select on public.plan_week_day_exercises
  for select using (
    exists (
      select 1
      from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      join public.training_plans tp on tp.id = pw.plan_id
      where d.id = plan_week_day_exercises.week_day_id
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists plan_week_day_exercise_sets_select on public.plan_week_day_exercise_sets;
create policy plan_week_day_exercise_sets_select on public.plan_week_day_exercise_sets
  for select using (
    exists (
      select 1
      from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      join public.training_plans tp on tp.id = pw.plan_id
      where x.id = plan_week_day_exercise_sets.exercise_id
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
    )
  );

-- ── 4. CRUD de catálogo garantizado para super_admin (aditivo, permissive/OR) ──
-- No restringe a nadie (RLS es permissive): solo garantiza que el super_admin pueda
-- gestionar el contenido de catálogo sin depender de cómo estén keyeadas las policies
-- de escritura preexistentes.
drop policy if exists exercises_base_super_admin_all on public.exercises_base;
create policy exercises_base_super_admin_all on public.exercises_base
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists sessions_super_admin_all on public.sessions;
create policy sessions_super_admin_all on public.sessions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists training_plans_super_admin_all on public.training_plans;
create policy training_plans_super_admin_all on public.training_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ── 5. delete_gym_cascade: las filas de catálogo (gym_id NULL) ya quedan fuera ──
-- delete_gym_cascade (última versión en 20260616190000) borra y encola Cloudinary
-- SOLO `where gym_id = p_gym_id`. Como las filas de catálogo tienen gym_id NULL,
-- nunca matchean: no se borran ni se encola su media compartida al eliminar un gym.
-- No requiere cambios; se documenta acá la garantía.
