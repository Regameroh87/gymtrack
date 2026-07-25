-- Limpieza de usuarios Auth huérfanos sin confirmar.
--
-- Cuando alguien tipea mal su email en /registro (signup OTP con
-- shouldCreateUser:true), Supabase crea un auth.users SIN confirmar y manda el
-- código a una dirección equivocada. Si nunca se verifica, ese usuario queda
-- para siempre: no puede loguearse ni acceder a nada, pero se acumula. No se
-- crea gym/profile/membership/sub (eso corre recién en crear-gym-self-service,
-- después de verifyOtp), así que el residuo es solo el auth.users huérfano.
--
-- Este cron borra los que llevan >7 días sin confirmar y sin ningún dato de
-- negocio asociado. Criterio conservador: email_confirmed_at null (al verificar
-- el OTP se setea, así que un alta legítima queda excluida) + sin profile + sin
-- membership. El OTP vence en 1 hora; 7 días es margen de sobra.
--
-- pg_cron corre como postgres (superuser en Supabase), con permisos para
-- borrar de auth.users; las identities/sessions cascadean dentro del schema auth.

select cron.unschedule('purge-unconfirmed-orphans')
where exists (select 1 from cron.job where jobname = 'purge-unconfirmed-orphans');

select cron.schedule(
  'purge-unconfirmed-orphans',
  '15 1 * * *',   -- 01:15 UTC diario
  $cron$
    delete from auth.users u
     where u.email_confirmed_at is null
       and u.created_at < now() - interval '7 days'
       and not exists (select 1 from public.profiles p where p.user_id = u.id)
       and not exists (select 1 from public.memberships m where m.user_id = u.id);
  $cron$
);
