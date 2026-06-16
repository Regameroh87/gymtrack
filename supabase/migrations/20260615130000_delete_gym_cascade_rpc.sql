-- Borrado atómico de un gimnasio y todo su contenido (solo backend / service role).
--
-- El DELETE directo sobre gyms confiando en el cascade fallaba: exercises_base es
-- referenciado por FKs ON DELETE NO ACTION (session_exercises.exercise_id y
-- session_set_logs.exercise_id), constraints protectoras que impiden borrar un
-- ejercicio en uso. Al borrar el gym, el cascade intentaba eliminar exercises_base
-- antes/sin eliminar esas referencias y abortaba todo el statement (rollback).
--
-- Esta función borra en orden de dependencias dentro de UNA sola transacción, de modo
-- que cuando se eliminan los exercises_base ya no quedan referencias NO ACTION vivas:
--   1. session_logs   -> cascada session_set_logs (libera su ref a exercises_base)
--   2. sessions       -> cascada session_exercises (libera su ref a exercises_base)
--   3. exercises_base  (ya sin referrers NO ACTION)
--   4. gyms           -> cascada memberships, equipment, attendances, plan_assignments,
--                        training_plans, gym_qr_tokens y sus descendientes (todo CASCADE)
--
-- Devuelve los user_id que tras el borrado ya no pertenecen a ningún gym, para que la
-- edge function eliminar-gym elimine sus cuentas de auth (auth.admin.deleteUser).
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

  return v_orphans;
end;
$$;

-- Solo el backend (service role) la invoca; ningún cliente con JWT debe poder llamarla.
revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;
