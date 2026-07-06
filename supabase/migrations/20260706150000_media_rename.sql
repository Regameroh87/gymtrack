-- Fase 3 de la salida de Cloudinary: ya no queda ningún asset ni referencia a
-- Cloudinary (los existentes fueron migrados al bucket "media" de Supabase
-- Storage y los originales destruidos). Este rename saca el nombre del
-- proveedor de la infraestructura:
--   - cloudinary_delete_queue        → media_delete_queue
--   - edge function sync-cloudinary-webhook → sync-media-webhook
--   - edge function cleanUp-cloudinary      → cleanUp-media
-- Los triggers "sync-cloudinary-assets-*" y el cron "cleanup-pending-cloudinary"
-- viven fuera de las migraciones (se configuran contra la instancia, con la URL
-- del proyecto y su service key); se renombran a "sync-media-assets-*" y
-- "cleanup-media" apuntando a las funciones nuevas.

alter table if exists public.cloudinary_delete_queue
  rename to media_delete_queue;

-- delete_gym_cascade: idéntica a la versión vigente, con la cola renombrada.
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
  -- Miembros del gym ANTES del borrado (para evaluar huérfanos después).
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  -- Encolar assets del gym ANTES de borrar las filas que los referencian.
  -- video_uri -> 'video'; el resto -> 'image'. UNIQUE(public_id) => on conflict skip.
  insert into media_delete_queue (public_id, resource_type)
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

  -- Borrado en orden de dependencias.
  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  -- user_id que ya no tienen membership en ningún gym (super_admins exentos).
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  -- Encolar assets personales de los socios huérfanos (sus filas aún existen; la
  -- edge function eliminar-gym borra esas cuentas auth después).
  if array_length(v_orphans, 1) is not null then
    insert into media_delete_queue (public_id, resource_type)
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
