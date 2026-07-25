-- Suscripciones huérfanas: el checkout que nunca se autorizó.
--
-- Cada POST /api/saas/checkout crea un preapproval NUEVO en MP y guarda su id en
-- la fila. Si el owner abandona el pago, quedan DOS huérfanos:
--
--   1. la fila, clavada en 'pending' para siempre. Ningún cron la miraba:
--      expire-saas-trials filtra status = 'trialing' y suspend-expired-self-service
--      filtra created_via = 'self_service' AND status = 'expired'.
--
--   2. el preapproval, vivo en MP en estado 'pending'. Si alguien reabre el
--      init_point viejo meses después, MP cobra la tarjeta y el webhook DESCARTA
--      el aviso (la fila ya guarda otro mp_preapproval_id, ver el chequeo de
--      handlePreapprovalEvent) → cobro sin registro. Eso lo limpia el reaper
--      /api/cron/saas-reap-preapprovals, que es quien puede hablar con MP.
--
-- Acá se resuelve (1). Solo se expiran filas que efectivamente arrancaron un
-- checkout (mp_preapproval_id not null): una fila 'pending' sin preapproval es
-- un gym recién dado de alta desde el panel cuyo owner todavía no se suscribió,
-- y expirarla sería castigar un onboarding lento.
--
-- El trial NO se pierde al reintentar: trial_ends_at solo lo escribe el webhook
-- al autorizar, así que una fila expirada por acá lo conserva en NULL y el
-- checkout la trata como "nunca usó el trial". Ver el cálculo de startDate en
-- apps/web/app/api/saas/checkout/route.ts.

select cron.unschedule('expire-saas-pending')
where exists (select 1 from cron.job where jobname = 'expire-saas-pending');

select cron.schedule(
  'expire-saas-pending',
  '20 * * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'pending'
       and mp_preapproval_id is not null
       and not cancel_at_period_end
       -- 3 días, el mismo margen que expire-saas-trials le da a los avisos
       -- demorados de MP. updated_at (y no created_at) porque cada reintento de
       -- checkout toca la fila: quien intentó hoy no se expira mañana.
       and updated_at < now() - interval '3 days';
  $cron$
);
