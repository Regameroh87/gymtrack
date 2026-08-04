-- El día del vencimiento: ¿ya debe, o todavía está cubierto? Lo elige el gym.
--
-- Hasta ahora nadie lo elegía, y peor: el sistema no se ponía de acuerdo consigo
-- mismo. Un socio con vencimiento HOY se veía así:
--
--   paymentBadge (due_date >= hoy)              → "Al día", en verde
--   member_pending_charges (due_date <= hoy)    → debe ese mes
--   overdueDates, en la pantalla de membresías  → debe ese mes
--   gym_dunning_candidates                      → candidato con 0 días de atraso
--
-- O sea que el 1 de cada mes el staff veía al socio en verde mientras el mail de
-- cuota vencida ya le había salido. El badge era el único de los cuatro que
-- contaba distinto, y no por una decisión: por un >= donde los demás tienen <=.
--
-- Esto se volvió más visible con el alta anclada al mes calendario (migración
-- 20260803140000): antes cada socio vencía un día distinto y la discrepancia era
-- un caso raro; ahora todos vencen el día 1 y pasa a ser un día por mes para el
-- padrón entero.
--
-- LO QUE DECIDE EL GYM Y LO QUE NO
--
-- Que los cuatro digan lo mismo no es opinable: es un bug con cualquier política.
-- Lo opinable es CUÁL de las dos, y ahí los dos criterios son razonables — el que
-- cobra por adelantado quiere que el día del vencimiento ya sea deuda, y el que
-- le da el día entero al socio para pasar por el gimnasio no. Así que la política
-- es del gym y se aplica pareja en los cuatro lugares.
--
-- Arranca en false (el día del vencimiento ya debe) porque es lo que hacen hoy
-- tres de los cuatro: ningún gym ve cambiar su deuda ni sus recordatorios, y lo
-- único que se mueve es el badge, que pasa a decir lo mismo que el resto.

ALTER TABLE "public"."gyms"
  ADD COLUMN IF NOT EXISTS "due_day_is_covered" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."gyms"."due_day_is_covered" IS
  'Si es true, el día del vencimiento todavía cuenta como pago: la cuota recién se considera vencida al día siguiente. Aplica pareja a la deuda (member_pending_charges), a los recordatorios (gym_dunning_candidates) y al badge de la app. Si es false (default), el día del vencimiento ya es deuda.';

-- ── La deuda ────────────────────────────────────────────────────────────────
--
-- Mismo cuerpo que 20260803120100, con el corte movido un día cuando el gym da
-- por cubierto el día del vencimiento.
--
-- El coalesce del setting NO es decorativo: member_pending_charges corre bajo la
-- RLS del que llama (no es security definer) y la llama también el socio desde su
-- app. Si la fila de gyms no fuera visible, un cross join la dejaría en cero filas
-- y la deuda desaparecería entera. Con el subquery escalar + coalesce, lo peor que
-- pasa es que caiga al default y siga contando como hasta ahora.
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
  with corte as (
    select (
      current_date - (
        case
          when coalesce(
            (select g.due_day_is_covered from public.gyms g where g.id = p_gym_id),
            false
          ) then 1
          else 0
        end
      )
    )::date as hasta
  )
  select
    s.id,
    s.activity_id,
    a.name,
    p.label,
    coalesce(s.price, p.price, 0)::numeric(10,2),
    date_trunc('month', venc)::date,
    (date_trunc('month', venc) + interval '1 month')::date
  from public.activity_subscriptions s
  join public.activities a on a.id = s.activity_id
  left join public.activity_plans p on p.id = s.activity_plan_id
  cross join corte
  -- Un vencimiento por mes, sobre la fecha REAL, y recién después se trunca a
  -- mes para el período contable (que es la convención del resto del esquema:
  -- subscription_payments.period_start, el desglose del checkout, los informes
  -- de ingresos).
  --
  -- El orden importa y es fácil errarlo: truncando ANTES, la serie llega hasta
  -- date_trunc('month', current_date) y cobra el mes en curso aunque su
  -- vencimiento todavía no haya llegado. Un socio que vence los 10 y debe desde
  -- junio, mirado un 3 de agosto, tiene que deber junio y julio — no agosto, que
  -- vence recién en una semana. Generando sobre la fecha real, la serie se corta
  -- sola en el último vencimiento que ya pasó.
  --
  -- Sin due_date el corte NO se mueve: la serie da una sola vuelta contra
  -- current_date, igual que siempre. Restarle el día ahí haría que el 1 de cada
  -- mes una suscripción sin vencimiento pasara a deber el mes ANTERIOR, que no es
  -- lo que la gracia quiere decir.
  cross join lateral generate_series(
    coalesce(s.due_date, current_date),
    case when s.due_date is null then current_date else corte.hasta end,
    interval '1 month'
  ) as venc
  where s.gym_id = p_gym_id
    and s.user_id = p_user_id
    and s.status = 'active'
    and (s.due_date is null or s.due_date <= corte.hasta)
  order by a.name, venc;
$$;

comment on function public.member_pending_charges(uuid, uuid) is
  'Cuotas que un socio debe en un gym, una fila por actividad y mes impago. Es la definición única de "lo que hay que cobrarle": la usan /api/gym-mp/cobro, la app del socio y la cobranza automática. Acumula: un socio con tres meses sin pagar devuelve tres filas y el total es el saldo real. El día del vencimiento cuenta como deuda salvo que el gym tenga due_day_is_covered.';

