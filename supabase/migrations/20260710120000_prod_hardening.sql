-- Hardening pre-producción (auditoría de advisors de Supabase).
--
-- 1) El bucket público "media" no necesita policy de SELECT: las URLs públicas
--    se sirven sin RLS y el sweep de cleanUp-media usa service role. La policy
--    solo habilitaba que cualquier cliente LISTE el bucket entero.
--
-- 2) Las funciones SECURITY DEFINER expuestas por la API REST se restringen al
--    mínimo rol necesario (por defecto Postgres da EXECUTE a PUBLIC):
--    - Públicas por diseño (quedan como están): email_exists (login OTP),
--      get_public_gym y list_public_gyms (páginas públicas del sitio).
--    - Solo authenticated: check_in_with_qr (valida auth.uid() + membresía),
--      los helpers de RLS (los evalúan las policies como el rol que consulta)
--      y las RPCs de catálogo (ya tienen guarda interna is_platform_staff();
--      el revoke de anon es defensa en profundidad).
--    - Solo service_role / owner: mantenimiento que corre el cron o las edge
--      functions. purge_soft_deleted y purge_archived_catalog_plans NO tenían
--      guarda interna y eran ejecutables por anon — este es el fix real.
--
-- Aceptado y documentado: media_delete_queue tiene RLS sin policies a propósito
-- (solo la toca el service role, que bypassea RLS).

-- ── 1. Bucket media: fuera el listado público ────────────────────────────────
drop policy if exists "media_select_public" on storage.objects;

-- ── 2. Solo authenticated ────────────────────────────────────────────────────
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'check_in_with_qr(text)',
    -- helpers de RLS
    'auth_gym_ids()',
    'auth_profile_id()',
    'is_admin_of(uuid)',
    'is_staff_of(uuid)',
    'is_super_admin()',
    'is_platform_admin()',
    'is_platform_staff()',
    'platform_staff_role()',
    'shares_gym_with(uuid)',
    'user_in_admin_gym(uuid)',
    'user_in_staff_gym(uuid)',
    -- catálogo (guarda interna is_platform_staff)
    'archive_catalog_plan(text)',
    'restore_catalog_plan(text)',
    'delete_catalog_plan(text)',
    'delete_catalog_session(text)',
    'list_archived_catalog_plans()',
    'save_catalog_plan(jsonb)',
    'save_catalog_session(jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated, service_role', fn);
  end loop;
end $$;

-- ── 3. Solo mantenimiento (cron corre como owner; edge functions usan
--       service_role, p. ej. eliminar-gym → delete_gym_cascade) ───────────────
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'purge_soft_deleted()',
    'purge_archived_catalog_plans(integer)',
    'delete_gym_cascade(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to service_role', fn);
  end loop;
end $$;
