-- Borrado de un ejercicio del catálogo con cascada del historial de series.
--
-- Contexto: session_set_logs.exercise_id y session_exercises.exercise_id
-- referencian exercises_base con ON DELETE NO ACTION, así que cualquier serie
-- registrada por un socio bloquea el borrado con 23503 para siempre.
--
-- La cascada no puede hacerse desde el cliente: la policy session_set_logs_write
-- solo permite borrar los logs propios o los del gym donde sos staff, de modo que
-- un platform staff sin is_super_admin borraba 0 filas en silencio y después
-- chocaba igual contra la FK. Por eso va como SECURITY DEFINER, siguiendo el
-- mismo patrón de delete_catalog_plan / delete_catalog_session.
--
-- session_exercises NO se limpia a propósito: sacar el ejercicio de las sesiones
-- de un gimnasio es una decisión del staff de ese gym, no un efecto colateral del
-- borrado en el catálogo. Si quedan referencias, la función aborta con el conteo.

create or replace function public.delete_catalog_exercise(p_exercise_id text)
  returns void
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
  as $$
declare
  v_sessions int;
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  select count(*) into v_sessions
  from public.session_exercises
  where exercise_id = p_exercise_id;

  if v_sessions > 0 then
    raise exception 'ejercicio % en uso en % sesion(es): quitarlo de esas sesiones primero',
      p_exercise_id, v_sessions;
  end if;

  -- Historial de series de todos los socios que alguna vez lo registraron.
  delete from public.session_set_logs where exercise_id = p_exercise_id;

  delete from public.exercises_base
  where id = p_exercise_id and is_catalog = true;
end;
$$;

alter function public.delete_catalog_exercise(text) owner to postgres;

grant all on function public.delete_catalog_exercise(text) to authenticated;
grant all on function public.delete_catalog_exercise(text) to service_role;