-- ── Los recordatorios ───────────────────────────────────────────────────────
--
-- Mismo cuerpo que 20260803120200, contando el atraso contra el mismo corte que
-- la deuda. Con due_day_is_covered, un vencimiento de hoy no genera candidato
-- (sería atraso -1) y el escalón de día 0 sale al día siguiente: la escalera
-- entera se corre un día, que es exactamente lo que el gym pidió al prender la
-- gracia.
create or replace function public.gym_dunning_candidates(p_gym_id uuid)
returns table (
  user_id            uuid,
  email              text,
  name               text,
  last_name          text,
  reference_due_date date,
  days_overdue       integer,
  total_amount       numeric(10,2),
  items              integer
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_hasta date;
begin
  if not (public.is_admin_of(p_gym_id) or auth.role() = 'service_role') then
    raise exception 'No tenés permiso para ver la cobranza de este gimnasio';
  end if;

  select current_date - (case when g.due_day_is_covered then 1 else 0 end)
    into v_hasta
  from public.gyms g
  where g.id = p_gym_id;
  -- Gym inexistente: sin fila no hay a quién reclamarle, pero que la variable no
  -- quede null y se lleve puesto el where por comparación con null.
  v_hasta := coalesce(v_hasta, current_date);

  return query
  with deuda as (
    -- Saldo total del socio, sumando todos los meses impagos de todas sus
    -- actividades. Se repite igual en cada fila de vencimiento: el mail siempre
    -- reclama el total, no la cuota puntual que disparó el recordatorio.
    -- member_pending_charges ya aplica la misma gracia, así que los dos lados
    -- de este join hablan del mismo día.
    select
      prof.id                       as profile_id,
      prof.email                    as email,
      prof.name                     as name,
      prof.last_name                as last_name,
      sum(c.amount)::numeric(10,2)  as total_amount,
      count(*)::integer             as items
    from public.memberships m
    join public.profiles prof on prof.user_id = m.user_id
    cross join lateral public.member_pending_charges(p_gym_id, prof.id) c
    where m.gym_id = p_gym_id
      and m.status = 'active'
    group by prof.id, prof.email, prof.name, prof.last_name
    having sum(c.amount) > 0
  ),
  vencimientos as (
    -- Un vencimiento por mes impago, sobre la fecha real. El distinct colapsa
    -- dos actividades que vencen el mismo día: son un solo recordatorio, porque
    -- el mail ya reclama el total de las dos.
    --
    -- Ojo con el coalesce: acá es start_date y en member_pending_charges es
    -- current_date, y la diferencia es deliberada. Una suscripción sin due_date
    -- debe el mes en curso (eso es lo que cobra pending_charges), pero si la
    -- fecha de referencia fuera current_date se movería todos los días: cada día
    -- sería un reference_due_date nuevo, el unique del log no lo reconocería como
    -- repetido y el recordatorio del día 0 saldría todos los días. start_date es
    -- fijo, así que da una escalera estable con aniversarios mensuales.
    select distinct
      prof.id    as profile_id,
      venc::date as reference_due_date
    from public.memberships m
    join public.profiles prof on prof.user_id = m.user_id
    join public.activity_subscriptions s
      on s.user_id = prof.id
     and s.gym_id  = p_gym_id
     and s.status  = 'active'
    cross join lateral generate_series(
      coalesce(s.due_date, s.start_date),
      v_hasta,
      interval '1 month'
    ) as venc
    where m.gym_id = p_gym_id
      and m.status = 'active'
      and coalesce(s.due_date, s.start_date) <= v_hasta
  )
  select
    d.profile_id,
    d.email,
    d.name,
    d.last_name,
    v.reference_due_date,
    (v_hasta - v.reference_due_date)::integer,
    d.total_amount,
    d.items
  from deuda d
  join vencimientos v on v.profile_id = d.profile_id;
end;
$$;

comment on function public.gym_dunning_candidates(uuid) is
  'Socios con cuotas impagas en un gym: una fila por cada vencimiento impago, con los días de atraso contados desde ESE vencimiento y el saldo total adeudado. Cada cuota vencida reinicia la escalera de recordatorios. Con due_day_is_covered el atraso arranca al día siguiente del vencimiento. La usa el panel (pestaña Seguimiento) y el job cobranza-recordatorios.';

-- ── El setter ───────────────────────────────────────────────────────────────
--
-- Suma el parámetro nuevo. Va con drop previo y no con un create or replace a
-- secas: agregar un parámetro (aunque tenga default) es una firma distinta, así
-- que sin el drop quedarían las dos funciones vivas y toda llamada de dos
-- argumentos sería ambigua.
drop function if exists public.set_billing_settings(uuid, boolean);

CREATE OR REPLACE FUNCTION "public"."set_billing_settings"(
  "p_gym_id" "uuid",
  "p_prorate_first_month" boolean DEFAULT NULL,
  "p_due_day_is_covered" boolean DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT (
    public.is_super_admin() IS TRUE
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.gym_id = p_gym_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  -- Lo que no se manda queda como está, así cada control del panel toca solo lo
  -- suyo.
  UPDATE public.gyms
  SET prorate_first_month = COALESCE(p_prorate_first_month, prorate_first_month),
      due_day_is_covered  = COALESCE(p_due_day_is_covered, due_day_is_covered),
      updated_at = now()
  WHERE id = p_gym_id;
END;
$$;

ALTER FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean) IS
  'Configura la política de cobranza del gym: prorrateo del primer mes y si el día del vencimiento todavía cuenta como pago. Solo owner/admin del gym (o super_admin).';

GRANT EXECUTE ON FUNCTION "public"."set_billing_settings"("p_gym_id" "uuid", "p_prorate_first_month" boolean, "p_due_day_is_covered" boolean) TO "authenticated";
