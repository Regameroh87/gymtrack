// Renovación del token OAuth de un gimnasio, del lado de las edge functions.
//
// ── Por qué existe si ya está en apps/web ───────────────────────────────────
// apps/web/lib/gym-mp/credentials.ts tiene `refreshTokens` y, encima,
// `getUsableAccessToken`, que renueva el token si está por vencer justo antes de
// usarlo. Es exactamente la red que hace falta acá — pero crear-cobro-socio es
// Deno y no puede importar de apps/web, así que leía el token crudo con
// gym_mp_get_credentials e ignoraba expires_at. Con el token vencido MP contesta
// 401 y el socio ve "MercadoPago no pudo generar el pago", sin nada que se
// autocorrija hasta la corrida siguiente del cron (una por día en Hobby).
//
// Este módulo es el equivalente mínimo para Deno: solo la renovación, sin el
// resto de la capa OAuth (el canje del code y el armado de la URL de
// autorización siguen siendo cosa de la web, que es donde el dueño conecta).
//
// El contrato con MP es el mismo que el de credentials.ts:152-160 — mismo
// endpoint, mismo grant_type, mismo parseo de expires_in a fecha absoluta.
//
// Variables de entorno requeridas:
//   MP_OAUTH_CLIENT_ID     – application_id de la app de marketplace
//   MP_OAUTH_CLIENT_SECRET – client secret de esa misma app
// Son los MISMOS valores que ya van en Vercel. Sin ellas la renovación no se
// puede intentar; el llamador decide qué hacer (crear-cobro-socio sigue con el
// token que tenga, que puede estar perfectamente vigente).

const MP_API = 'https://api.mercadopago.com'

export interface RefreshedTokens {
  accessToken: string
  refreshToken: string | null
  mpUserId: string
  publicKey: string | null
  /** Absoluto, ya resuelto desde el expires_in relativo que devuelve MP. */
  expiresAt: string | null
  liveMode: boolean
}

/** ¿Están las credenciales de la app de marketplace en el entorno? */
export function hasOAuthApp(): boolean {
  return !!Deno.env.get('MP_OAUTH_CLIENT_ID') && !!Deno.env.get('MP_OAUTH_CLIENT_SECRET')
}

/**
 * ¿Este token conviene renovarlo ya?
 *
 * El margen es el mismo que usa getUsableAccessToken en la web (24 h): renovar
 * antes de que venza evita la carrera entre el vencimiento y el pago. Un
 * expires_at nulo se trata como "no se sabe" y no dispara nada: la fila puede
 * venir de una conexión vieja y forzar una renovación a ciegas en pleno cobro es
 * peor que usar el token que hay.
 */
const RENEW_MARGIN_MS = 24 * 60 * 60 * 1000

export function needsRefresh(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const ms = Date.parse(expiresAt)
  if (Number.isNaN(ms)) return false
  return ms - Date.now() < RENEW_MARGIN_MS
}

/**
 * Canjea el refresh token por un par nuevo.
 *
 * Lanza si MP no contesta 200. El detalle que se propaga es el que devolvió MP,
 * nunca el body que mandamos: ahí va el client_secret de la aplicación.
 */
export async function refreshGymToken(refreshToken: string): Promise<RefreshedTokens> {
  const clientId = Deno.env.get('MP_OAUTH_CLIENT_ID')
  const clientSecret = Deno.env.get('MP_OAUTH_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET no configurados')
  }

  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`MercadoPago /oauth/token respondió ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()

  // expires_in viene en segundos y es relativo al momento de la respuesta. Se
  // guarda absoluto porque quien lo lee compara contra now(): un valor relativo
  // guardado en la fila envejece y deja de significar nada.
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : null

  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    mpUserId: String(data.user_id),
    publicKey: data.public_key ? String(data.public_key) : null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    liveMode: data.live_mode !== false,
  }
}
