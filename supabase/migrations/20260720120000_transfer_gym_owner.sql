-- Transferencia del dueño de un gimnasio (panel de plataforma).
--
-- Hasta ahora el owner solo se podía fijar en el alta (edge function crear-gym)
-- y no había forma de cambiarlo: si un gym cambiaba de manos, la única salida
-- era tocar la base a mano.
--
-- El problema de fondo es que "el dueño" vive en DOS lugares que nadie mantiene
-- sincronizados:
--   - gyms.owner_id          → solo display/lookup en el panel web.
--   - memberships.role='owner' → los permisos reales (is_owner_of, is_admin_of,
--                                is_staff_of, auth_gym_ids leen de acá).
-- Escribir solo owner_id cambia lo que muestra el panel sin otorgar ningún
-- permiso; escribir solo la membership deja el panel mostrando al dueño viejo.
-- Por eso la transferencia es un RPC atómico y no un campo más del form: las
-- tres escrituras (gym + membership vieja + membership nueva) van juntas o no va
-- ninguna. Un cliente que las hiciera sueltas puede cortarse en el medio y dejar
-- un gym sin dueño, o con dos.
--
-- p_previous_action decide qué pasa con el dueño saliente:
--   'demote' → baja a admin (conserva acceso y puede seguir operando).
--   'remove' → se le quita la membresía de este gym.

-- ── 1. Un solo owner por gym ────────────────────────────────────────────────
-- Verificado antes de crear el índice: no hay gyms con más de una membership
-- 'owner'. Vuelve imposible (no solo improbable) el estado divergente que este
-- RPC evita, incluso si alguien escribe memberships por fuera.
create unique index if not exists memberships_one_owner_per_gym
  on public.memberships (gym_id)
  where role = 'owner';

-- ── 2. RPC de transferencia ─────────────────────────────────────────────────
-- SECURITY DEFINER porque toca gyms y memberships de un gym en el que quien
-- llama (staff de plataforma) no tiene membresía. La autorización NO viene de
-- las policies sino del guard explícito de acá abajo.
--
-- Se invoca con el JWT de quien llama (nunca con service_role): auth.uid() debe
-- resolver para que is_platform_admin() funcione y added_by quede bien atribuido.
create or replace function public.transfer_gym_owner(
  p_gym_id          uuid,
  p_new_owner_id    uuid,
  p_previous_action text default 'demote'
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_current_owner uuid;
  v_actor         uuid := auth.uid();
begin
  -- `is not true` y no `not (...)`: is_platform_admin() devuelve NULL cuando
  -- quien llama no tiene profile (platform_staff_role() es NULL y
  -- `false or NULL` = NULL). Con `if not NULL then` la condición es NULL, el
  -- raise NO se ejecuta y el guard se saltea en silencio. En una policy RLS un
  -- NULL deniega; acá, al revés, dejaría pasar.
  if public.is_platform_admin() is not true then
    raise exception 'No autorizado';
  end if;

  if p_previous_action not in ('demote', 'remove') then
    raise exception 'Acción inválida para el dueño anterior: %', p_previous_action;
  end if;

  -- Lock de la fila: dos transferencias simultáneas del mismo gym se serializan
  -- en vez de pisarse.
  select owner_id into v_current_owner
  from public.gyms
  where id = p_gym_id
  for update;

  if not found then
    raise exception 'Gimnasio inexistente';
  end if;

  if not exists (select 1 from public.profiles where user_id = p_new_owner_id) then
    raise exception 'La persona indicada no tiene perfil en la plataforma';
  end if;

  if v_current_owner = p_new_owner_id then
    raise exception 'Esa persona ya es la dueña de este gimnasio';
  end if;

  update public.gyms
  set owner_id = p_new_owner_id
  where id = p_gym_id;

  -- El dueño saliente se resuelve ANTES de insertar al nuevo: si sigue con
  -- role='owner' cuando entra el nuevo, choca contra el índice único de arriba.
  if v_current_owner is not null then
    if p_previous_action = 'demote' then
      update public.memberships
      set role = 'admin', updated_at = now()
      where gym_id = p_gym_id and user_id = v_current_owner;
    else
      delete from public.memberships
      where gym_id = p_gym_id and user_id = v_current_owner;
    end if;
  end if;

  -- upsert: cubre tanto a alguien de afuera del gym como a un miembro existente
  -- que se promueve (el unique (user_id, gym_id) haría fallar un insert pelado).
  insert into public.memberships (user_id, gym_id, role, status, added_by)
  values (p_new_owner_id, p_gym_id, 'owner', 'active', v_actor)
  on conflict (user_id, gym_id) do update
    set role = 'owner', status = 'active', updated_at = now();
end;
$$;

revoke all on function public.transfer_gym_owner(uuid, uuid, text) from public, anon;
grant execute on function public.transfer_gym_owner(uuid, uuid, text) to authenticated, service_role;

comment on function public.transfer_gym_owner(uuid, uuid, text) is
  'Transfiere un gimnasio a un nuevo dueño de forma atómica: gyms.owner_id + membership del saliente (demote/remove) + membership owner del entrante. Solo staff admin de plataforma.';
