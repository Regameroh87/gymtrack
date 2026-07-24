// Webhook de MercadoPago para suscripciones SaaS de GymTrack.
// Eventos manejados:
//   subscription_preapproval       → authorized (→ trialing) | cancelled (baja) | paused (→ past_due)
//   subscription_authorized_payment → pago exitoso (→ active, actualiza period_end)
//
// Sobre 'cancelled': NO pasa el gym a solo-lectura en el acto. La baja respeta
// el período ya pagado (access_until); ver el bloque en handlePreapprovalEvent.
//
// Variables de entorno requeridas:
//   MP_ACCESS_TOKEN     – access token de la app MP real de GymTrack
//   MP_WEBHOOK_SECRET   – clave secreta de esa app (Tus integraciones > Webhooks)
// Opcionales, para poder probar sin pisar producción:
//   MP_TEST_APPLICATION_ID – id de la aplicación del vendedor de prueba
//   MP_ACCESS_TOKEN_TEST   – access token de esa aplicación
//   MP_WEBHOOK_SECRET_TEST – clave secreta de esa aplicación

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const MP_API = 'https://api.mercadopago.com'

// ── Selección de credenciales según la app que notifica ──────────────────────
// El proyecto de Supabase es uno solo: esta función está deployada una única vez
// y atiende tanto los avisos de la app real como los del vendedor de prueba. No
// sirve una env var "de entorno" porque acá no hay dos entornos, hay un solo
// deploy — la única señal disponible es de qué aplicación viene cada aviso.
//
// application_id llega en TODA notificación de MP, pero a veces como string y a
// veces como number (verificado sobre saas_subscription_events), así que se
// compara normalizado.
interface MpCreds {
  token: string | undefined
  secret: string | undefined
  isTest: boolean
}

function resolveMpCreds(applicationId: unknown): MpCreds {
  const testAppId = Deno.env.get('MP_TEST_APPLICATION_ID')
  const isTest = !!testAppId && String(applicationId ?? '') === testAppId

  if (isTest) {
    return {
      token: Deno.env.get('MP_ACCESS_TOKEN_TEST'),
      secret: Deno.env.get('MP_WEBHOOK_SECRET_TEST'),
      isTest: true,
    }
  }
  return {
    token: Deno.env.get('MP_ACCESS_TOKEN'),
    secret: Deno.env.get('MP_WEBHOOK_SECRET'),
    isTest: false,
  }
}

// ── Validación de firma HMAC-SHA256 ─────────────────────────────────────────
// Formato del header x-signature: ts={timestamp},v1={hex_hash}
// Manifest: id:{data_id};request-id:{x_request_id};ts:{ts};
// (se omite cualquier campo ausente)
//
// El secret entra por parámetro porque cada aplicación de MP tiene el suyo. Que
// el body elija con qué clave se valida no debilita nada: quien manda el aviso
// igual tiene que firmar con esa clave, y no la tiene.
async function validateMpSignature(
  req: Request,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) {
    console.warn('[mp-webhook] Sin secret para esta app; saltando validación de firma.')
    return true
  }

  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id') ?? ''

  // Parsear ts y v1 del header
  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.split('=')),
  )
  const ts = parts['ts'] ?? ''
  const v1 = parts['v1'] ?? ''
  if (!ts || !v1) return false

  // Construir manifest incluyendo solo los valores presentes
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

// ── MP API helpers ────────────────────────────────────────────────────────────
// Lleva el status para poder distinguir "este recurso no es mío / no existe"
// (4xx, reintentar no sirve) de una caída de MP (5xx, sí conviene reintentar).
class MpApiError extends Error {
  constructor(readonly status: number, path: string) {
    super(`MP API error ${status} on GET ${path}`)
    this.name = 'MpApiError'
  }
}

async function mpGet(path: string, token: string) {
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new MpApiError(res.status, path)
  return res.json()
}

// ¿El recurso es inaccesible de forma definitiva? Pasa con la simulación del
// panel de MP (manda data.id 123456) y con recursos de otra cuenta. Devolver
// 500 en esos casos hace que MP reintente en loop un evento que nunca va a
// poder procesarse, y encima marca la URL como caída al validarla.
const esDefinitivo = (err: unknown) =>
  err instanceof MpApiError && err.status >= 400 && err.status < 500

// ── Mapeo de status MP → nuestro status ──────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  authorized: 'trialing',
  cancelled: 'canceled',
  paused: 'past_due',
}

// Columnas que necesita el manejo de bajas: sin cancel_at_period_end no se puede
// distinguir el eco de nuestra propia cancelación de una baja hecha en MP.
const GYM_SUB_COLUMNS =
  'id, gym_id, cancel_at_period_end, access_until, current_period_end, trial_ends_at'

interface GymSubRow {
  id: string
  gym_id: string
  cancel_at_period_end: boolean | null
  access_until: string | null
  current_period_end: string | null
  trial_ends_at: string | null
}

const esFuturo = (iso: string | null) => !!iso && new Date(iso) > new Date()

