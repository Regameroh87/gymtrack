-- Registro propio de los preapprovals de MercadoPago.
--
-- Motivo: NO se puede preguntarle a MP "qué preapprovals tiene este gym".
-- Verificado contra la API el 2026-07-25 con el token del vendedor de prueba:
--
--   GET /preapproval/search?external_reference=<gym_id>  → 14 resultados
--   GET /preapproval/search                              → los MISMOS 14
--
-- external_reference se IGNORA como filtro (status sí funciona). Y paginar no
-- salva: offset=0 y offset=5 devolvieron ids repetidos entre sí, o sea que sin
-- orden estable las páginas se solapan y se pierden filas.
--
-- Eso hacía que cancelarPreapprovalsHuerfanos (mp-webhook) creyera estar
-- filtrando por gym cuando en realidad recorría TODOS los preapprovals del
-- colector: con un solo gym no se notaba, con varios el primer 'authorized' de
-- cualquiera daba de baja las suscripciones vivas de los demás.
--
-- La única fuente confiable somos nosotros: el checkout es el único que crea
-- preapprovals, así que los anota acá. Después alcanza con GET /preapproval/{id}
-- (ese sí es exacto) para saber en qué estado está cada uno.
--
-- La tabla es un log de ids, no una segunda fuente de verdad del estado de la
-- suscripción: eso sigue siendo gym_saas_subscriptions. Acá solo interesa "qué
-- preapprovals existen para este gym y cuáles ya dimos de baja".

create table if not exists public.saas_preapprovals (
  mp_preapproval_id  text primary key,
  gym_id             uuid not null references public.gyms(id) on delete cascade,
  -- App de MP que lo creó: define con qué token se lo puede cancelar.
  mp_application_id  text,
  payer_email        text,
  created_at         timestamptz not null default now(),
  -- Sellado cuando lo cancelamos, para no reintentar en cada corrida del reaper.
  canceled_at        timestamptz
);

comment on table public.saas_preapprovals is
  'Preapprovals de MP creados por el checkout. Existe porque /preapproval/search ignora external_reference y no se puede paginar de forma estable: sin este registro no hay manera de saber qué preapprovals son de qué gym.';

-- Los que todavía pueden cobrar: es la única consulta que hace el reaper.
create index if not exists saas_preapprovals_gym_pendientes_idx
  on public.saas_preapprovals (gym_id)
  where canceled_at is null;

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Los ids que las suscripciones ya venían guardando. Los superados por un
-- checkout posterior no están en ninguna parte y quedan perdidos: se cancelan a
-- mano en el panel de MP (para el vendedor de prueba, todos los 'pending').
insert into public.saas_preapprovals (
  mp_preapproval_id, gym_id, mp_application_id, payer_email, created_at, canceled_at
)
select s.mp_preapproval_id,
       s.gym_id,
       s.mp_application_id,
       s.payer_email,
       s.created_at,
       -- Una suscripción cancelada/vencida ya no tiene el cobro vivo.
       case when s.status in ('canceled', 'expired') then s.updated_at end
  from public.gym_saas_subscriptions s
 where s.mp_preapproval_id is not null
on conflict (mp_preapproval_id) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Escribe solo el service_role (checkout, webhook, reaper). El staff de
-- plataforma lee para poder auditar desde el panel.

alter table public.saas_preapprovals enable row level security;

drop policy if exists saas_preapprovals_select on public.saas_preapprovals;
create policy saas_preapprovals_select on public.saas_preapprovals
  for select to authenticated
  using (public.is_platform_admin() is true);

grant select on public.saas_preapprovals to authenticated;
grant all on public.saas_preapprovals to service_role;
