-- Pago de la cuota por parte del socio, desde la app.
--
-- Requiere la migración 20260726120000 (la cuenta de MP del gym y el
-- interruptor): sin cuenta conectada no hay con qué cobrar.
--
-- ── Por qué un pago de MP se convierte en VARIAS filas ──────────────────────
-- Un socio tiene una fila de activity_subscriptions por actividad, cada una con
-- su precio y su vencimiento. Si hace musculación y funcional, debe dos cuotas
-- distintas — y la decisión de producto es que pague todo junto, no de a una.
--
-- Del otro lado, subscription_payments tiene subscription_id y activity_id NOT
-- NULL: no existe "un cobro de dos actividades". Así que un pago único de
-- MercadoPago tiene que abrirse en N filas, una por actividad, cada una
-- moviendo su propio vencimiento.
--
-- De ahí las dos tablas: el intent es lo que MP conoce (un monto, un pago) y los
-- items son en qué se reparte de este lado.
--
-- ── Por qué el desglose se CONGELA ──────────────────────────────────────────
-- Entre que el socio abre el checkout y termina de pagar pueden pasar horas. Si
-- en el medio el gym cambia el precio de un plan, recalcular al momento de
-- registrar cobraría un monto y anotaría otro. Los items guardan lo que el socio
-- vio y aceptó, y es eso lo que se registra.

