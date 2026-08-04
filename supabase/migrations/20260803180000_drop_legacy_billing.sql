-- ⚠️ ESTA MIGRACIÓN DEPENDE DEL DEPLOY DE 20260803170000. NO APLICAR ANTES.
--
-- Borra lo que quedó sin uso cuando la cuota pasó a cobrarse por aniversario.
-- Todo lo de acá lo sigue pidiendo el bundle viejo hasta que termine el
-- despliegue: aplicada antes de tiempo, PostgREST le contesta 400 al cobro y a
-- la pantalla de membresías de la app que está corriendo.
--
-- Se manda aparte por eso, siguiendo la convención del repo: el borrado va
-- después de desplegar el código que dejó de leer, nunca en la misma tanda.

-- ── Los RPC de cobro viejos ─────────────────────────────────────────────────
--
-- Los reemplazó register_subscription_payment(uuid, integer, numeric, text), que
-- cobra N ciclos en una transacción, toma `for update` y no acepta un período
-- arbitrario.
--
-- Eran tres, no dos: el baseline dejó dos overloads del singular (con y sin
-- payment_method) más el plural. Los dos overloads del singular son además la
-- razón por la que mobile nunca registró método de pago — PostgREST resuelve por
-- coincidencia exacta de nombres de parámetros, y la llamada de mobile
-- (sin p_payment_method) matcheaba siempre la versión de tres argumentos.
drop function if exists public.register_subscription_payment(uuid, numeric, date);
drop function if exists public.register_subscription_payment(uuid, numeric, date, text);
drop function if exists public.register_subscription_payments(uuid, integer, numeric, text);

-- ── El prorrateo del primer mes ─────────────────────────────────────────────
--
-- Con aniversario el primer ciclo va del día del alta al mismo día del mes
-- siguiente: siempre es un mes completo, así que no hay nada que prorratear. Las
-- dos columnas y su parámetro en el setter quedaron sin lector.
drop function if exists public.set_billing_settings(uuid, boolean, boolean, integer);

create or replace function public.set_billing_settings(
  p_gym_id             uuid,
  p_due_day_is_covered boolean default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not (
    public.is_super_admin() is true
    or exists (
      select 1 from public.memberships m
      where m.gym_id = p_gym_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'admin')
    )
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.gyms
  set due_day_is_covered = coalesce(p_due_day_is_covered, due_day_is_covered),
      updated_at = now()
  where id = p_gym_id;
end;
$$;

alter function public.set_billing_settings(uuid, boolean) owner to postgres;

comment on function public.set_billing_settings(uuid, boolean) is
  'Configura la política de cobranza del gym (por ahora, si el día del vencimiento todavía cuenta como pago). Solo owner/admin del gym (o super_admin).';

grant execute on function public.set_billing_settings(uuid, boolean) to authenticated;

alter table public.gyms drop column if exists prorate_first_month;
alter table public.gyms drop column if exists full_month_until_day;
