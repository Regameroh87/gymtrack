-- La landing pública lee trial_days del plan activo con la key anon (server-side,
-- sin sesión) vía getPublicTrialDays(). Faltaba darle acceso a saas_plans: la
-- única policy que le aplicaba a anon era saas_plans_super_admin (PUBLIC), que
-- llama is_super_admin() — función sin EXECUTE para anon → la lectura tiraba
-- "permission denied for function is_super_admin" y el copy caía siempre al
-- fallback hardcodeado de 14 días. Se replica el patrón ya usado con
-- platform_settings en 20260722120000_self_service_signup.sql.

-- anon (además de authenticated) lee planes activos. Se conserva el
-- using (is_active = true) del policy original.
alter policy saas_plans_select on public.saas_plans
  to anon, authenticated;

-- El super_admin es siempre authenticated: acotar esta policy a authenticated
-- evita que anon evalúe is_super_admin() (que no puede ejecutar) al escanear
-- filas — incluidas eventuales inactivas donde el OR no cortocircuita.
alter policy saas_plans_super_admin on public.saas_plans
  to authenticated;

grant select on public.saas_plans to anon;
