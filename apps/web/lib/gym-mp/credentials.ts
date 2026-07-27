// Credenciales OAuth de MercadoPago, una por gimnasio.
//
// Es el otro sentido de la flecha respecto de lib/saas/mp-preapprovals: allá la
// plataforma le cobra el abono al gym con SU token (uno solo, en env). Acá el
// gym le cobra al socio, la plata cae en la cuenta del gimnasio, y para operar
// en su nombre hace falta un token delegado por cada uno.
//
// Los tokens NO se manipulan desde acá: viven en Vault y se tocan a través de
// los wrappers de la migración 20260726120000, que son los únicos con permiso.
// Este módulo es la capa que habla con la API de MercadoPago y traduce.
//
// Variables de entorno requeridas (server-side):
//   MP_OAUTH_CLIENT_ID        – application_id de la app de marketplace
//   MP_OAUTH_CLIENT_SECRET    – client secret de esa misma app
//   SUPABASE_SERVICE_ROLE_KEY – los wrappers de Vault solo aceptan service_role

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase-config";
import { APP_URL } from "@/lib/site";
import { MP_API } from "@/lib/saas/mp-preapprovals";

// El authorization endpoint NO está en api.mercadopago.com: es el sitio donde el
// dueño del gym se loguea con su cuenta y aprueba. Solo el canje del code va
// contra la API.
const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";

/** Redirect URI registrado en el panel de MP. Tiene que coincidir exacto. */
export const MP_OAUTH_REDIRECT_URI = `${APP_URL}/api/gym-mp/callback`;

/**
 * Cookie httpOnly con el `state` del OAuth, que /connect escribe y /callback
 * verifica. Vive acá y no en el route porque un route.ts del App Router solo
 * admite los exports que Next reconoce (GET, POST, dynamic…): exportar una
 * constante desde ahí rompe el build con "does not match the required types".
 */
export const OAUTH_STATE_COOKIE = "gym_mp_oauth_state";

/**
 * Cliente con service role. Los wrappers de Vault (gym_mp_*) tienen el EXECUTE
 * revocado para anon y authenticated, así que con la sesión del usuario no se
 * llega: es service role o nada.
 */
export function getServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  return createClient(SUPABASE_URL!, key, { auth: { persistSession: false } });
}

function oauthApp() {
  const clientId = process.env.MP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MP_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET no configurados");
  }
  return { clientId, clientSecret };
}

/** URL a la que se manda al owner para que autorice con su cuenta de MP. */
export function buildAuthorizationUrl(state: string): string {
  const { clientId } = oauthApp();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: MP_OAUTH_REDIRECT_URI,
  });
  return `${MP_AUTH_URL}?${params}`;
}

export interface MpOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  mpUserId: string;
  publicKey: string | null;
  /** Absoluto, ya resuelto desde el expires_in relativo que devuelve MP. */
  expiresAt: string | null;
  liveMode: boolean;
}

function parseTokenResponse(data: Record<string, unknown>): MpOAuthTokens {
  // expires_in viene en segundos y es relativo al momento de la respuesta. Se
  // guarda absoluto porque el cron de renovación compara contra now(): un valor
  // relativo guardado en la fila envejece y deja de significar nada.
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : null;

  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    mpUserId: String(data.user_id),
    publicKey: data.public_key ? String(data.public_key) : null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    // live_mode = false es un test user de MP. Es el único aislamiento que hay
    // en este flujo: con OAuth el gym conecta su cuenta real y no hay dos apps
    // que distinguir como en el flujo SaaS.
    liveMode: data.live_mode !== false,
  };
}

/**
 * Error de /oauth/token con el status a la vista.
 *
 * El status es lo que separa dos situaciones que se tratan al revés: un 5xx o
 * un fallo de red es transitorio y hay que reintentar más tarde, mientras que un
 * 4xx sobre un refresh token significa que ese token ya no sirve y el gym tiene
 * que volver a conectar. El cron de renovación decide en base a esto.
 */
