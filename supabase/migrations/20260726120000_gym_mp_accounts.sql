-- Cobros online del gym a sus socios: la cuenta de MercadoPago del gimnasio y
-- el interruptor que los habilita.
--
-- Hasta acá MercadoPago aparecía en el proyecto una sola vez: la plataforma le
-- cobra el abono al gym con SU token (MP_ACCESS_TOKEN, una app, una cuenta).
-- Esto es el otro sentido de la flecha — el gym le cobra al socio — y la plata
-- tiene que caer en la cuenta del gimnasio, no en la nuestra. Eso es el modelo
-- marketplace de MP: cada gym autoriza por OAuth y nosotros operamos en su
-- nombre con un token delegado, uno por gimnasio.
--
-- ── Por qué DOS estados y no uno ────────────────────────────────────────────
-- "Tiene cuenta conectada" (gym_mp_accounts) y "los cobros están prendidos"
-- (gyms.online_payments_enabled) son cosas distintas a propósito. Con un solo
-- estado, apagar los cobros obliga a desconectar, y volver a prenderlos obliga
-- al owner a rehacer todo el OAuth. Separados, se puede pausar por un problema
-- —o conectar y probar antes de abrirlo a los socios— sin tocar el token.
--
-- La dependencia va en un solo sentido y la fuerza un trigger, no la UI:
-- prendido sin cuenta vigente es un estado que no significa nada, y la app
-- móvil lo usa para decidir si le muestra el botón de pagar al socio.

-- ── El interruptor ──────────────────────────────────────────────────────────

alter table public.gyms
  add column if not exists online_payments_enabled boolean not null default false;

comment on column public.gyms.online_payments_enabled is
  'Cobros online al socio habilitados por el owner. Nace apagado y solo puede prenderse con una cuenta de MP vigente en gym_mp_accounts (lo fuerza gyms_online_payments_need_account). Es lo que la app móvil consulta para mostrar o no el botón de pagar.';

-- ── La cuenta conectada ─────────────────────────────────────────────────────
--
-- Los tokens NO viven acá: van a Vault y la fila guarda solo el id del secreto.
-- Un access token de OAuth es la llave de la cuenta de MercadoPago de un
-- tercero — filtrarlo no compromete nuestra cuenta, compromete la del
-- gimnasio, que es peor. Se leen únicamente con service role, vía los wrappers
-- del final de este archivo.

create table if not exists public.gym_mp_accounts (
  gym_id            uuid primary key references public.gyms(id) on delete cascade,
  mp_user_id        text not null,
  token_secret_id   uuid not null,
  refresh_secret_id uuid,
  public_key        text,
  expires_at        timestamptz,
  live_mode         boolean not null default true,
  connected_at      timestamptz not null default now(),
  connected_by      uuid references public.profiles(id) on delete set null,
  revoked_at        timestamptz,
  updated_at        timestamptz not null default now()
);

comment on table public.gym_mp_accounts is
  'Cuenta de MercadoPago que cada gym conectó por OAuth para cobrarle a sus socios. Una por gym. Los tokens están en Vault: acá solo viven los ids de los secretos.';

comment on column public.gym_mp_accounts.mp_user_id is
  'user_id del vendedor en MercadoPago. Es lo que identifica la cuenta que va a recibir la plata.';

comment on column public.gym_mp_accounts.expires_at is
  'Vencimiento del access token. Lo renueva el cron refresh-mp-tokens antes de que caduque: si vence, el gym deja de poder cobrar sin que nadie se entere.';

comment on column public.gym_mp_accounts.live_mode is
  'false = la cuenta conectada es un test user de MP. Es el único aislamiento posible acá: a diferencia del flujo SaaS, con OAuth el gym conecta su cuenta real y no hay dos apps que distinguir.';

comment on column public.gym_mp_accounts.revoked_at is
  'Desconexión. La fila se conserva para auditoría, pero deja de contar como cuenta vigente y apaga el interruptor.';

create index if not exists gym_mp_accounts_active_idx
  on public.gym_mp_accounts (gym_id)
  where revoked_at is null;

create or replace trigger gym_mp_accounts_set_updated_at
  before update on public.gym_mp_accounts
  for each row execute function public.set_updated_at();

-- ── RLS: se ve el estado, nunca el token ────────────────────────────────────
--
-- Acá hacen falta DOS límites, porque hacen cosas distintas:
--
--   RLS      → qué FILAS. El staff ve la de su gym y ninguna otra.
--   grants   → qué COLUMNAS. Los *_secret_id no salen para nadie que no sea
--              service_role.
--
-- La RLS sola no alcanza: una política de SELECT habilita la fila entera, así
-- que el staff se llevaría también los ids de los secretos de Vault. No son el
-- secreto —para canjearlos hay que poder leer vault.decrypted_secrets, que
-- authenticated no puede— pero son la clase de dato que no tiene por qué salir
-- de la base, y el día que alguien agregue una columna sensible acá el grant ya
-- está puesto.

