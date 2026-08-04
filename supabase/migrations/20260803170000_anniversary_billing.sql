-- El ciclo de cuota arranca el día del alta, no el 1 del mes.
--
-- Hasta acá la cuota se cobraba por mes calendario: el alta ponía due_date en el
-- día 1 y el período iba del 1 al 1. Un socio que se anotaba el 12/8 pagaba
-- "agosto". Eso resolvía un bug real (el alta daba por cobrado el primer mes y
-- anclaba el vencimiento al día del alta mientras el cobro cubría el mes
-- calendario), pero lo resolvía hacia el lado equivocado.
--
-- Con todos venciendo el día 1, la recaudación se concentra en la primera semana
-- y quedan tres semanas de sequía. Anclando al día del alta entra plata todos los
-- días. Ese es el motivo de fondo; el resto de la industria hace lo mismo.
--
-- ── EL CASO QUE DECIDE SI ESTO FUNCIONA: FEBRERO ────────────────────────────
--
-- Un ancla en 29, 30 o 31 con un mes más corto adelante. Hay dos criterios en la
-- calle y acá se eligió el que VUELVE AL ANCLA:
--
--   alta 31/01/2026 →  31/01 → 28/02 → 31/03 → 30/04 → 31/05 …
--
-- La alternativa (quedar fijado en el 28 después de febrero) es un trinquete de
-- un solo sentido: la fecha solo puede bajar, nunca subir. Con ella, TODAS las
-- altas del 29, 30 y 31 colapsan en el día 28 dentro del primer año — más del 10%
-- del padrón cobrando el mismo día, que es justamente el pico que este modelo
-- venía a eliminar.
--
-- Para que vuelva al ancla, los períodos se calculan SIEMPRE como
-- `ancla + k meses`, nunca sumando un mes sobre el resultado anterior. Encadenar
-- es lo que deja la fecha pegada donde cayó.
--
-- ── DE DÓNDE SALE EL ANCLA ──────────────────────────────────────────────────
--
-- De activity_subscriptions.start_date, que ya existe, es not null y es el día
-- del alta. NO puede salir de due_date: una vez que due_date se recortó a 28,
-- derivar el ancla de ahí lo deja en 28 para siempre. Ese es exactamente el bug
-- que se está evitando.
--
-- ── LO QUE ESTABA ROTO Y ACÁ SE CIERRA ──────────────────────────────────────
--
-- member_pending_charges expandía con generate_series sobre fechas, que encadena;
-- register_subscription_payments sumaba k meses sobre el ancla. O sea que las dos
-- puntas ya calculaban distinto. Estaba tapado porque las dos truncaban la salida
-- a mes calendario y todo caía al día 1. Sacar el truncado lo destapa, así que
-- las dos pasan a salir de la MISMA función.

-- ── La aritmética, en un solo lugar ─────────────────────────────────────────
--
-- Las dos son immutable y de aritmética pura (no leen tablas), así que Postgres
-- las puede inlinear dentro de las consultas que las usan.
--
-- Toman el ancla como fecha y no el id de la suscripción a propósito: además de
-- evitar un lookup por fila, hace que se puedan probar sueltas —
-- `select * from subscription_period('2026-01-31', 2)` — sin crear ninguna
-- suscripción. Ese es el test que decide si el modelo quedó bien.

-- En qué ciclo cae una fecha, contando desde el alta. Usa SOLO año y mes: si
-- mirara el día, el recorte de febrero correría el índice y el ancla no volvería.
create or replace function public.subscription_month_index(
  p_start_date date,
  p_date       date
)
returns integer
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select (
      (extract(year  from p_date) - extract(year  from p_start_date)) * 12
    + (extract(month from p_date) - extract(month from p_start_date))
  )::integer;
$$;

comment on function public.subscription_month_index(date, date) is
  'Índice del ciclo de cuota en el que cae una fecha, contado desde el alta. Solo año y mes: mirar el día haría que el recorte de febrero corriera el índice.';

-- Los límites del ciclo k. period_end es EXCLUSIVO (el ciclo siguiente arranca
-- ese día), igual que venía siendo con mes calendario.
--
-- El recorte de los meses cortos lo hace Postgres solo: date + interval 'k months'
-- ajusta al último día válido del mes destino. Y como los dos extremos se
-- calculan desde el ancla y no uno del otro, 31/01 + 2 meses da 31/03 y no 28/03.
create or replace function public.subscription_period(
  p_start_date date,
  p_k          integer
)
returns table (period_start date, period_end date)
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select
    (p_start_date + make_interval(months => p_k))::date,
    (p_start_date + make_interval(months => p_k + 1))::date;
$$;

comment on function public.subscription_period(date, integer) is
  'Límites del ciclo k de una cuota, contando desde la fecha de alta. period_end es exclusivo. Es la única definición de dónde empieza y termina un ciclo: la usan member_pending_charges y el RPC de cobro.';