export class MpOAuthError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`MercadoPago /oauth/token respondió ${status}: ${detail.slice(0, 300)}`);
    this.name = "MpOAuthError";
  }

  /** El token no sirve más: reintentar no lo va a arreglar. */
  get isPermanent(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

async function postToken(body: Record<string, string>): Promise<MpOAuthTokens> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Se propaga el detalle que devolvió MP, nunca el body que mandamos: ahí va
    // el client_secret de la aplicación.
    throw new MpOAuthError(res.status, await res.text());
  }

  return parseTokenResponse(await res.json());
}

/** Canjea el `code` del callback por el par de tokens del vendedor. */
export function exchangeCodeForTokens(code: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = oauthApp();
  return postToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: MP_OAUTH_REDIRECT_URI,
  });
}

/** Renueva un access token vencido (o por vencer) con el refresh token. */
export function refreshTokens(refreshToken: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = oauthApp();
  return postToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/** Guarda (o renueva) las credenciales de un gym en Vault. */
export async function storeCredentials(
  svc: SupabaseClient,
  gymId: string,
  tokens: MpOAuthTokens,
  connectedBy: string | null,
): Promise<void> {
  const { error } = await svc.rpc("gym_mp_store_credentials", {
    p_gym_id: gymId,
    p_mp_user_id: tokens.mpUserId,
    p_access_token: tokens.accessToken,
    p_refresh_token: tokens.refreshToken,
    p_public_key: tokens.publicKey,
    p_expires_at: tokens.expiresAt,
    p_live_mode: tokens.liveMode,
    p_connected_by: connectedBy,
  });

  if (error) {
    throw new Error(`No se pudieron guardar las credenciales de MP: ${error.message}`);
  }
}

export interface GymMpCredentials {
  mpUserId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  liveMode: boolean;
}

/**
 * Credenciales vigentes de un gym, o null si está desconectado.
 *
 * Lo que vuelve son tokens en claro: no logearlos, no devolverlos en una
 * respuesta HTTP y no pasarlos al cliente. Son la llave de la cuenta de
 * MercadoPago del gimnasio, no de la nuestra.
 */
export async function getCredentials(
  svc: SupabaseClient,
  gymId: string,
): Promise<GymMpCredentials | null> {
  const { data, error } = await svc.rpc("gym_mp_get_credentials", { p_gym_id: gymId });

  if (error) {
    throw new Error(`No se pudieron leer las credenciales de MP: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.access_token) return null;

  return {
    mpUserId: row.mp_user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? null,
    expiresAt: row.expires_at ?? null,
    liveMode: row.live_mode !== false,
  };
}

/**
 * Token listo para usar contra la API de MP, renovándolo si está por vencer.
 *
 * Existe además del cron: el cron es la red que evita que un gym se quede sin
 * cobrar mientras nadie mira, pero si una corrida falló o el gym estuvo meses
 * inactivo, el token puede llegar vencido justo cuando un socio va a pagar.
 * Renovar en el momento del uso es lo que hace que ese caso no se note.
 */
export async function getUsableAccessToken(
  svc: SupabaseClient,
  gymId: string,
): Promise<string | null> {
  const creds = await getCredentials(svc, gymId);
  if (!creds) return null;

  const RENEW_MARGIN_MS = 24 * 60 * 60 * 1000;
  const expiresSoon =
    !!creds.expiresAt && Date.parse(creds.expiresAt) - Date.now() < RENEW_MARGIN_MS;

  if (!expiresSoon || !creds.refreshToken) return creds.accessToken;

  try {
    const renewed = await refreshTokens(creds.refreshToken);
    await storeCredentials(svc, gymId, renewed, null);
    return renewed.accessToken;
  } catch (err) {
    // Si la renovación falla se sigue con el token viejo: puede que todavía
    // sirva (el margen es de un día). Fallar acá dejaría al socio sin poder
    // pagar por un problema que quizás no lo afecta todavía.
    console.error(`[gym-mp] no se pudo renovar el token del gym ${gymId}:`, err);
    return creds.accessToken;
  }
}

/** Desconecta la cuenta: borra los secretos y apaga el interruptor de cobros. */
export async function revokeCredentials(
  svc: SupabaseClient,
  gymId: string,
): Promise<void> {
  const { error } = await svc.rpc("gym_mp_revoke", { p_gym_id: gymId });
  if (error) {
    throw new Error(`No se pudo desconectar la cuenta de MP: ${error.message}`);
  }
}