alter table public.gym_mp_accounts enable row level security;

drop policy if exists gym_mp_accounts_super_admin on public.gym_mp_accounts;
create policy gym_mp_accounts_super_admin on public.gym_mp_accounts
  using (public.is_super_admin() is true)
  with check (public.is_super_admin() is true);

drop policy if exists gym_mp_accounts_staff_select on public.gym_mp_accounts;
create policy gym_mp_accounts_staff_select on public.gym_mp_accounts
  for select to authenticated
  using (public.is_staff_of(gym_id));

-- Supabase otorga privilegios amplios a anon/authenticated por default sobre lo
-- que se crea en public, así que esto es un revoke y no una omisión: si no se
-- saca lo que ya viene puesto, el grant por columna de abajo no limita nada.
revoke all on public.gym_mp_accounts from anon, authenticated;

grant select (
  gym_id, mp_user_id, live_mode, connected_at, connected_by, revoked_at, updated_at
) on public.gym_mp_accounts to authenticated;

-- La vista es la superficie que consulta la UI. Existe por ergonomía: con
-- grants por columna, un `select *` contra la tabla falla con permiso denegado,
-- y esto evita que cada consumidor tenga que enumerar columnas a mano.
-- security_invoker deja que la RLS y los grants de la tabla base sigan mandando
-- — la vista no agrega permisos, solo nombra los que ya hay.
create or replace view public.gym_mp_account_status
with (security_invoker = true) as
  select
    gym_id,
    mp_user_id,
    live_mode,
    connected_at,
    connected_by,
    revoked_at,
    (revoked_at is null) as is_connected
  from public.gym_mp_accounts;

comment on view public.gym_mp_account_status is
  'Lo único de gym_mp_accounts que ve un cliente: si el gym tiene cuenta conectada, cuál y desde cuándo. Sin los ids de los secretos de Vault.';

grant select on public.gym_mp_account_status to authenticated;

-- ── El interruptor no se puede prender en el aire ───────────────────────────
--
-- Se valida en la base y no solo en la ruta que lo prende: online_payments_enabled
-- es lo que habilita el endpoint de cobro, y un true sin cuenta detrás lo deja
-- fallando contra MercadoPago con el socio mirando la pantalla.

create or replace function public.guard_online_payments_enabled()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.online_payments_enabled and not coalesce(old.online_payments_enabled, false) then
    if not exists (
      select 1
      from public.gym_mp_accounts a
      where a.gym_id = new.id
        and a.revoked_at is null
    ) then
      raise exception 'No se pueden habilitar los cobros online sin una cuenta de MercadoPago conectada';
    end if;
  end if;

  return new;
end;
$$;

alter function public.guard_online_payments_enabled() owner to postgres;

create or replace trigger gyms_online_payments_need_account
  before update of online_payments_enabled on public.gyms
  for each row execute function public.guard_online_payments_enabled();

-- ── Credenciales: Vault detrás de wrappers de service role ──────────────────
--
-- PostgREST expone únicamente los schemas public y graphql_public (config.toml),
-- así que vault.create_secret no es invocable con supabase.rpc(). De ahí estos
-- wrappers.
--
-- SECURITY DEFINER solo no alcanza: una función definer es ejecutable por
-- cualquiera que tenga EXECUTE, y por defecto eso incluye a authenticated. Sin
-- el revoke de abajo, cualquier usuario logueado podría pedir el token de
-- MercadoPago de cualquier gimnasio y Vault no serviría de nada. El revoke es
-- la mitad importante de esto.

