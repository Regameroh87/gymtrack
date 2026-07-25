-- Precio inicial del plan Pro (placeholder; actualizar en Supabase dashboard o
-- via la app de plataforma antes de hacer onboarding de gyms de pago).
-- Cambiar al valor real antes de activar el cobro en MP.

update public.saas_plans
   set price = 5000.00, currency = 'ARS'
 where name = 'Pro' and price is null;

-- Cron: past_due → expired después de 30 días de gracia sin pago.
-- MP reintenta el cobro automáticamente; si tras 30 días sigue fallando,
-- bloqueamos el gym completamente (expired).

select cron.unschedule('expire-saas-past-due')
where exists (select 1 from cron.job where jobname = 'expire-saas-past-due');

select cron.schedule(
  'expire-saas-past-due',
  '30 0 * * *',   -- 00:30 UTC diario
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'past_due'
       and updated_at < now() - interval '30 days';
  $cron$
);
