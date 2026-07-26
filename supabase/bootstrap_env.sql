-- Bootstrap de un entorno nuevo (dev / staging).
--
-- El baseline (migrations/20260725160000_baseline.sql) reproduce el ESQUEMA de
-- prod: tablas, policies, funciones, triggers, índices, RLS. Verificado contra
-- prod el 2026-07-25 — 44 tablas, 157 policies, 38 funciones, 40 triggers.
--
-- Lo de acá NO está en el baseline porque son DATOS, y pg_dump --schema-only no
-- los toca. Sin esto un entorno nuevo levanta con el esquema correcto pero sin
-- cron jobs, sin bucket de media y sin plan de suscripción (el checkout de MP
-- devuelve 422 si no hay una fila activa en saas_plans).
--
-- Orden: correr DESPUÉS de aplicar el baseline.
--
-- OJO — antes de correr esto revisá `cleanup-media` al final del archivo:
-- necesita la URL y el service_role key DEL PROYECTO NUEVO. Si copiás los de
-- prod, el cron de dev le borra los medios a producción.

-- ── 1. Storage: bucket de media ──────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 62914560,
  '{image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,video/mp4,video/quicktime,video/webm}'
)
on conflict (id) do nothing;

drop policy if exists media_images_insert_authenticated on storage.objects;
create policy media_images_insert_authenticated
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = any (array['images', 'videos'])
  );

-- ── 2. Seed: plan de suscripción SaaS ────────────────────────────────────────
-- Sin una fila is_active, POST /api/saas/checkout corta con 422.
--
-- El guard es `where not exists` y NO `on conflict do nothing`: saas_plans no
-- tiene constraint única sobre la que hacer conflict, así que el on conflict no
-- hacía nada y cada corrida insertaba un plan más. Con dos planes activos el
-- checkout no explota (toma el primero por created_at) pero cuál cobra pasa a
-- depender del orden de inserción, que es exactamente lo que no querés en una
-- tabla de precios.
insert into public.saas_plans (name, price, currency, trial_days, is_active)
select 'Pro', 60000.00, 'ARS', 14, true
 where not exists (select 1 from public.saas_plans where is_active);

-- ── 3. Cron jobs ─────────────────────────────────────────────────────────────
-- Los 9 jobs de pg_cron de prod. cron.schedule es upsert por jobname, así que
-- correr esto dos veces es inofensivo.

select cron.schedule('expire-saas-trials', '0 * * * *', $cronjob$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'trialing'
       and not cancel_at_period_end
       and ( (trial_ends_at < now() and mp_preapproval_id is null)
          or  trial_ends_at < now() - interval '3 days' );
  $cronjob$);

select cron.schedule('expire-saas-pending', '20 * * * *', $cronjob$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'pending'
       and mp_preapproval_id is not null
       and not cancel_at_period_end
       and updated_at < now() - interval '3 days';
  $cronjob$);

select cron.schedule('expire-saas-past-due', '30 0 * * *', $cronjob$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'past_due'
       and not cancel_at_period_end
       and updated_at < now() - interval '30 days';
  $cronjob$);

select cron.schedule('finalize-canceled-subscriptions', '15 * * * *', $cronjob$
    update public.gym_saas_subscriptions
       set status      = 'canceled',
           canceled_at = coalesce(canceled_at, now()),
           updated_at  = now()
     where cancel_at_period_end
       and status in ('trialing', 'active', 'past_due')
       and access_until is not null
       and access_until <= now();
  $cronjob$);

select cron.schedule('suspend-expired-self-service', '45 0 * * *', $cronjob$
    update public.gyms g
       set is_active = false
      from public.gym_saas_subscriptions s
     where s.gym_id = g.id
       and g.created_via = 'self_service'
       and g.is_active
       and s.status = 'expired'
       and s.mp_preapproval_id is null
       and s.updated_at < now() - interval '30 days';

    delete from public.self_service_signup_attempts
     where created_at < now() - interval '7 days';
  $cronjob$);

select cron.schedule('purge-unconfirmed-orphans', '15 1 * * *', $cronjob$
    delete from auth.users u
     where u.email_confirmed_at is null
       and u.created_at < now() - interval '7 days'
       and not exists (select 1 from public.profiles p where p.user_id = u.id)
       and not exists (select 1 from public.memberships m where m.user_id = u.id);
  $cronjob$);

select cron.schedule('purge-archived-catalog-plans', '0 4 * * *',
  $cronjob$ select public.purge_archived_catalog_plans(30); $cronjob$);

select cron.schedule('purge-soft-deleted', '30 6 * * *',
  $cronjob$ select public.purge_soft_deleted(); $cronjob$);

-- ── 4. cleanup-media: REQUIERE DOS PASOS MANUALES ────────────────────────────
-- Este job invoca una edge function por HTTP, así que necesita la URL del
-- proyecto y un service_role key.
--
-- pg_cron corre DENTRO de Postgres y no tiene acceso a los secrets de las edge
-- functions (esos viven en el runtime de Deno). Por eso el key tiene que estar
-- disponible desde la base. La forma correcta es Vault, NO hardcodearlo en el
-- comando: cron.job.command es texto plano legible por cualquiera que pueda
-- consultar esa tabla. Prod arrancó con el key incrustado y se migró a Vault el
-- 2026-07-25.
--
-- El key NO se replica en este archivo a propósito: pegarlo acá lo filtraría a
-- git, y copiar el de prod haría que el cron de dev borre medios de producción.

-- 4.a — Guardar el service_role key DEL PROYECTO NUEVO en Vault.
--       Sale de: Project Settings → API → service_role.
--       Correr esto aparte, reemplazando el placeholder:
--
-- select vault.create_secret(
--   '<SERVICE_ROLE_KEY_DEL_PROYECTO_NUEVO>',
--   'service_role_key',
--   'service_role JWT que usa el cron cleanup-media'
-- );

-- 4.b — Agendar el job leyendo el key de Vault en cada ejecución.
--       Reemplazar <PROJECT_REF> por el ref del proyecto nuevo.
--
-- select cron.schedule('cleanup-media', '0 6 * * *', $cronjob$select
--   net.http_post(
--       url:='https://<PROJECT_REF>.supabase.co/functions/v1/cleanUp-media',
--       headers:=jsonb_build_object(
--         'Authorization',
--         'Bearer ' || (select decrypted_secret
--                         from vault.decrypted_secrets
--                        where name = 'service_role_key')
--       ),
--       timeout_milliseconds:=4996
--   );$cronjob$);
--
-- Verificación: el job corre como el rol `postgres`, así que confirmá que ese
-- rol puede leer el secret antes de dar por bueno el cambio —si no, falla en
-- silencio a la hora agendada:
--
--   set local role postgres;
--   select length((select decrypted_secret from vault.decrypted_secrets
--                   where name = 'service_role_key'));
