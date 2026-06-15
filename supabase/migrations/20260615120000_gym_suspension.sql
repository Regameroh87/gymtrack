-- Suspensión de gimnasios (soft, reversible, en cascada).
-- Igual que profiles.is_active da de baja a una persona, gyms.is_active suspende
-- al gimnasio entero. Como TODO el acceso a datos del gym pasa por auth_gym_ids(),
-- is_staff_of() e is_admin_of() (que ya filtran memberships.status='active'),
-- sumar el chequeo de g.is_active a esas tres funciones corta de una sola vez el
-- acceso a gyms, exercises_base, equipment, sessions, training_plans,
-- plan_assignments, attendances, qr tokens y todos los árboles de planes/logs.
-- No se borra nada: reactivar (is_active=true) restablece todo intacto.
-- Solo el super_admin puede flipear el flag (policy gyms_update ya existente).

-- Flag de actividad del gym (gyms creados antes de esta migración quedan activos).
alter table public.gyms
  add column if not exists is_active boolean not null default true;

-- ── Helpers de rol/scope: ahora excluyen gyms suspendidos ──────────────────
-- El super_admin conserva el bypass: debe poder ver/gestionar gyms suspendidos
-- para reactivarlos.

create or replace function public.auth_gym_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select m.gym_id
  from public.memberships m
  join public.gyms g on g.id = m.gym_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and g.is_active;
$$;

create or replace function public.is_staff_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'coach')
      and gg.is_active
  );
$$;

create or replace function public.is_admin_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin')
      and gg.is_active
  );
$$;

-- ── gyms_select: desacoplado de auth_gym_ids() ─────────────────────────────
-- El cliente necesita poder LEER su gym aunque esté suspendido, para detectar
-- is_active=false y forzar el cierre de sesión. Por eso esta policy usa un
-- EXISTS directo sobre memberships, independiente de gyms.is_active. El resto
-- de las tablas (datos del gym) sí quedan cortadas vía los helpers de arriba.
drop policy if exists gyms_select on public.gyms;
create policy gyms_select on public.gyms
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.gym_id = gyms.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );
