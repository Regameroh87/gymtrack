-- Permisos por miembro + anulación auditada de pagos.
--
-- Hasta ahora "registrar cobro" era todo-o-nada por rol (solo admin/owner) y no
-- había forma de corregir un error (monto mal tipeado, método equivocado): la
-- fila quedaba en subscription_payments para siempre. El dueño del gym necesita
-- dos cosas que un simple UPDATE no da:
--   1. Decidir persona por persona (no rol por rol) quién puede registrar y
--      quién puede anular cobros — p.ej. confiar en una secretaria puntual sin
--      dárselo a todo el rol admin.
--   2. Corregir errores sin abrir la puerta al fraude: nunca se edita ni borra
--      un pago, se anula (motivo + quién + cuándo, visible en el historial) y
--      se recarga el correcto. Insert-only.
--
-- Diseño: catálogo cerrado de permisos ('payments.register', 'payments.void')
-- con defaults por rol (owner: todo siempre; admin: registra por defecto, no
-- anula; coach/member: nada) + grants explícitos por membership que SOLO el
-- owner del gym otorga/revoca. Ventana de gracia: quien registró un pago puede
-- anular el suyo el mismo día calendario (hora de Argentina) sin permiso
-- especial — cubre el typo del mostrador sin exponer pagos viejos.

-- ── 1. Tabla de grants (auditada: quién se lo dio a quién y cuándo) ─────────
-- Las policies se agregan después de los helpers (sección 2): is_owner_of y
-- has_gym_permission son funciones `language sql`, que Postgres resuelve al
-- crearlas (no de forma perezosa) — no pueden referenciar objetos que todavía
-- no existen.
create table public.membership_permissions (
  membership_id uuid not null references public.memberships(id) on delete cascade,
  permission    text not null check (permission in ('payments.register', 'payments.void')),
  granted_by    uuid references public.profiles(id) on delete set null,
  granted_at    timestamptz not null default now(),
  primary key (membership_id, permission)
);

alter table public.membership_permissions enable row level security;

-- ── 2. Helpers de autorización (mismo molde que is_admin_of/is_staff_of) ────

create or replace function public.is_owner_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role = 'owner'
      and gg.is_active
  );
$$;

-- true si la persona logueada tiene p_perm en el gym g: por default de su rol,
-- o porque el owner se lo otorgó explícitamente vía membership_permissions.
create or replace function public.has_gym_permission(g uuid, p_perm text)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    public.is_owner_of(g)
    or (
      p_perm = 'payments.register'
      and exists (
        select 1 from public.memberships m
        join public.gyms gg on gg.id = m.gym_id
        where m.user_id = auth.uid()
          and m.gym_id = g
          and m.status = 'active'
          and m.role = 'admin'
          and gg.is_active
      )
    )
    or exists (
      select 1
      from public.memberships m
      join public.gyms gg on gg.id = m.gym_id
      join public.membership_permissions mp on mp.membership_id = m.id
      where m.user_id = auth.uid()
        and m.gym_id = g
        and m.status = 'active'
        and gg.is_active
        and mp.permission = p_perm
    );
$$;

do $$
begin
  execute 'revoke all on function public.is_owner_of(uuid) from public, anon';
  execute 'grant execute on function public.is_owner_of(uuid) to authenticated, service_role';
  execute 'revoke all on function public.has_gym_permission(uuid, text) from public, anon';
  execute 'grant execute on function public.has_gym_permission(uuid, text) to authenticated, service_role';
end $$;

-- Policies de membership_permissions (ahora que is_owner_of/is_admin_of existen).

-- SELECT: el propio miembro ve sus grants; admin/owner del gym, todos.
create policy membership_permissions_select on public.membership_permissions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_permissions.membership_id
        and m.user_id = auth.uid()
    )
    or public.is_admin_of(
      (select gym_id from public.memberships m where m.id = membership_permissions.membership_id)
    )
  );

-- WRITE: solo el owner del gym otorga/revoca (un admin no puede auto-otorgarse
-- payments.void). Sin UPDATE: revocar es un delete + insert si hace falta.
create policy membership_permissions_owner_write on public.membership_permissions
  for insert with check (
    public.is_owner_of(
      (select gym_id from public.memberships m where m.id = membership_permissions.membership_id)
    )
  );

create policy membership_permissions_owner_delete on public.membership_permissions
  for delete using (
    public.is_owner_of(
      (select gym_id from public.memberships m where m.id = membership_permissions.membership_id)
    )
  );

-- ── 3. Anulación de subscription_payments (insert-only + void auditado) ────

alter table public.subscription_payments
  add column voided_at   timestamptz,
  add column voided_by   uuid references public.profiles(id) on delete set null,
  add column void_reason text,
  add constraint subscription_payments_void_reason_required
    check (voided_at is null or void_reason is not null);

comment on column public.subscription_payments.voided_at is
  'Momento de anulación. Null = pago vigente. Nunca se borra ni edita la fila.';

