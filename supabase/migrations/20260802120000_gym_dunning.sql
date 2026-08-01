-- Cobranza automática: recordatorios de cuota vencida por mail.
--
-- La deuda ya está perfectamente modelada (member_pending_charges, migración
-- 20260726130000) y el cobro online por MercadoPago ya funciona de punta a
-- punta, pero nadie lo dispara: crear-cobro-socio no tiene ni un caller en
-- apps/. El socio que se atrasa no se entera, y el link de pago que ya sabemos
-- generar nunca le llega. Esta migración es la base de datos de la pieza que
-- falta: el owner/admin configura CUÁNTOS recordatorios se mandan y A LOS
-- CUÁNTOS DÍAS del vencimiento, con un mail editable por recordatorio (para
-- poder subir el tono progresivamente), y un job diario los dispara solo.
--
-- Tres tablas + un RPC:
--   gym_dunning_settings  – interruptor maestro por gym (1 fila)
--   gym_dunning_steps     – los recordatorios configurados (N filas)
--   gym_dunning_log       – qué se mandó a quién, para no repetir envíos
--   gym_dunning_candidates(gym) – a quién le tocaría hoy, reusando
--                                  member_pending_charges como única fuente
--                                  de "lo que debe" (no se reimplementa acá).

-- ── El interruptor + la configuración general ───────────────────────────────

