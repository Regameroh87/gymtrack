-- Arregla la reconexión de una cuenta de MercadoPago: desconectar y volver a
-- conectar dejaba al gimnasio "conectado" pero sin token.
--
-- ── El bug ──────────────────────────────────────────────────────────────────
-- gym_mp_revoke borra los secretos de Vault pero deja la fila de
-- gym_mp_accounts como registro de que la cuenta existió — y con ella los
-- token_secret_id / refresh_secret_id apuntando a secretos que ya no están.
--
-- Al reconectar, gym_mp_store_credentials encontraba la fila y reusaba esos ids:
--
--   v_token_id := v_existing.token_secret_id;      -- id de un secreto borrado
--   perform vault.update_secret(v_token_id, ...);  -- UPDATE de CERO filas
--
-- vault.update_secret sobre un id inexistente no falla ni avisa: es un UPDATE
-- que no matchea nada. La función terminaba bien, la fila quedaba con el
-- mp_user_id y el expires_at nuevos y revoked_at en null — o sea, conectada —
-- pero el token nunca se guardaba.
--
-- Se veía recién al cobrar: gym_mp_get_credentials devolvía access_token null y
-- crear-cobro-socio respondía 409 "Este gimnasio no tiene una cuenta de
-- MercadoPago conectada", que apunta al lugar equivocado. Observado en el gym
-- d53e46c2 el 2026-07-27, entre una desconexión y la reconexión siguiente.
--
-- ── El arreglo ──────────────────────────────────────────────────────────────
-- Un id guardado deja de ser prueba de que el secreto existe: hay que mirarlo.
-- El helper de abajo resuelve el id contra Vault antes de decidir si actualiza o
-- crea, y gym_mp_revoke deja los ids en null para que la fila no vuelva a
-- apuntar a un secreto que borró ella misma.

-- ── Helper: guardar un secreto sin confiar en el id ──────────────────────────
--
-- No se otorga EXECUTE a nadie: la llama gym_mp_store_credentials, que es
-- SECURITY DEFINER de postgres y por lo tanto corre como el dueño de esta
-- función. Exponerla sería dar una primitiva de escritura directa sobre Vault.

create or replace function public.gym_mp_upsert_secret(
  p_secret_id   uuid,
  p_name        text,
  p_value       text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  select s.id into v_id from vault.secrets s where s.id = p_secret_id;

  -- Fallback por nombre: los nombres son únicos en Vault. Si quedó un secreto
  -- con este nombre pero otro id (fila reescrita a mano, restore parcial),
  -- create_secret chocaría contra el unique en vez de guardar el token.
  if v_id is null then
    select s.id into v_id from vault.secrets s where s.name = p_name;
  end if;

  if v_id is null then
    return vault.create_secret(p_value, p_name, p_description);
  end if;

  perform vault.update_secret(v_id, p_value);
  return v_id;
end;
$$;

alter function public.gym_mp_upsert_secret(uuid, text, text, text) owner to postgres;

comment on function public.gym_mp_upsert_secret(uuid, text, text, text) is
  'Crea o actualiza un secreto de Vault resolviendo primero si el id guardado sigue existiendo. Interna: la usa gym_mp_store_credentials y no tiene EXECUTE otorgado a ningún rol.';

revoke all on function public.gym_mp_upsert_secret(uuid, text, text, text)
  from public, anon, authenticated, service_role;

-- ── Guardado de credenciales ────────────────────────────────────────────────
-- Las dos ramas (alta y reconexión) se unifican en el helper: con la fila
-- ausente, v_existing queda en null y el helper crea igual.

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

  v_token_id := public.gym_mp_upsert_secret(
    v_existing.token_secret_id,
    'gym_mp_token_' || p_gym_id::text,
    p_access_token,
    'Access token de MercadoPago del gym ' || p_gym_id::text
  );

  if p_refresh_token is not null then
    v_refresh_id := public.gym_mp_upsert_secret(
      v_existing.refresh_secret_id,
      'gym_mp_refresh_' || p_gym_id::text,
      p_refresh_token,
      'Refresh token de MercadoPago del gym ' || p_gym_id::text
    );
  else
    -- El refresh de MP no viene en todas las respuestas de /oauth/token. Si no
    -- vino, se conserva el que ya había en vez de borrarlo.
    v_refresh_id := v_existing.refresh_secret_id;
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

-- ── Desconexión ─────────────────────────────────────────────────────────────
-- Igual que antes, más dejar los ids en null. Así vale el invariante que el bug
-- rompía: si hay secret_id, el secreto existe.

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
  set revoked_at        = now(),
      token_secret_id   = null,
      refresh_secret_id = null
  where gym_id = p_gym_id;

  -- Apagar el interruptor es parte de desconectar, no un paso aparte que la UI
  -- pueda olvidarse: sin cuenta, prendido no significa nada.
  update public.gyms
  set online_payments_enabled = false
  where id = p_gym_id;
end;
$$;

alter function public.gym_mp_revoke(uuid) owner to postgres;

-- token_secret_id era NOT NULL: la desconexión ahora lo deja en null.
alter table public.gym_mp_accounts
  alter column token_secret_id drop not null;

comment on column public.gym_mp_accounts.token_secret_id is
  'Id del secreto de Vault con el access token. Null cuando la cuenta está desconectada: gym_mp_revoke borra el secreto y limpia el puntero para que nadie lo reuse.';

-- ── Filas ya rotas ──────────────────────────────────────────────────────────
-- Las que quedaron apuntando a secretos borrados por la versión anterior de
-- gym_mp_revoke. Sin esto siguen mintiendo hasta la próxima desconexión.

update public.gym_mp_accounts a
set token_secret_id = null
where a.token_secret_id is not null
  and not exists (select 1 from vault.secrets s where s.id = a.token_secret_id);

update public.gym_mp_accounts a
set refresh_secret_id = null
where a.refresh_secret_id is not null
  and not exists (select 1 from vault.secrets s where s.id = a.refresh_secret_id);

-- El revoke/grant de gym_mp_store_credentials y gym_mp_revoke se hereda de
-- 20260726120000: CREATE OR REPLACE conserva los privilegios de la función.