-- En qué ciclo CAE una fecha. No alcanza con subscription_month_index, que cuenta
-- meses mientras que el ciclo arranca el día del ancla: un alta del 31/01 mirada
-- el 15/04 da índice de mes 3, pero el ciclo 3 arranca el 30/04 y todavía no
-- empezó — el que contiene al 15/04 es el 2 (31/03 → 30/04). Sin este ajuste la
-- deuda se corre un ciclo entero.
create or replace function public.subscription_cycle_index(
  p_start_date date,
  p_date       date
)
returns integer
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select case when per.period_start > p_date then idx.i - 1 else idx.i end
  from (select public.subscription_month_index(p_start_date, p_date) as i) idx
  cross join lateral public.subscription_period(p_start_date, idx.i) per;
$$;

comment on function public.subscription_cycle_index(date, date) is
  'Índice del ciclo de cuota que contiene una fecha. A diferencia de subscription_month_index, respeta que el ciclo arranca el día del ancla y no el 1 del mes.';

grant execute on function public.subscription_month_index(date, date) to authenticated, service_role;
grant execute on function public.subscription_period(date, integer) to authenticated, service_role;
grant execute on function public.subscription_cycle_index(date, date) to authenticated, service_role;

-- ── La deuda ────────────────────────────────────────────────────────────────
--
-- Misma firma y mismo tipo de retorno, así que es un create or replace y no cae
-- en cascada gym_dunning_candidates.
--
-- Cambia cómo se genera la serie: antes era generate_series sobre FECHAS (que
-- encadena) y ahora es sobre ENTEROS, con cada ciclo resuelto por
-- subscription_period desde el ancla. Y la salida deja de pasar por
-- date_trunc('month', …): el período es el ciclo real.
--
-- El corte de due_day_is_covered se conserva igual, con el mismo coalesce: esta
-- función corre bajo la RLS del que llama y la usa también el socio desde su app,
-- así que si la fila de gyms no fuera visible tiene que caer al default y seguir
-- contando, no devolver cero filas.
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
    per.period_start,
    per.period_end
  from public.activity_subscriptions s
  join public.activities a on a.id = s.activity_id
  left join public.activity_plans p on p.id = s.activity_plan_id
  cross join corte
  -- Hasta cuándo pagó. Sin due_date debe UN ciclo, el que está corriendo hoy —
  -- que es lo mismo que devolvía la versión anterior para ese caso (una vuelta,
  -- el período en curso), no toda la historia desde el alta.
  cross join lateral (
    select coalesce(
      s.due_date,
      (select pk.period_start
         from public.subscription_period(
           s.start_date,
           public.subscription_cycle_index(s.start_date, corte.hasta)
         ) pk)
    ) as pagado_hasta
  ) ref
  -- Se arranca en el ciclo que CONTIENE lo pagado, no en el siguiente: un
  -- due_date que no cae justo en un borde (dato viejo, o cargado a mano) deja ese
  -- ciclo a medio pagar y hay que seguir cobrándolo. Cuando sí cae en el borde,
  -- el ciclo que lo contiene ya es el primero impago y da lo mismo.
  cross join lateral generate_series(
    greatest(0, public.subscription_cycle_index(s.start_date, ref.pagado_hasta)),
    public.subscription_month_index(s.start_date, corte.hasta)
  ) as k
  cross join lateral public.subscription_period(s.start_date, k) per
  where s.gym_id = p_gym_id
    and s.user_id = p_user_id
    and s.status = 'active'
    -- El ciclo no está cubierto por lo que ya pagó...
    and per.period_end > ref.pagado_hasta
    -- ...y ya arrancó. El índice de arriba puede pasarse por un mes cuando el día
    -- del ancla cae después de hoy dentro del mes en curso.
    and per.period_start <= corte.hasta
  order by a.name, per.period_start;
$$;

comment on function public.member_pending_charges(uuid, uuid) is
  'Cuotas que un socio debe en un gym, una fila por actividad y ciclo impago. Es la definición única de "lo que hay que cobrarle": la usan /api/gym-mp/cobro, la app del socio y la cobranza automática. Los ciclos van de aniversario a aniversario desde la fecha de alta, y el día del vencimiento cuenta como deuda salvo que el gym tenga due_day_is_covered.';