-- WRITE pasa de "admin/owner todo" a insert-only por permiso: la tabla queda
-- inmutable desde clientes (sin policy de update/delete); la única forma de
-- anular es el RPC void_subscription_payment (security definer más abajo).
drop policy if exists subscription_payments_admin_write on public.subscription_payments;
create policy subscription_payments_insert on public.subscription_payments
  for insert with check (public.has_gym_permission(gym_id, 'payments.register'));

-- register_subscription_payment: el guard pasa de is_admin_of a
-- has_gym_permission('payments.register') (owner/admin siguen pudiendo por
-- default; un coach/member solo si el owner se lo otorgó).
create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_amount          numeric default null,
  p_period_start    date    default null,
  p_payment_method  text    default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_period_start date;
  v_period_end   date;
  v_payment_id   uuid;
begin
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.has_gym_permission(v_sub.gym_id, 'payments.register') then
    raise exception 'No autorizado';
  end if;

  v_period_start := date_trunc(
    'month',
    coalesce(p_period_start, v_sub.due_date, current_date)
  )::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.subscription_payments
    (gym_id, subscription_id, activity_id, user_id, amount,
     period_start, period_end, payment_method, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0),
     v_period_start, v_period_end, p_payment_method, public.auth_profile_id())
  returning id into v_payment_id;

  update public.activity_subscriptions
  set last_payment_date = current_date,
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_payment_id;
end;
$$;

-- RPC atómico de anulación: autoriza (permiso payments.void, o ventana de
-- gracia del mismo día para quien registró el pago), marca la fila y revierte
-- el vencimiento de la suscripción en la misma transacción.
create or replace function public.void_subscription_payment(
  p_payment_id uuid,
  p_reason     text
) returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pay          public.subscription_payments%rowtype;
  v_actor        uuid := public.auth_profile_id();
  v_same_day     boolean;
  v_last_paid_at date;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo de la anulación es obligatorio';
  end if;

  select * into v_pay
  from public.subscription_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago inexistente';
  end if;
  if v_pay.voided_at is not null then
    raise exception 'El pago ya está anulado';
  end if;

  -- Ventana de gracia: quien registró el pago puede anularlo hasta el fin del
  -- día calendario en que lo cargó (hora de Argentina, no UTC: un corte en UTC
  -- cortaría la ventana a las 21hs locales).
  v_same_day := v_pay.registered_by = v_actor
    and (v_pay.created_at at time zone 'America/Argentina/Buenos_Aires')::date
      = (now() at time zone 'America/Argentina/Buenos_Aires')::date;

  if not (public.has_gym_permission(v_pay.gym_id, 'payments.void') or v_same_day) then
    raise exception 'No autorizado';
  end if;

  update public.subscription_payments
  set voided_at = now(),
      voided_by = v_actor,
      void_reason = p_reason
  where id = p_payment_id;

  -- Revierte el vencimiento: el mes que cubría este cobro vuelve a adeudarse
  -- (filas legacy sin período no mueven due_date). last_payment_date se
  -- recalcula al último cobro vigente (no anulado) de la suscripción.
  update public.activity_subscriptions s
  set due_date = case
        when v_pay.period_start is not null then least(s.due_date, v_pay.period_start)
        else s.due_date
      end,
      last_payment_date = (
        select max(sp.paid_at)
        from public.subscription_payments sp
        where sp.subscription_id = s.id and sp.voided_at is null
      )
  where s.id = v_pay.subscription_id;
end;
$$;

revoke all on function public.void_subscription_payment(uuid, text) from public, anon;
grant execute on function public.void_subscription_payment(uuid, text) to authenticated, service_role;

-- ── 4. Reportes: excluir cobros anulados ────────────────────────────────────

create or replace function public.activity_income_summary(
  p_gym_id uuid,
  p_from   date,
  p_to     date
) returns table (
  activity_id     uuid,
  activity_name   text,
  activity_color  text,
  payments_count  integer,
  total           numeric,
  active_students integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin_of(p_gym_id) then
    raise exception 'No autorizado';
  end if;

  return query
  with pay as (
    select sp.activity_id as aid, count(*)::integer as cnt, sum(sp.amount) as amt
    from public.subscription_payments sp
    where sp.gym_id = p_gym_id
      and sp.paid_at between p_from and p_to
      and sp.voided_at is null
    group by sp.activity_id
  ),
  subs as (
    select s.activity_id as aid, count(*)::integer as students
    from public.activity_subscriptions s
    where s.gym_id = p_gym_id and s.status = 'active'
    group by s.activity_id
  )
  select a.id, a.name, a.color,
         coalesce(p.cnt, 0), coalesce(p.amt, 0), coalesce(s.students, 0)
  from public.activities a
  left join pay p on p.aid = a.id
  left join subs s on s.aid = a.id
  where a.gym_id = p_gym_id
    and (p.aid is not null or s.aid is not null)
  order by coalesce(p.amt, 0) desc;
end;
$$;

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
     and sp.voided_at is null
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