-- ── Qué se le cobra a un socio ──────────────────────────────────────────────
--
-- Definición única de "lo que debe", para que el endpoint que arma el cobro y
-- cualquier pantalla que lo muestre no puedan discrepar.
--
-- Se incluye toda actividad activa con la cuota vencida o venciendo (due_date
-- nulo = nunca pagó). Las que están pagas hacia adelante quedan afuera: cobrar
-- un mes que ya está cubierto es plata que después hay que devolver.
--
-- El período se calcula igual que en register_subscription_payment: el mes del
-- vencimiento actual, o el mes en curso si nunca pagó.
--
-- SECURITY INVOKER a propósito (o sea, sin security definer): así la RLS de
-- activity_subscriptions sigue mandando — el socio ve lo suyo, el staff lo de su
-- gym, y el service role todo. Con definer habría que reimplementar ese control
-- acá adentro.
create or replace function public.member_pending_charges(
  p_gym_id  uuid,
  p_user_id uuid
)
returns table (
  subscription_id uuid,
  activity_id     uuid,
  activity_name   text,
  plan_label      text,
  amount          numeric(10,2),
  period_start    date,
  period_end      date
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select
    s.id,
    s.activity_id,
    a.name,
    p.label,
    coalesce(s.price, p.price, 0)::numeric(10,2),
    date_trunc('month', coalesce(s.due_date, current_date))::date,
    (date_trunc('month', coalesce(s.due_date, current_date)) + interval '1 month')::date
  from public.activity_subscriptions s
  join public.activities a on a.id = s.activity_id
  left join public.activity_plans p on p.id = s.activity_plan_id
  where s.gym_id = p_gym_id
    and s.user_id = p_user_id
    and s.status = 'active'
    and (s.due_date is null or s.due_date <= current_date)
  order by a.name;
$$;

alter function public.member_pending_charges(uuid, uuid) owner to postgres;

comment on function public.member_pending_charges(uuid, uuid) is
  'Cuotas que un socio debe en un gym, una fila por actividad. Es la definición única de "lo que hay que cobrarle": la usa /api/gym-mp/cobro para armar el desglose.';

-- ── El intento de cobro ─────────────────────────────────────────────────────

create table if not exists public.member_payment_intents (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  total_amount     numeric(10,2) not null check (total_amount >= 0),
  status           text not null default 'pending',
  mp_preference_id text,
  mp_payment_id    text unique,
  init_point       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  paid_at          timestamptz,
  constraint member_payment_intents_status_check
    check (status in ('pending','approved','rejected','refunded','expired'))
);

comment on table public.member_payment_intents is
  'Un intento de pago de cuota de un socio = un pago en MercadoPago. En qué cuotas se reparte lo dicen los items.';

comment on column public.member_payment_intents.mp_payment_id is
  'Pago de MP que saldó este intento. UNIQUE: es lo que impide que un aviso reenviado —MP reintenta— registre el mismo mes dos veces.';

create index if not exists member_payment_intents_gym_user_idx
  on public.member_payment_intents (gym_id, user_id, created_at desc);

create or replace trigger member_payment_intents_set_updated_at
  before update on public.member_payment_intents
  for each row execute function public.set_updated_at();

-- ── El desglose congelado ───────────────────────────────────────────────────

create table if not exists public.member_payment_intent_items (
  id              uuid primary key default gen_random_uuid(),
  intent_id       uuid not null references public.member_payment_intents(id) on delete cascade,
  subscription_id uuid not null references public.activity_subscriptions(id) on delete cascade,
  activity_id     uuid not null references public.activities(id) on delete cascade,
  amount          numeric(10,2) not null check (amount >= 0),
  period_start    date not null,
  period_end      date not null,
  -- Un mismo intento no puede cobrar dos veces la misma suscripción.
  unique (intent_id, subscription_id)
);

comment on table public.member_payment_intent_items is
  'En qué cuotas se reparte un intento de pago: una fila por actividad. Congela monto y período al momento de crear el cobro, así un cambio de precio posterior no altera lo que el socio aceptó.';

create index if not exists member_payment_intent_items_intent_idx
  on public.member_payment_intent_items (intent_id);

-- ── Trazabilidad del cobro registrado ───────────────────────────────────────
--
-- Sin esta columna, revertir un pago devuelto obligaría a adivinar qué filas de
-- subscription_payments salieron de qué intento cruzando suscripción y período,
-- que no es unívoco.

alter table public.subscription_payments
  add column if not exists payment_intent_id uuid
    references public.member_payment_intents(id) on delete set null;

comment on column public.subscription_payments.payment_intent_id is
  'Intento de pago online que originó este cobro. NULL = cobro cargado a mano por el staff, que es el caso de todas las filas anteriores a los cobros online.';

create index if not exists subscription_payments_intent_idx
  on public.subscription_payments (payment_intent_id)
  where payment_intent_id is not null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Solo lectura para clientes: los intents los crea el endpoint de cobro y los
-- cierra el webhook, ambos con service role. Un socio que pudiera insertar o
-- editar un intent podría fabricarse un pago.

alter table public.member_payment_intents enable row level security;
alter table public.member_payment_intent_items enable row level security;

drop policy if exists member_payment_intents_select on public.member_payment_intents;
create policy member_payment_intents_select on public.member_payment_intents
  for select
  using (user_id = public.auth_profile_id() or public.is_staff_of(gym_id));

drop policy if exists member_payment_intent_items_select on public.member_payment_intent_items;
create policy member_payment_intent_items_select on public.member_payment_intent_items
  for select
  using (exists (
    select 1
    from public.member_payment_intents i
    where i.id = intent_id
      and (i.user_id = public.auth_profile_id() or public.is_staff_of(i.gym_id))
  ));

-- ── Registrar el pago ───────────────────────────────────────────────────────
--
-- Variante batch y sin sesión de register_subscription_payment: recorre los
-- items y deja una fila de cobro por cada uno, moviendo el vencimiento de cada
-- suscripción. La lógica de avance del vencimiento es la misma de siempre.
--
-- Sin sesión porque la llama el webhook, donde no hay auth.uid() y por lo tanto
-- has_gym_permission(...) —que es lo que valida el RPC del staff— no puede
-- evaluarse. Lo que autoriza acá es que MercadoPago confirmó el pago.
--
-- NO chequea is_saas_subscription_active, y es deliberado: la plata del socio ya
-- se movió en MP. Si el gym dejó de pagarnos el abono, lo correcto es dejar de
-- dejarle CREAR cobros nuevos —eso lo hace /api/gym-mp/cobro— y no negarse a
-- registrar uno que ya ocurrió. Negarlo dejaría al socio pagando sin que el
-- sistema lo sepa, que es el peor resultado posible.
create or replace function public.register_member_online_payment(
  p_intent_id     uuid,
  p_mp_payment_id text
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_intent public.member_payment_intents%rowtype;
  v_item   record;
  v_count  integer := 0;
begin
  -- El FOR UPDATE es la mitad de la idempotencia: MercadoPago reintenta los
  -- avisos, y dos entregas del mismo evento pueden llegar en paralelo. Acá la
  -- segunda espera a la primera y después ve el status ya en 'approved'.
  select * into v_intent
  from public.member_payment_intents
  where id = p_intent_id
  for update;

  if not found then
    raise exception 'Intento de pago inexistente: %', p_intent_id;
  end if;

  -- La otra mitad: ya registrado, no se toca. Devuelve 0 en vez de fallar
  -- porque para el webhook un reintento no es un error — tiene que poder
  -- contestarle 200 a MP y que deje de insistir.
  if v_intent.status = 'approved' then
    return 0;
  end if;

  for v_item in
    select * from public.member_payment_intent_items where intent_id = p_intent_id
  loop
    insert into public.subscription_payments
      (gym_id, subscription_id, activity_id, user_id, amount,
       period_start, period_end, payment_method, registered_by, payment_intent_id)
    values
      (v_intent.gym_id, v_item.subscription_id, v_item.activity_id, v_intent.user_id,
       v_item.amount, v_item.period_start, v_item.period_end,
       'mercado_pago', null, v_intent.id);

    -- greatest() ignora los NULL, así que una suscripción que nunca pagó
    -- estrena vencimiento en vez de quedarse en null.
    update public.activity_subscriptions
    set last_payment_date = current_date,
        due_date = greatest(due_date, v_item.period_end)
    where id = v_item.subscription_id;

    v_count := v_count + 1;
  end loop;

  -- Un intento aprobado sin items es plata que entró a la cuenta del gym y que
  -- nadie va a poder imputar: la fila diría 'approved' y no habría un solo cobro
  -- registrado. No debería ocurrir —el endpoint crea intent e items juntos— así
  -- que si ocurre es un bug y conviene que grite en vez de dejar el rastro
  -- limpio. Quien la llama decide qué hacer con la excepción.
  if v_count = 0 then
    raise exception 'El intento % no tiene items: no hay a qué imputar el pago', p_intent_id;
  end if;

  update public.member_payment_intents
  set status = 'approved',
      mp_payment_id = coalesce(p_mp_payment_id, mp_payment_id),
      paid_at = now()
  where id = p_intent_id;

  return v_count;
end;
$$;

alter function public.register_member_online_payment(uuid, text) owner to postgres;

comment on function public.register_member_online_payment(uuid, text) is
  'Convierte un intento de pago aprobado en N cobros (uno por actividad) y mueve los vencimientos. Atómico e idempotente: reejecutarlo devuelve 0 sin duplicar nada.';

-- ── Revertir un pago devuelto ───────────────────────────────────────────────
--
-- Espejo de void_subscription_payment para el caso sin sesión. La reversión del
-- vencimiento usa el mismo criterio: least() contra el period_start del cobro,
-- para no dejar al socio con un vencimiento que nunca pagó.
create or replace function public.void_member_online_payment(
  p_intent_id uuid,
  p_reason    text
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pay   record;
  v_count integer := 0;
begin
  for v_pay in
    select * from public.subscription_payments
    where payment_intent_id = p_intent_id
      and voided_at is null
    for update
  loop
    update public.subscription_payments
    set voided_at = now(),
        voided_by = null,
        void_reason = coalesce(p_reason, 'Pago devuelto en MercadoPago')
    where id = v_pay.id;

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

    v_count := v_count + 1;
  end loop;

  update public.member_payment_intents
  set status = 'refunded'
  where id = p_intent_id;

  return v_count;
end;
$$;

alter function public.void_member_online_payment(uuid, text) owner to postgres;

comment on function public.void_member_online_payment(uuid, text) is
  'Anula los cobros de un intento devuelto o contracargado y revierte los vencimientos. La llama el webhook ante refunded / charged_back.';

-- ── Solo service_role ───────────────────────────────────────────────────────
-- Estas dos funciones registran plata sin pedir permisos: son definer y no
-- miran la sesión. Invocables por un socio serían un generador de cuotas pagas.

revoke all on function public.register_member_online_payment(uuid, text)
  from public, anon, authenticated;
revoke all on function public.void_member_online_payment(uuid, text)
  from public, anon, authenticated;

grant execute on function public.register_member_online_payment(uuid, text) to service_role;
grant execute on function public.void_member_online_payment(uuid, text) to service_role;
