-- Sacar las funciones de cobranza nuevas del API público.
--
-- Postgres otorga EXECUTE a PUBLIC en cada CREATE FUNCTION, y agregar el grant a
-- authenticated no saca ese default. Las funciones creadas en las migraciones de
-- aniversario quedaron con la entrada `=X/postgres` en su ACL, que las de antes
-- (set_training_access, member_training_access) no tienen.
--
-- OJO: revocar a `anon` NO alcanza. anon hereda el privilegio de PUBLIC, así que
-- un `revoke ... from anon` se aplica a un grant directo que no existe y deja el
-- de PUBLIC intacto — has_function_privilege('anon', …) sigue dando true. Hay que
-- revocarle a PUBLIC.
--
-- El caso que importa es set_billing_settings, que es SECURITY DEFINER y por eso
-- la marca el linter 0028 de Supabase. Sin sesión igual tira 42501 —auth.uid() es
-- null y no matchea ninguna membership— así que no había un agujero, pero no
-- tiene por qué estar expuesta.
revoke all on function public.set_billing_settings(uuid, boolean) from public;

-- El RPC de cobro no es SECURITY DEFINER (corre con los permisos del que llama y
-- valida has_gym_permission), así que anon nunca podría cobrar. Se lo saca igual
-- del API público por consistencia.
--
-- Este necesita las DOS revocaciones y no una: además del EXECUTE de PUBLIC tiene
-- un grant DIRECTO a anon, que viene de las default privileges que Supabase deja
-- puestas sobre el esquema public. Son dos mecanismos distintos y revocar uno no
-- toca el otro.
revoke all on function public.register_subscription_payment(uuid, integer, numeric, text) from public;
revoke all on function public.register_subscription_payment(uuid, integer, numeric, text) from anon;

-- Los helpers de ciclos son aritmética pura sobre sus argumentos: no leen tablas
-- ni miran la sesión. No son un riesgo, pero tampoco son RPC — los usa
-- member_pending_charges y el RPC de cobro desde adentro de la base.
revoke all on function public.subscription_month_index(date, date) from public;
revoke all on function public.subscription_period(date, integer) from public;
revoke all on function public.subscription_cycle_index(date, date) from public;