-- ── El cobro, en una sola función ───────────────────────────────────────────
--
-- Hasta ahora había dos que se diferenciaban en una `s`:
-- register_subscription_payment (un mes) y register_subscription_payments (N).
-- Es un pie de bala, y el singular además arrastraba dos defectos propios: no
-- tomaba `for update` —dos personas del staff cobrando al mismo socio a la vez le
-- cobraban los mismos meses dos veces— y aceptaba un p_period_start arbitrario,
-- que es el agujero por el que saltear un ciclo lo hace DESAPARECER de la deuda
-- en vez de dejarlo impago (la deuda se deriva de due_date).
--
-- Queda una sola, con el nombre en singular y el cuerpo del plural.
--
-- OJO CON EL ORDEN DE DESPLIEGUE: las dos viejas NO se borran acá. El bundle que
-- está corriendo las sigue llamando, y dropearlas ahora le rompe el cobro hasta
-- que termine el deploy. Se borran en una migración aparte y posterior
-- (20260803180000), como manda la convención del repo para lo que deja de usarse.
-- Mientras tanto conviven, y no hay ambigüedad porque PostgREST resuelve por
-- NOMBRE de parámetro: p_period_start existe solo en la vieja y p_months solo en
-- esta.
create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_months          integer default 1,
  p_amount          numeric default null,
  p_payment_method  text    default null
)
returns uuid[]
language plpgsql
set search_path to 'public'
as $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_k            integer;
  v_period_start date;
  v_period_end   date;
  v_amount       numeric;
  v_payment_id   uuid;
  v_ids          uuid[] := '{}';
  i              integer;
begin
  if p_months is null or p_months < 1 then
    raise exception 'Hay que cobrar al menos un mes';
  end if;
  -- Tope de cordura: un dedo pesado en el selector no puede generar cien cobros.
  if p_months > 36 then
    raise exception 'No se pueden cobrar más de 36 meses de una vez';
  end if;

  -- for update: dos personas del staff cobrando al mismo socio a la vez leerían
  -- el mismo due_date y cobrarían los mismos ciclos dos veces. El lock las
  -- serializa, y la segunda arranca desde el vencimiento ya movido por la primera.
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.has_gym_permission(v_sub.gym_id, 'payments.register') then
    raise exception 'No autorizado';
  end if;

  -- No se elige QUÉ ciclos se pagan sino CUÁNTOS, y arrancan siempre en el
  -- vencimiento actual. Es a propósito: saltear uno no lo deja impago, lo borra.
  -- cycle_index y no month_index: sin vencimiento hay que arrancar en el ciclo
  -- que corre HOY, y el índice de mes se pasa uno cuando el día del ancla todavía
  -- no llegó dentro del mes en curso.
  v_k      := public.subscription_cycle_index(v_sub.start_date, coalesce(v_sub.due_date, current_date));
  v_amount := coalesce(p_amount, v_sub.price, 0);

  for i in 0 .. p_months - 1 loop
    select per.period_start, per.period_end
      into v_period_start, v_period_end
    from public.subscription_period(v_sub.start_date, v_k + i) per;

    insert into public.subscription_payments
      (gym_id, subscription_id, activity_id, user_id, amount,
       period_start, period_end, payment_method, registered_by)
    values
      (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id, v_amount,
       v_period_start, v_period_end, p_payment_method, public.auth_profile_id())
    returning id into v_payment_id;

    v_ids := v_ids || v_payment_id;
  end loop;

  -- Un solo update al final, con el fin del último ciclo cobrado. El greatest
  -- está para nunca retroceder un vencimiento ya ganado.
  update public.activity_subscriptions
  set last_payment_date = current_date,
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_ids;
end;
$$;

comment on function public.register_subscription_payment(uuid, integer, numeric, text) is
  'Cobra N ciclos consecutivos de una suscripción en una transacción, arrancando en el vencimiento actual. Devuelve los ids de los cobros. Los ciclos son consecutivos a propósito: saltear uno lo haría desaparecer de la deuda, que se deriva de due_date.';

grant execute on function public.register_subscription_payment(uuid, integer, numeric, text)
  to authenticated, service_role;

-- ── Alinear los vencimientos que ya existen ─────────────────────────────────
--
-- Las suscripciones vivas tienen due_date en el día 1 (del modelo calendario) y
-- start_date en el día real del alta. Al re-anclar, el vencimiento se corre del 1
-- al día del alta, y hay que decidir para qué lado.
--
-- Se corrige HACIA ARRIBA, nunca hacia abajo: se toma el borde de ciclo más
-- cercano que sea >= al due_date actual. Nadie termina pagando dos veces por
-- tiempo que ya pagó; a lo sumo un puñado de socios recibe unos días de más, una
-- sola vez. El error caro es el otro.
--
-- Va después de redefinir las funciones porque las usa.
with alineado as (
  select
    s.id,
    case
      when p0.period_start >= s.due_date then p0.period_start
      else p1.period_start
    end as nuevo
  from public.activity_subscriptions s
  cross join lateral public.subscription_period(
    s.start_date, public.subscription_month_index(s.start_date, s.due_date)
  ) p0
  cross join lateral public.subscription_period(
    s.start_date, public.subscription_month_index(s.start_date, s.due_date) + 1
  ) p1
  where s.due_date is not null
    and s.status = 'active'
)
update public.activity_subscriptions s
set due_date = a.nuevo
from alineado a
where a.id = s.id
  and a.nuevo <> s.due_date;
