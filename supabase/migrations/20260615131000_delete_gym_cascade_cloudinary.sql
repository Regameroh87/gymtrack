-- Limpieza de assets de Cloudinary al borrar un gym.
--
-- delete_gym_cascade (ver 20260615130000) borraba el gym y su contenido pero dejaba
-- huérfanos en Cloudinary el logo, las imágenes/videos de ejercicios, las portadas de
-- sesiones/planes, las imágenes de equipamiento y (para socios que quedan sin ningún
-- gym) su avatar y contenido custom. No hay trigger que dispare sync-cloudinary-webhook,
-- así que nada se limpiaba.
--
-- Solución: encolar los public_id en public.cloudinary_delete_queue dentro de la misma
-- transacción del borrado. El cron diario `cleanup-pending-cloudinary` ejecuta la edge
-- function cleanUp-cloudinary, que procesa esa cola y borra los assets con reintentos.
-- Las columnas guardan el public_id con prefijo de carpeta (images/xxx, videos/xxx),
-- idéntico a lo que la cola y el cron esperan, así que se insertan tal cual.
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

  -- Borrado en orden de dependencias.
  delete from session_logs   where gym_id = p_gym_id;  -- -> session_set_logs
  delete from sessions       where gym_id = p_gym_id;  -- -> session_exercises
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;   -- -> resto del árbol (cascade)

  -- user_id que ya no tienen membership en ningún gym.
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (
    select 1 from memberships m where m.user_id = uid
  );

  -- Encolar assets personales de los socios huérfanos (sus filas aún existen; la edge
  -- function eliminar-gym borra esas cuentas auth después, arrastrando profiles/custom_*).
  -- Las custom_* son user-scoped: se filtran por huérfano para no borrar contenido de
  -- socios que siguen en otro gym.
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
