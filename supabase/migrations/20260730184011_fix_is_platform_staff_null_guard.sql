-- Cierra un bypass del control de acceso al catálogo de la plataforma.
--
-- is_platform_staff() era:
--   select public.is_super_admin() or public.platform_staff_role() in ('admin','coach');
--
-- Para cualquier usuario autenticado que no fuera staff, platform_staff_role()
-- devuelve NULL (la columna es nula para los no-staff), y `NULL in (...)` es NULL,
-- así que la función devolvía `false or NULL` = NULL, no false.
--
-- El patrón de guard del proyecto es `if not public.is_platform_staff() then raise`.
-- En plpgsql `not NULL` es NULL, y un `if NULL then` NO ejecuta la rama: el raise
-- nunca disparaba. Como las 8 funciones son SECURITY DEFINER (saltean RLS) y tienen
-- EXECUTE para `authenticated`, cualquier socio logueado podía borrar o escribir el
-- catálogo de la plataforma —y con delete_catalog_exercise, el historial de series
-- de todos los usuarios.
--
-- Las policies RLS que llaman is_platform_staff() NO estaban afectadas: en un USING,
-- NULL no es true y deniega. El agujero era exclusivo del patrón `if not ...`.

-- ── Capa 1: la función base nunca más devuelve NULL ─────────────────────────

create or replace function public.is_platform_staff()
  returns boolean
  language sql
  stable security definer
  set search_path to 'public', 'pg_temp'
  as $$
  select coalesce(public.is_super_admin(), false)
      or coalesce(public.platform_staff_role() in ('admin', 'coach'), false);
$$;

-- ── Capa 2: los guards dejan de depender de eso ─────────────────────────────
--
-- Defensa en profundidad: si alguien vuelve a tocar is_platform_staff() y
-- reintroduce un NULL, los llamadores siguen denegando. Se reescribe solo la
-- línea del guard sobre la definición vigente de cada función, de modo que los
-- cuerpos quedan intactos (varios son largos y copiarlos a mano es peor).
--
-- Alcanza a: archive_catalog_plan, delete_catalog_exercise, delete_catalog_plan,
-- delete_catalog_session, list_archived_catalog_plans, restore_catalog_plan,
-- save_catalog_plan, save_catalog_session.

do $do$
declare
  r record;
begin
  for r in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosrc like '%not public.is_platform_staff()%'
  loop
    execute replace(
      r.def,
      'if not public.is_platform_staff() then',
      'if not coalesce(public.is_platform_staff(), false) then'
    );
    raise notice 'endurecida: %', r.proname;
  end loop;
end
$do$;
