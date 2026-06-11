-- Endurecimiento post-advisors: las funciones de trigger no se llaman por RPC
-- y los helpers RLS no deben ser ejecutables por anon. OJO: authenticated SÍ
-- necesita EXECUTE en los helpers — las policies se evalúan como el caller.
-- email_exists / email_exists_in_gym quedan anon a propósito (pre-check de login).

alter function public.set_updated_at() set search_path = public, pg_temp;

revoke execute on function public.sync_profile_from_membership() from anon, authenticated, public;
revoke execute on function public.guard_profile_self_update() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;

revoke execute on function public.auth_gym_ids() from anon;
revoke execute on function public.auth_gym_id() from anon;
revoke execute on function public.auth_profile_id() from anon;
revoke execute on function public.is_staff_of(uuid) from anon;
revoke execute on function public.is_admin_of(uuid) from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.shares_gym_with(uuid) from anon;
revoke execute on function public.user_in_admin_gym(uuid) from anon;
revoke execute on function public.check_in_with_qr(text) from anon;

-- Solo la corre pg_cron (rol postgres).
revoke execute on function public.purge_soft_deleted() from anon, authenticated;
