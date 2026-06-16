-- Unifica el tipo de user_id en las tablas custom_* a uuid con FK a auth.users.
--
-- Antes: custom_exercises/custom_sessions/custom_plans.user_id era TEXT sin FK,
-- mientras profiles/memberships usan uuid con FK a auth.users. Esa inconsistencia
-- obligaba a castear en delete_gym_cascade (ver 20260616190000) y rompía comparaciones
-- text=uuid. Acá se corrige de raíz:
--   1) se pasan las columnas a uuid (todos los valores ya son uuids válidos y existen
--      en auth.users; verificado: 0 nulls, 0 fuera de formato, 0 huérfanos),
--   2) se agrega FK a auth.users(id) on delete cascade (limpia los items custom cuando
--      se borra la cuenta, igual que el resto de los datos personales),
--   3) se recrean las policies RLS comparando contra auth.uid() (uuid) en vez de
--      (auth.uid())::text,
--   4) se revierte el cast ::text[] en delete_gym_cascade (ya no hace falta).

-- ===== custom_exercises =====
drop policy if exists custom_exercises_select on public.custom_exercises;
drop policy if exists custom_exercises_insert on public.custom_exercises;
drop policy if exists custom_exercises_update on public.custom_exercises;
drop policy if exists custom_exercises_delete on public.custom_exercises;

alter table public.custom_exercises
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_exercises
  add constraint custom_exercises_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_exercises_user_id_idx
  on public.custom_exercises (user_id);

create policy custom_exercises_select on public.custom_exercises
  for select using (user_id = auth.uid());
create policy custom_exercises_insert on public.custom_exercises
  for insert with check (user_id = auth.uid());
create policy custom_exercises_update on public.custom_exercises
  for update using (user_id = auth.uid());
create policy custom_exercises_delete on public.custom_exercises
  for delete using (user_id = auth.uid());

-- ===== custom_sessions =====
drop policy if exists custom_sessions_select on public.custom_sessions;
drop policy if exists custom_sessions_insert on public.custom_sessions;
drop policy if exists custom_sessions_update on public.custom_sessions;
drop policy if exists custom_sessions_delete on public.custom_sessions;

alter table public.custom_sessions
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_sessions
  add constraint custom_sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_sessions_user_id_idx
  on public.custom_sessions (user_id);

create policy custom_sessions_select on public.custom_sessions
  for select using (user_id = auth.uid());
create policy custom_sessions_insert on public.custom_sessions
  for insert with check (user_id = auth.uid());
create policy custom_sessions_update on public.custom_sessions
  for update using (user_id = auth.uid());
create policy custom_sessions_delete on public.custom_sessions
  for delete using (user_id = auth.uid());

-- ===== custom_plans =====
drop policy if exists custom_plans_select on public.custom_plans;
drop policy if exists custom_plans_insert on public.custom_plans;
drop policy if exists custom_plans_update on public.custom_plans;
drop policy if exists custom_plans_delete on public.custom_plans;

alter table public.custom_plans
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_plans
  add constraint custom_plans_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_plans_user_id_idx
  on public.custom_plans (user_id);

create policy custom_plans_select on public.custom_plans
  for select using (user_id = auth.uid());
create policy custom_plans_insert on public.custom_plans
  for insert with check (user_id = auth.uid());
create policy custom_plans_update on public.custom_plans
  for update using (user_id = auth.uid());
create policy custom_plans_delete on public.custom_plans
  for delete using (user_id = auth.uid());

-- ===== revertir el cast ::text[] en delete_gym_cascade =====
-- Ahora custom_*.user_id es uuid, así que v_orphans (uuid[]) compara directo.
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  insert into cloudinary_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  if array_length(v_orphans, 1) is not null then
    insert into cloudinary_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans)
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans)
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;

revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;