create or replace function public.gym_mp_store_credentials(
  p_gym_id        uuid,
  p_mp_user_id    text,
  p_access_token  text,
  p_refresh_token text,
  p_public_key    text,
  p_expires_at    timestamptz,
  p_live_mode     boolean,
  p_connected_by  uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing public.gym_mp_accounts%rowtype;
  v_token_id   uuid;
  v_refresh_id uuid;
begin
  select * into v_existing
  from public.gym_mp_accounts
  where gym_id = p_gym_id;

  -- Reconectar pisa los secretos existentes en vez de crear otros: si se
  -- crearan nuevos, los viejos quedarían en Vault para siempre sin nada que los
  -- referencie, y son tokens vivos de la cuenta de un tercero.
  if found then
    v_token_id := v_existing.token_secret_id;
    perform vault.update_secret(v_token_id, p_access_token);

    if p_refresh_token is not null then
      if v_existing.refresh_secret_id is null then
        v_refresh_id := vault.create_secret(
          p_refresh_token,
          'gym_mp_refresh_' || p_gym_id::text,
          'Refresh token de MercadoPago del gym ' || p_gym_id::text
        );
      else
        v_refresh_id := v_existing.refresh_secret_id;
        perform vault.update_secret(v_refresh_id, p_refresh_token);
      end if;
    else
      v_refresh_id := v_existing.refresh_secret_id;
    end if;
  else
    v_token_id := vault.create_secret(
      p_access_token,
      'gym_mp_token_' || p_gym_id::text,
      'Access token de MercadoPago del gym ' || p_gym_id::text
    );

    if p_refresh_token is not null then
      v_refresh_id := vault.create_secret(
        p_refresh_token,
        'gym_mp_refresh_' || p_gym_id::text,
        'Refresh token de MercadoPago del gym ' || p_gym_id::text
      );
    end if;
  end if;

  insert into public.gym_mp_accounts as a
    (gym_id, mp_user_id, token_secret_id, refresh_secret_id, public_key,
     expires_at, live_mode, connected_by, revoked_at)
  values
    (p_gym_id, p_mp_user_id, v_token_id, v_refresh_id, p_public_key,
     p_expires_at, coalesce(p_live_mode, true), p_connected_by, null)
  on conflict (gym_id) do update set
    mp_user_id        = excluded.mp_user_id,
    token_secret_id   = excluded.token_secret_id,
    refresh_secret_id = excluded.refresh_secret_id,
    public_key        = excluded.public_key,
    expires_at        = excluded.expires_at,
    live_mode         = excluded.live_mode,
    connected_by      = coalesce(excluded.connected_by, a.connected_by),
    -- Reconectar revive la fila: sin esto, un gym que se desconectó y volvió
    -- quedaba con revoked_at seteado y el trigger le seguía negando el switch.
    revoked_at        = null;
end;
$$;

alter function public.gym_mp_store_credentials(
  uuid, text, text, text, text, timestamptz, boolean, uuid
) owner to postgres;

comment on function public.gym_mp_store_credentials(
  uuid, text, text, text, text, timestamptz, boolean, uuid
) is
  'Guarda (o renueva) las credenciales OAuth de un gym en Vault y deja la fila apuntando a los secretos. La usan el callback de OAuth y el cron de renovación.';

-- Devuelve el par de tokens en claro. Es la única puerta de salida y por eso el
-- revoke de más abajo importa tanto como la función.
create or replace function public.gym_mp_get_credentials(p_gym_id uuid)
returns table (
  mp_user_id    text,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  live_mode     boolean
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    a.mp_user_id,
    (select s.decrypted_secret from vault.decrypted_secrets s where s.id = a.token_secret_id),
    (select s.decrypted_secret from vault.decrypted_secrets s where s.id = a.refresh_secret_id),
    a.expires_at,
    a.live_mode
  from public.gym_mp_accounts a
  where a.gym_id = p_gym_id
    and a.revoked_at is null;
$$;

alter function public.gym_mp_get_credentials(uuid) owner to postgres;

comment on function public.gym_mp_get_credentials(uuid) is
  'Tokens OAuth en claro de un gym con cuenta vigente. Cero filas si está desconectado. Solo service_role: ver el revoke al final del archivo.';

create or replace function public.gym_mp_revoke(p_gym_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_account public.gym_mp_accounts%rowtype;
begin
  select * into v_account
  from public.gym_mp_accounts
  where gym_id = p_gym_id;

  if not found then
    return;
  end if;

  -- El secreto se borra de Vault, no solo se marca la fila: dejar vivo el token
  -- de la cuenta de un gimnasio que pidió desconectarse es exactamente lo que
  -- desconectar tiene que evitar. La fila queda como registro de que existió.
  delete from vault.secrets where id = v_account.token_secret_id;
  if v_account.refresh_secret_id is not null then
    delete from vault.secrets where id = v_account.refresh_secret_id;
  end if;

  update public.gym_mp_accounts
  set revoked_at = now()
  where gym_id = p_gym_id;

  -- Apagar el interruptor es parte de desconectar, no un paso aparte que la UI
  -- pueda olvidarse: sin cuenta, prendido no significa nada.
  update public.gyms
  set online_payments_enabled = false
  where id = p_gym_id;
end;
$$;

alter function public.gym_mp_revoke(uuid) owner to postgres;

comment on function public.gym_mp_revoke(uuid) is
  'Desconecta la cuenta de MP de un gym: borra los secretos de Vault, marca revoked_at y apaga online_payments_enabled.';

-- ── El revoke ───────────────────────────────────────────────────────────────
-- Sin esto, las tres funciones de arriba quedan invocables por cualquier
-- usuario logueado y guardar los tokens en Vault no protege nada.

revoke all on function public.gym_mp_store_credentials(
  uuid, text, text, text, text, timestamptz, boolean, uuid
) from public, anon, authenticated;
revoke all on function public.gym_mp_get_credentials(uuid) from public, anon, authenticated;
revoke all on function public.gym_mp_revoke(uuid) from public, anon, authenticated;

grant execute on function public.gym_mp_store_credentials(
  uuid, text, text, text, text, timestamptz, boolean, uuid
) to service_role;
grant execute on function public.gym_mp_get_credentials(uuid) to service_role;
grant execute on function public.gym_mp_revoke(uuid) to service_role;
