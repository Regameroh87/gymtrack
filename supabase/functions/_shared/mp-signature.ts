// Validación de la firma de los webhooks de MercadoPago.
//
// Extraído de mp-webhook para que lo comparta mp-gym-webhook: son dos flujos de
// plata distintos (el abono que nos paga el gym y la cuota que le paga el socio)
// pero MP firma los avisos igual en los dos.
//
// Formato del header x-signature: ts={timestamp},v1={hex_hash}
// Manifest: id:{data_id};request-id:{x_request_id};ts:{ts};
// (se omite cualquier campo ausente)
//
// El secret entra por parámetro porque cada aplicación de MP tiene el suyo. Que
// el body elija con qué clave se valida no debilita nada: quien manda el aviso
// igual tiene que firmar con esa clave, y no la tiene.
//
// ── Sin secret se rechaza ───────────────────────────────────────────────────
// Antes esta función devolvía true cuando el secret no estaba configurado, con
// un warning en los logs. En los hechos eso dejaba los dos webhooks abiertos a
// cualquiera que supiera la URL —uno muta suscripciones, el otro salda cuotas—
// y justo en el estado más fácil de pasar por alto: el de "todavía no cargué los
// secrets". Un aviso que no se puede validar no se procesa.

export async function validateMpSignature(
  req: Request,
  secret: string | undefined,
  logPrefix = 'mp-signature',
): Promise<boolean> {
  // Se distingue del "no coincide" de abajo a propósito: son dos problemas
  // distintos y el log tiene que decir cuál es. Este se arregla cargando el
  // secret en Edge Functions → Secrets, el otro no.
  if (!secret) {
    console.error(
      `[${logPrefix}] Sin secret configurado para esta app; aviso rechazado. ` +
        `Cargar el secret en Supabase → Edge Functions → Secrets.`,
    )
    return false
  }

  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.split('=')),
  )
  const ts = parts['ts'] ?? ''
  const v1 = parts['v1'] ?? ''
  if (!ts || !v1) return false

  const segments: string[] = []
  if (dataId) segments.push(`id:${dataId.toLowerCase()}`)
  if (xRequestId) segments.push(`request-id:${xRequestId}`)
  segments.push(`ts:${ts}`)
  const manifest = segments.join(';') + ';'

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === v1
}

/**
 * Error de la API de MP que lleva el status.
 *
 * Sirve para distinguir "este recurso no es mío / no existe" (4xx, reintentar no
 * sirve) de una caída de MP (5xx, sí conviene reintentar).
 */
export class MpApiError extends Error {
  constructor(readonly status: number, path: string) {
    super(`MP API error ${status} on GET ${path}`)
    this.name = 'MpApiError'
  }
}

export async function mpGet(apiBase: string, path: string, token: string) {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new MpApiError(res.status, path)
  return res.json()
}

/**
 * ¿El recurso es inaccesible de forma definitiva? Pasa con la simulación del
 * panel de MP (manda data.id 123456) y con recursos de otra cuenta. Devolver
 * 500 en esos casos hace que MP reintente en loop un evento que nunca va a
 * poder procesarse, y encima marca la URL como caída al validarla.
 */
export const esDefinitivo = (err: unknown) =>
  err instanceof MpApiError && err.status >= 400 && err.status < 500
