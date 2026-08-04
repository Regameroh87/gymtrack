-- gym_dunning_candidates: la escalera se reinicia con cada cuota vencida.
--
-- Antes la función devolvía UNA fila por socio, anclada al vencimiento más
-- viejo: reference_due_date = min(due_date). Consecuencia: un socio que no
-- pagaba nunca recibía la escalera una sola vez en la vida. Con escalones en 0,
-- 5 y 10, a partir del día 11 days_overdue seguía creciendo (35, 60, 90...) y no
-- coincidía con ningún escalón nunca más. El que más deuda acumulaba era al que
-- menos se le reclamaba.
--
-- Ahora devuelve una fila por socio Y POR VENCIMIENTO IMPAGO. Cada mes que se
-- vence estrena su propia escalera, contada desde su propia fecha.
--
-- Dos cosas se apoyan en cosas que ya existían y no hizo falta tocar:
--
--   * La idempotencia. El unique de gym_dunning_log es
--     (gym_id, user_id, step_id, reference_due_date): como cada cuota trae su
--     propia fecha de referencia, cada escalón sale una vez por cuota sin que
--     haya que agregar nada.
--   * El anti-duplicado. El cooldown del job está scopeado por (socio, step),
--     así que dos cuotas que caen con pocos días de diferencia no disparan dos
--     veces el mismo escalón, y la escalada normal (día 5 → día 10) sigue sin
--     frenarse porque son steps distintos.
--
-- Las fechas de referencia se generan sobre el vencimiento REAL (due_date + N
-- meses), no sobre el mes truncado que usa member_pending_charges para los
-- períodos contables. Si el socio vence el 10, "a los 5 días del vencimiento"
-- tiene que ser el 15 — truncar a mes correría todos los recordatorios al día 1.
--
-- El monto sí sale de member_pending_charges, que desde la migración
-- 20260803120100 acumula: el mail reclama el saldo total, no el mes suelto.

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
begin
  if not (public.is_admin_of(p_gym_id) or auth.role() = 'service_role') then
    raise exception 'No tenés permiso para ver la cobranza de este gimnasio';
  end if;

  return query
  with deuda as (
    -- Saldo total del socio, sumando todos los meses impagos de todas sus
    -- actividades. Se repite igual en cada fila de vencimiento: el mail siempre
    -- reclama el total, no la cuota puntual que disparó el recordatorio.
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
      current_date,
      interval '1 month'
    ) as venc
    where m.gym_id = p_gym_id
      and m.status = 'active'
      and coalesce(s.due_date, s.start_date) <= current_date
  )
  select
    d.profile_id,
    d.email,
    d.name,
    d.last_name,
    v.reference_due_date,
    (current_date - v.reference_due_date)::integer,
    d.total_amount,
    d.items
  from deuda d
  join vencimientos v on v.profile_id = d.profile_id;
end;
$$;

comment on function public.gym_dunning_candidates(uuid) is
  'Socios con cuotas impagas en un gym: una fila por cada vencimiento impago, con los días de atraso contados desde ESE vencimiento y el saldo total adeudado. Cada cuota vencida reinicia la escalera de recordatorios. La usa el panel (pestaña Seguimiento) y el job cobranza-recordatorios.';
