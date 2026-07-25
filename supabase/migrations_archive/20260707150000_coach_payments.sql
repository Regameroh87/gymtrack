-- Pagos a coaches: historial manual de lo que el gym le paga a cada coach por
-- período, con snapshot del desglose calculado (fijo + % de ingresos + clases ×
-- tarifa). Sin único por período: se permiten pagos parciales/múltiples; la UI
-- muestra saldo = calculado − pagado.
--
-- Entidad ONLINE (panel admin): no entra al sync offline.

create table public.coach_payments (
  id                   uuid primary key default gen_random_uuid(),
  gym_id               uuid not null references public.gyms(id) on delete cascade,
  coach_id             uuid not null references public.profiles(id) on delete cascade,
  period_start         date not null,   -- 1° del mes en la UI actual
  period_end           date not null,
  fixed_amount         numeric(10,2) not null default 0,  -- snapshot del desglose al pagar
  revenue_share_amount numeric(10,2) not null default 0,
  classes_count        integer not null default 0,
  classes_amount       numeric(10,2) not null default 0,
  total_amount         numeric(10,2) not null,            -- lo efectivamente pagado (editable)
  notes                text,
  paid_at              timestamptz not null default now(),
  registered_by        uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  constraint coach_payments_period_valid check (period_start <= period_end),
  constraint coach_payments_total_positive check (total_amount >= 0)
);

create index coach_payments_gym_period_idx
  on public.coach_payments (gym_id, period_start);
create index coach_payments_coach_idx
  on public.coach_payments (coach_id, period_start);

alter table public.coach_payments enable row level security;

-- SELECT: el coach ve SUS pagos; admin/owner, todos. (Un coach no ve lo que
-- cobran otros coaches.)
create policy coach_payments_select on public.coach_payments
  for select using (
    coach_id = public.auth_profile_id() or public.is_admin_of(gym_id)
  );

-- WRITE: solo admin/owner registra pagos.
create policy coach_payments_admin_write on public.coach_payments
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- ── Cálculo de lo que corresponde pagar por período ──
-- Devuelve, por coach del gym, el desglose del período [p_from, p_to]:
--   fixed_total   → suma de fijos mensuales de sus asignaciones activas
--   revenue_total → suma de (% × cobros de la actividad en el período)
--   classes_*     → clases dictadas en el período × tarifa por clase.
--                   Dictada = completed, o scheduled con fecha pasada (una clase
--                   pasada cuenta salvo cancelada). Sin tarifa asignada ⇒ $0.
-- Admin/owner ven todos los coaches; un coach solo su propia fila.
create or replace function public.coach_payment_summary(
  p_gym_id uuid,
  p_from   date,
  p_to     date
) returns table (
  coach_id      uuid,
  fixed_total   numeric,
  revenue_total numeric,
  classes_count integer,
  classes_total numeric,
  total         numeric
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_staff_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;

  return query
  with fixed as (
    select ac.coach_id as cid, sum(ac.monthly_fee) as amt
    from public.activity_coaches ac
    where ac.gym_id = p_gym_id and ac.is_active and ac.monthly_fee is not null
    group by ac.coach_id
  ),
  rev as (
    select ac.coach_id as cid,
           sum(sp.amount * ac.revenue_share_pct / 100) as amt
    from public.activity_coaches ac
    join public.subscription_payments sp
      on sp.activity_id = ac.activity_id
     and sp.paid_at between p_from and p_to
    where ac.gym_id = p_gym_id and ac.is_active
      and ac.revenue_share_pct is not null
    group by ac.coach_id
  ),
  cls as (
    select c.coach_id as cid,
           count(*)::integer as cnt,
           sum(coalesce(ac.rate_per_class, 0)) as amt
    from public.activity_classes c
    left join public.activity_coaches ac
      on ac.activity_id = c.activity_id
     and ac.coach_id = c.coach_id
     and ac.is_active
    where c.gym_id = p_gym_id
      and c.coach_id is not null
      and c.date between p_from and p_to
      and (c.status = 'completed'
           or (c.status = 'scheduled' and c.date <= current_date))
    group by c.coach_id
  )
  select coalesce(f.cid, r.cid, c.cid) as coach_id,
         coalesce(f.amt, 0) as fixed_total,
         coalesce(r.amt, 0) as revenue_total,
         coalesce(c.cnt, 0) as classes_count,
         coalesce(c.amt, 0) as classes_total,
         coalesce(f.amt, 0) + coalesce(r.amt, 0) + coalesce(c.amt, 0) as total
  from fixed f
  full join rev r on r.cid = f.cid
  full join cls c on c.cid = coalesce(f.cid, r.cid)
  where public.is_admin_of(p_gym_id)
     or coalesce(f.cid, r.cid, c.cid) = public.auth_profile_id();
end;
$$;