create table if not exists public.gym_dunning_settings (
  gym_id       uuid primary key references public.gyms(id) on delete cascade,
  -- Apagado por default: un gym recién migrado no debe empezar a mandar mails
  -- de cobranza sin que el owner los revise y los prenda a propósito.
  enabled      boolean not null default false,
  -- Red de seguridad ante pagos parciales: si un socio debe dos actividades y
  -- paga una, reference_due_date se corre hacia el vencimiento de la que
  -- queda, y sin este freno el mismo socio podría recibir dos recordatorios
  -- distintos en días consecutivos por lo que en la práctica es la misma
  -- situación de deuda.
  cooldown_days int not null default 3 check (cooldown_days >= 0),
  -- Mail de contacto del gym para el reply-to del recordatorio. Opcional: sin
  -- esto, responder al mail va al FROM_DOMAIN de send-email, que nadie lee.
  reply_to     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.gym_dunning_settings is
  'Configuración de cobranza automática de un gym: interruptor maestro, cooldown entre envíos y mail de contacto. Una fila por gym, creada bajo demanda desde el panel.';

comment on column public.gym_dunning_settings.cooldown_days is
  'Mínimo de días entre dos recordatorios al mismo socio, aunque coincidan otro step. Cubre el caso de un pago parcial que corre el vencimiento de referencia.';

create or replace trigger gym_dunning_settings_set_updated_at
  before update on public.gym_dunning_settings
  for each row execute function public.set_updated_at();

-- ── Los recordatorios configurados ──────────────────────────────────────────

create table if not exists public.gym_dunning_steps (
  id                  uuid primary key default gen_random_uuid(),
  gym_id              uuid not null references public.gyms(id) on delete cascade,
  -- days_after_due es a la vez LA FECHA (cuándo dispara) y EL ORDEN (en qué
  -- posición va este recordatorio dentro de la escalada): no hace falta una
  -- columna step_order aparte, y evita que se puedan desincronizar.
  days_after_due      int not null check (days_after_due >= 0),
  subject             text not null,
  heading             text not null,
  -- TEXTO PLANO. El owner nunca escribe HTML: send-email escapa esto y
  -- convierte los saltos de línea a <br> al armar el mail (ver templates.ts,
  -- template dunning_reminder). Nunca se inyecta como HTML crudo.
  body_text           text not null,
  cta_label           text not null default 'Pagar mi cuota',
  -- El botón condicional: el owner decide, recordatorio por recordatorio, si
  -- ese mail lleva link de pago directo o es solo un aviso.
  show_payment_button boolean not null default true,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Dos recordatorios el mismo día no tiene sentido: ¿cuál de los dos se
  -- manda? Un solo mail por día de atraso configurado.
  unique (gym_id, days_after_due)
);

comment on table public.gym_dunning_steps is
  'Recordatorios de cuota vencida configurados por un gym, uno por "días después del vencimiento". Cada uno tiene su propio mail (asunto/título/mensaje/botón) para poder subir el tono a medida que pasa el atraso.';

comment on column public.gym_dunning_steps.days_after_due is
  'A los cuántos días DESPUÉS del vencimiento dispara este recordatorio. No hay avisos previos al vencimiento (decisión de producto). Es también el orden de la escalada: se listan de menor a mayor.';

comment on column public.gym_dunning_steps.show_payment_button is
  'Si va el botón "Pagar mi cuota" con el link directo de MercadoPago. El job igual respeta gyms.online_payments_enabled y si el gym tiene cuenta conectada: sin eso, el mail sale igual pero sin botón (ver cobranza-recordatorios).';

create index if not exists gym_dunning_steps_gym_idx
  on public.gym_dunning_steps (gym_id, days_after_due);

create or replace trigger gym_dunning_steps_set_updated_at
  before update on public.gym_dunning_steps
  for each row execute function public.set_updated_at();

-- ── Qué se mandó a quién ─────────────────────────────────────────────────────
--
-- Es la mitad más importante de esta migración: sin este registro, correr el
-- job dos veces (o que se solape con la corrida del día siguiente) le manda
-- tres mails al mismo socio por la misma cuota. El unique de abajo es la
-- idempotencia real; el cooldown de gym_dunning_settings es la red para el
-- caso borde de un pago parcial.

create table if not exists public.gym_dunning_log (
  id                 uuid primary key default gen_random_uuid(),
  gym_id             uuid not null references public.gyms(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  step_id            uuid references public.gym_dunning_steps(id) on delete set null,
  -- El vencimiento más viejo que se estaba reclamando en este envío. Ver
  -- gym_dunning_candidates: es el mínimo de los vencimientos de las cuotas
  -- impagas de ese socio en ese gym.
  reference_due_date date not null,
  -- Congelado en el momento del envío: si el owner edita el step después
  -- (cambia el día), el log de lo que ya se mandó no queda mintiendo sobre
  -- cuándo se mandó cada cosa.
  days_after_due     int not null,
  intent_id          uuid references public.member_payment_intents(id) on delete set null,
  status             text not null check (status in ('sent', 'failed', 'skipped')),
  error              text,
  sent_at            timestamptz not null default now(),
  -- La idempotencia real del job: un mismo step no le llega dos veces al mismo
  -- socio por el mismo vencimiento de referencia, sin importar cuántas veces
  -- se dispare el job.
  unique (gym_id, user_id, step_id, reference_due_date)
);

comment on table public.gym_dunning_log is
  'Historial de recordatorios de cobranza enviados (o no). El unique (gym_id, user_id, step_id, reference_due_date) es lo que impide mandar el mismo recordatorio dos veces por el mismo vencimiento. Lo escribe únicamente el service role (el job cobranza-recordatorios).';

comment on column public.gym_dunning_log.status is
  '''sent'' salió por Resend. ''failed'' se intentó y falló (ver error). ''skipped'' se descartó antes de intentar: sin email, cooldown activo, o ya había una fila para este step+vencimiento.';

create index if not exists gym_dunning_log_gym_sent_idx
  on public.gym_dunning_log (gym_id, sent_at desc);

create index if not exists gym_dunning_log_user_idx
  on public.gym_dunning_log (user_id, sent_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
--
-- Mismo patrón que email_log / gym_mp_accounts. El pedido del usuario fue
-- owner O admin (no ownerOnly como "Cobros online"): is_admin_of ya cubre esa
-- unión. El log es de solo lectura para clientes: lo escribe el job con
-- service role, que bypassea RLS.

alter table public.gym_dunning_settings enable row level security;
alter table public.gym_dunning_steps enable row level security;
alter table public.gym_dunning_log enable row level security;

drop policy if exists gym_dunning_settings_admin on public.gym_dunning_settings;
create policy gym_dunning_settings_admin on public.gym_dunning_settings
  for all
  using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

drop policy if exists gym_dunning_steps_admin on public.gym_dunning_steps;
create policy gym_dunning_steps_admin on public.gym_dunning_steps
  for all
  using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

drop policy if exists gym_dunning_log_admin_select on public.gym_dunning_log;
create policy gym_dunning_log_admin_select on public.gym_dunning_log
  for select
  using (public.is_admin_of(gym_id));

-- Supabase otorga privilegios amplios a anon/authenticated por default sobre
-- lo que se crea en public (ver ALTER DEFAULT PRIVILEGES en el baseline), así
-- que esto es un revoke explícito y no una omisión: sin RLS de por medio, anon
-- no tiene que poder tocar ni ver una fila de estas tablas.
revoke all on public.gym_dunning_settings from anon;
revoke all on public.gym_dunning_steps from anon;
revoke all on public.gym_dunning_log from anon;

-- ── A quién le llegaría hoy ──────────────────────────────────────────────────
--
-- Reusa member_pending_charges como ÚNICA definición de "lo que debe": no se
-- reimplementa el criterio acá. La fecha de referencia sale de unirse por
-- subscription_id contra activity_subscriptions, para tomar el vencimiento (o
-- el alta, si nunca pagó) más viejo entre todas las cuotas impagas del socio.
--
-- SECURITY DEFINER porque tiene que poder listar deudores de CUALQUIER socio
-- del gym, no solo lo que el caller vería por su propia RLS. El guard de abajo
-- es lo que impide que sea un agujero: solo lo puede invocar un admin/owner
-- de ESE gym (desde el panel, para el bloque "Hoy le llegaría a...") o el
-- service role (el job, que no tiene sesión de usuario y por lo tanto
-- auth.role() = 'service_role' en vez de is_admin_of).
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
  select
    prof.id,
    prof.email,
    prof.name,
    prof.last_name,
    min(coalesce(s.due_date, s.start_date))                            as reference_due_date,
    (current_date - min(coalesce(s.due_date, s.start_date)))::integer  as days_overdue,
    sum(c.amount)::numeric(10,2)                                       as total_amount,
    count(*)::integer                                                  as items
  from public.memberships m
  join public.profiles prof on prof.user_id = m.user_id
  cross join lateral public.member_pending_charges(p_gym_id, prof.id) c
  join public.activity_subscriptions s on s.id = c.subscription_id
  where m.gym_id = p_gym_id
    and m.status = 'active'
  group by prof.id, prof.email, prof.name, prof.last_name
  having sum(c.amount) > 0;
end;
$$;

alter function public.gym_dunning_candidates(uuid) owner to postgres;

comment on function public.gym_dunning_candidates(uuid) is
  'Socios (cualquier rol, no solo member) con cuotas impagas en un gym, con el vencimiento de referencia y los días de atraso. Reusa member_pending_charges como única definición de deuda. La usa el panel (vista previa "a quién le llegaría hoy") y el job cobranza-recordatorios.';

revoke all on function public.gym_dunning_candidates(uuid) from public, anon;
grant execute on function public.gym_dunning_candidates(uuid) to authenticated, service_role;