// Hasta cuándo tiene acceso pago una fila. Se toma la más lejana de las dos
// fechas en vez de mirar el status: en trial la que vale es trial_ends_at y en
// active current_period_end, y la otra suele venir nula.
function accesoPagoHasta(sub: GymSubRow): string | null {
  const fechas = [sub.current_period_end, sub.trial_ends_at].filter(esFuturo)
  if (!fechas.length) return null
  return fechas.reduce((a, b) => (new Date(a!) > new Date(b!) ? a : b))!
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const rawBody = await req.text()

  // El parseo va ANTES de validar la firma porque application_id (que sale del
  // body) es lo que decide con qué credenciales trabajar, secret incluido.
  let body: {
    type?: string
    action?: string
    data?: { id?: string }
    id?: number
    application_id?: string | number
  }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const creds = resolveMpCreds(body.application_id)

  const valid = await validateMpSignature(req, creds.secret)
  if (!valid) {
    console.error('[mp-webhook] Firma inválida.')
    return new Response('Unauthorized', { status: 401 })
  }

  const eventType = body.type ?? ''
  const resourceId = body.data?.id ?? ''
  const mpEventId = String(body.id ?? `${eventType}_${resourceId}_${Date.now()}`)

  // Idempotencia: si ya procesamos este evento, ignorar
  const { data: existing } = await supabaseAdmin
    .from('saas_subscription_events')
    .select('id')
    .eq('mp_event_id', mpEventId)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  console.log(
    `[mp-webhook] Evento ${eventType} id=${resourceId} (${creds.isTest ? 'prueba' : 'producción'})`,
  )

  if (!creds.token) {
    // Sin token no se puede leer el recurso en MP. Pasa si llega un aviso de la
    // app de prueba y MP_ACCESS_TOKEN_TEST no está cargado. 200 igual: reintentar
    // no lo va a arreglar, es config faltante de nuestro lado.
    console.error(
      `[mp-webhook] Sin access token para application_id=${body.application_id}; evento descartado.`,
    )
    await logEvent(null, mpEventId, eventType, rawBody)
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  try {
    if (eventType === 'subscription_preapproval') {
      await handlePreapprovalEvent(resourceId, mpEventId, rawBody, creds.token)
    } else if (eventType === 'subscription_authorized_payment') {
      await handleAuthorizedPaymentEvent(resourceId, mpEventId, rawBody, creds.token)
    } else {
      // Evento no manejado; logueamos pero respondemos 200 para que MP no reintente
      console.log(`[mp-webhook] Tipo de evento ignorado: ${eventType}`)
    }
  } catch (err: unknown) {
    console.error('[mp-webhook] Error procesando evento:', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})

// ── Preapproval: authorized | cancelled | paused ──────────────────────────────
async function handlePreapprovalEvent(
  preapprovalId: string,
  mpEventId: string,
  rawBody: string,
  token: string,
) {
  let preapproval: Record<string, string>
  try {
    preapproval = await mpGet(`/preapproval/${preapprovalId}`, token)
  } catch (err) {
    if (!esDefinitivo(err)) throw err
    console.warn(
      `[mp-webhook] preapproval ${preapprovalId} inaccesible; se descarta el evento`,
    )
    await logEvent(null, mpEventId, 'subscription_preapproval', rawBody)
    return
  }

  const mpStatus: string = preapproval.status ?? ''
  const externalRef: string = preapproval.external_reference ?? ''

  // Buscar la suscripción del gym: primero por mp_preapproval_id, luego por external_reference
  let gymSub: GymSubRow | null = null

  const { data: byId } = await supabaseAdmin
    .from('gym_saas_subscriptions')
    .select(GYM_SUB_COLUMNS)
    .eq('mp_preapproval_id', preapprovalId)
    .maybeSingle()

  if (byId) {
    gymSub = byId
  } else if (externalRef) {
    const { data: byRef } = await supabaseAdmin
      .from('gym_saas_subscriptions')
      .select(GYM_SUB_COLUMNS)
      .eq('gym_id', externalRef)
      .maybeSingle()
    gymSub = byRef ?? null
  }

  if (!gymSub) {
    console.warn(`[mp-webhook] No se encontró gym para preapproval ${preapprovalId}`)
    await logEvent(null, mpEventId, 'subscription_preapproval', rawBody)
    return
  }

  const newStatus = STATUS_MAP[mpStatus]
  if (!newStatus) {
    console.log(`[mp-webhook] Status de preapproval no mapeado: ${mpStatus}`)
    await logEvent(gymSub.id, mpEventId, 'subscription_preapproval', rawBody)
    return
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    mp_preapproval_id: preapprovalId,
  }

  if (newStatus === 'trialing') {
    // trial_ends_at = fecha de inicio del primer cobro
    const startDate: string = preapproval.auto_recurring?.start_date
    updates.trial_ends_at = startDate ?? new Date(Date.now() + 14 * 86400_000).toISOString()
    updates.payer_email = preapproval.payer_email ?? null

    // Reactivación: el owner volvió a autorizar un preapproval, así que la baja
    // pendiente queda sin efecto. Si no se limpiara, el cron finalize seguiría
    // viendo la baja vieja y apagaría un gym que acaba de pagar.
    updates.cancel_at_period_end = false
    updates.cancel_requested_at = null
    updates.cancel_reason = null
    updates.cancel_feedback = null
    updates.access_until = null
    updates.canceled_at = null
  }

  if (newStatus === 'canceled') {
    // Baja ya programada desde el panel: este aviso es el eco de nuestro propio
    // PUT /preapproval. Pisar el status acá cortaría la escritura hoy mismo,
    // que es exactamente lo que el período de gracia viene a evitar.
    if (gymSub.cancel_at_period_end && esFuturo(gymSub.access_until)) {
      await logEvent(gymSub.id, mpEventId, 'subscription_preapproval', rawBody)
      console.log(
        `[mp-webhook] gym ${gymSub.gym_id}: baja ya programada hasta ${gymSub.access_until}; status sin cambios`,
      )
      return
    }

    // Cancelación hecha por fuera de GymTrack (app de MP). Se le da el mismo
    // período de gracia que a la baja del panel: si no, cancelar afuera
    // castigaría más que cancelar acá, y el owner igual pagó el mes.
    const accessUntil = accesoPagoHasta(gymSub) ?? new Date().toISOString()

    updates.cancel_at_period_end = true
    updates.cancel_requested_at = new Date().toISOString()
    updates.access_until = accessUntil
    updates.canceled_at = new Date().toISOString()

    // El status se toca solo si el acceso ya venció; si queda período pagado, la
    // fila sigue active/trialing y el cron finalize la cierra a su hora.
    if (esFuturo(accessUntil)) delete updates.status
  }

  await supabaseAdmin
    .from('gym_saas_subscriptions')
    .update(updates)
    .eq('id', gymSub.id)

  await logEvent(gymSub.id, mpEventId, 'subscription_preapproval', rawBody)
  console.log(
    `[mp-webhook] gym ${gymSub.gym_id} → ${updates.status ?? 'status sin cambios'}`,
  )
}

// ── Authorized payment: pago exitoso del período ──────────────────────────────
async function handleAuthorizedPaymentEvent(
  paymentId: string,
  mpEventId: string,
  rawBody: string,
  token: string,
) {
  // Obtener detalles del pago autorizado
  let payment: Record<string, unknown>
  try {
    payment = await mpGet(`/authorized_payments/${paymentId}`, token)
  } catch (err) {
    // Solo se descarta si el recurso es inaccesible de forma definitiva; ante
    // una caída de MP se propaga para responder 500 y que reintente.
    if (!esDefinitivo(err)) throw err
    console.warn(`[mp-webhook] No se pudo obtener authorized_payment ${paymentId}`)
    await logEvent(null, mpEventId, 'subscription_authorized_payment', rawBody)
    return
  }

  const preapprovalId = (payment.preapproval_id as string) ?? ''

  const { data: gymSub } = await supabaseAdmin
    .from('gym_saas_subscriptions')
    .select('id, gym_id')
    .eq('mp_preapproval_id', preapprovalId)
    .maybeSingle()

  if (!gymSub) {
    console.warn(`[mp-webhook] No se encontró gym para preapproval ${preapprovalId}`)
    await logEvent(null, mpEventId, 'subscription_authorized_payment', rawBody)
    return
  }

  // MP notifica el authorized_payment tanto si el cobro salió como si lo
  // rechazaron (status 'recycling' mientras reintenta). Activar sin mirar el
  // resultado regala un período: pasó con el cobro rechazado por
  // cc_rejected_high_risk, que igual dejó current_period_end a 30 días.
  const paymentStatus = (payment.payment as { status?: string } | undefined)?.status

  if (paymentStatus !== 'approved') {
    // past_due: MP sigue reintentando; si termina cobrando llega otro evento
    // con approved y ahí sí se extiende el período.
    await supabaseAdmin
      .from('gym_saas_subscriptions')
      .update({ status: 'past_due' })
      .eq('id', gymSub.id)

    await logEvent(gymSub.id, mpEventId, 'subscription_authorized_payment', rawBody)
    console.log(
      `[mp-webhook] gym ${gymSub.gym_id} → past_due (pago ${paymentId} no aprobado: ${paymentStatus ?? 'sin status'})`,
    )
    return
  }

  // Calcular el fin del período actual (próximos 30 días)
  const currentPeriodEnd = new Date(Date.now() + 30 * 86400_000).toISOString()

  await supabaseAdmin
    .from('gym_saas_subscriptions')
    .update({ status: 'active', current_period_end: currentPeriodEnd })
    .eq('id', gymSub.id)

  await logEvent(gymSub.id, mpEventId, 'subscription_authorized_payment', rawBody)
  console.log(`[mp-webhook] gym ${gymSub.gym_id} → active (pago ${paymentId})`)
}

// ── Log de evento ─────────────────────────────────────────────────────────────
async function logEvent(
  gymSubscriptionId: string | null,
  mpEventId: string,
  eventType: string,
  rawBody: string,
) {
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = rawBody
  }

  await supabaseAdmin.from('saas_subscription_events').insert({
    gym_subscription_id: gymSubscriptionId,
    mp_event_id: mpEventId,
    event_type: eventType,
    payload,
  })
}
