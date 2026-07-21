// Webhook de MercadoPago para suscripciones SaaS de GymTrack.
// Eventos manejados:
//   subscription_preapproval       → authorized (→ trialing) | cancelled (→ canceled) | paused (→ past_due)
//   subscription_authorized_payment → pago exitoso (→ active, actualiza period_end)
//
// Variables de entorno requeridas:
//   MP_ACCESS_TOKEN     – access token de la app MP de GymTrack
//   MP_WEBHOOK_SECRET   – clave secreta configurada en Tus integraciones > Webhooks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const MP_API = 'https://api.mercadopago.com'

// ── Validación de firma HMAC-SHA256 ─────────────────────────────────────────
// Formato del header x-signature: ts={timestamp},v1={hex_hash}
// Manifest: id:{data_id};request-id:{x_request_id};ts:{ts};
// (se omite cualquier campo ausente)
async function validateMpSignature(
  req: Request,
  rawBody: string,
): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')
  if (!secret) {
    console.warn('[mp-webhook] MP_WEBHOOK_SECRET no configurado; saltando validación.')
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
async function mpGet(path: string) {
  const token = Deno.env.get('MP_ACCESS_TOKEN')
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`MP API error ${res.status} on GET ${path}`)
  return res.json()
}

// ── Mapeo de status MP → nuestro status ──────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  authorized: 'trialing',
  cancelled: 'canceled',
  paused: 'past_due',
}

// ── Handler principal ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const rawBody = await req.text()

  const valid = await validateMpSignature(req, rawBody)
  if (!valid) {
    console.error('[mp-webhook] Firma inválida.')
    return new Response('Unauthorized', { status: 401 })
  }

  let body: { type?: string; action?: string; data?: { id?: string }; id?: number }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
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

  console.log(`[mp-webhook] Evento ${eventType} id=${resourceId}`)

  try {
    if (eventType === 'subscription_preapproval') {
      await handlePreapprovalEvent(resourceId, mpEventId, rawBody)
    } else if (eventType === 'subscription_authorized_payment') {
      await handleAuthorizedPaymentEvent(resourceId, mpEventId, rawBody)
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
async function handlePreapprovalEvent(preapprovalId: string, mpEventId: string, rawBody: string) {
  const preapproval = await mpGet(`/preapproval/${preapprovalId}`)
  const mpStatus: string = preapproval.status ?? ''
  const externalRef: string = preapproval.external_reference ?? ''

  // Buscar la suscripción del gym: primero por mp_preapproval_id, luego por external_reference
  let gymSub: { id: string; gym_id: string } | null = null

  const { data: byId } = await supabaseAdmin
    .from('gym_saas_subscriptions')
    .select('id, gym_id')
    .eq('mp_preapproval_id', preapprovalId)
    .maybeSingle()

  if (byId) {
    gymSub = byId
  } else if (externalRef) {
    const { data: byRef } = await supabaseAdmin
      .from('gym_saas_subscriptions')
      .select('id, gym_id')
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
  }

  if (newStatus === 'canceled') {
    updates.canceled_at = new Date().toISOString()
  }

  await supabaseAdmin
    .from('gym_saas_subscriptions')
    .update(updates)
    .eq('id', gymSub.id)

  await logEvent(gymSub.id, mpEventId, 'subscription_preapproval', rawBody)
  console.log(`[mp-webhook] gym ${gymSub.gym_id} → ${newStatus}`)
}

// ── Authorized payment: pago exitoso del período ──────────────────────────────
async function handleAuthorizedPaymentEvent(paymentId: string, mpEventId: string, rawBody: string) {
  // Obtener detalles del pago autorizado
  let payment: Record<string, unknown>
  try {
    payment = await mpGet(`/authorized_payments/${paymentId}`)
  } catch {
    // fallback: algunos endpoints usan /preapproval/{id}/authorized_payments
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
