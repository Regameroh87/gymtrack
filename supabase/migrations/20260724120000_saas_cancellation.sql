-- Baja de la suscripción SaaS pedida por el owner desde el panel.
--
-- Semántica: "cancelar al fin del período pagado". Al pedir la baja se cancela
-- el preapproval en MercadoPago (no se cobra nunca más) pero el gym sigue
-- escribiendo hasta access_until — la fecha hasta la que ya pagó. Recién ahí
-- pasa a solo-lectura.
--
-- Por qué access_until explícito y no derivarlo: la fecha correcta depende del
-- status al momento de la baja (current_period_end si estaba active,
-- trial_ends_at si estaba trialing) y ese status cambia después. Congelarlo en
-- una columna deja el gate con una sola comparación y sin ambigüedad.
--
-- El status NO se toca al pedir la baja: sigue en active/trialing hasta que
-- vence. Un status 'canceled' inmediato dejaría el gym en solo-lectura el mismo
-- día, que es justo lo que este cambio viene a evitar.

-- ── 1. Columnas de baja ──────────────────────────────────────────────────────

alter table public.gym_saas_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancel_requested_at  timestamptz,
  add column if not exists cancel_reason        text,
  add column if not exists cancel_feedback      text,
  add column if not exists access_until         timestamptz;

comment on column public.gym_saas_subscriptions.cancel_at_period_end is
  'Baja pedida: no se cobra más, pero el gym escribe hasta access_until.';
comment on column public.gym_saas_subscriptions.access_until is
  'Fin del acceso de escritura, congelado al pedir la baja. NULL = sin baja pendiente.';

-- Índice para el cron que finaliza las bajas vencidas.
create index if not exists gym_saas_subscriptions_cancel_pending_idx
  on public.gym_saas_subscriptions (access_until)
  where cancel_at_period_end;

-- ── 2. Gate: cortar por fecha, no esperar al cron ────────────────────────────
-- El cron de abajo normaliza el status para la UI, pero corre cada hora: si el
-- gate dependiera de él, el gym escribiría hasta 60 minutos de más. La fecha se
-- evalúa acá para que el corte sea exacto.

create or replace function public.is_saas_subscription_active(p_gym_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_status               text;
  v_cancel_at_period_end boolean;
  v_access_until         timestamptz;
begin
  if public.is_super_admin() is not true then
    select status, cancel_at_period_end, access_until
      into v_status, v_cancel_at_period_end, v_access_until
    from public.gym_saas_subscriptions
    where gym_id = p_gym_id;

    if found then
      if v_cancel_at_period_end
         and v_access_until is not null
         and v_access_until <= now() then
        return false;
      end if;
      return v_status in ('trialing', 'active');
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.is_saas_subscription_active(uuid) from public, anon;
grant execute on function public.is_saas_subscription_active(uuid) to authenticated, service_role;

-- ── 3. Cron: finalizar las bajas vencidas ────────────────────────────────────
-- Solo normaliza el status para que la UI muestre "Cancelado". El bloqueo real
-- ya lo hizo el gate al pasar access_until.

select cron.unschedule('finalize-canceled-subscriptions')
where exists (select 1 from cron.job where jobname = 'finalize-canceled-subscriptions');

select cron.schedule(
  'finalize-canceled-subscriptions',
  '15 * * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status      = 'canceled',
           canceled_at = coalesce(canceled_at, now()),
           updated_at  = now()
     where cancel_at_period_end
       and status in ('trialing', 'active', 'past_due')
       and access_until is not null
       and access_until <= now();
  $cron$
);

-- ── 4. Que los crons de expiración no pisen una baja programada ──────────────
-- Ambos jobs miran status + antigüedad y dejarían la fila en 'expired' en vez de
-- 'canceled', perdiendo el motivo de baja y mostrando "venció" a alguien que se
-- dio de baja a propósito.

-- 4.a expire-saas-trials: una baja durante el trial cae en la rama de los 3 días.
select cron.unschedule('expire-saas-trials')
where exists (select 1 from cron.job where jobname = 'expire-saas-trials');

select cron.schedule(
  'expire-saas-trials',
  '0 * * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'trialing'
       and not cancel_at_period_end
       and ( (trial_ends_at < now() and mp_preapproval_id is null)
          or  trial_ends_at < now() - interval '3 days' );
  $cron$
);

-- 4.b expire-saas-past-due: una baja pedida desde past_due cae a los 30 días.
select cron.unschedule('expire-saas-past-due')
where exists (select 1 from cron.job where jobname = 'expire-saas-past-due');

select cron.schedule(
  'expire-saas-past-due',
  '30 0 * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'past_due'
       and not cancel_at_period_end
       and updated_at < now() - interval '30 days';
  $cron$
);
