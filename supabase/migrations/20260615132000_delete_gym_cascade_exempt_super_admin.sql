-- Excluir super_admins del borrado de cuentas al eliminar un gym.
--
-- delete_gym_cascade devuelve los user_id que quedan sin ningún gym para que la edge
-- function eliminar-gym borre sus cuentas auth. Pero un super_admin administra desde el
-- panel y puede no tener (o perder) membership sin que eso implique borrar su cuenta;
-- si además fuera miembro del gym borrado, se auto-eliminaría. Acá se los exceptúa: su
-- membership igual cae por cascade, pero su cuenta auth (y sus assets) se conservan.
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

  -- Huérfanos: sin membership en ningún gym Y que NO sean super_admin.
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
