// Webhook de los pagos que los SOCIOS le hacen al gimnasio.
//
// No confundir con mp-webhook, que atiende el abono que el gym nos paga a
// nosotros. Son dos flujos de plata distintos y no se pueden mezclar:
//
//   mp-webhook      suscripciones (preapproval) · token de la plataforma ·
//                   external_reference = gym_id
//   mp-gym-webhook  pagos sueltos (payment)     · token OAuth del gym ·
//                   external_reference = member_payment_intents.id
//
// ── Por qué se le vuelve a preguntar a MercadoPago ──────────────────────────
// El aviso solo trae un id. El estado del pago se lee con GET /v1/payments/{id}
// usando el token del gym: es la única fuente que no depende de que el cuerpo
// del aviso sea auténtico ni esté actualizado.
//
// ── Qué hace con cada estado ────────────────────────────────────────────────
//   approved                → registra el cobro (N filas, una por actividad)
//   refunded / charged_back → anula esos cobros y devuelve los vencimientos
//   el resto                → se anota y se ignora
//
// Variables de entorno requeridas:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//   MP_GYM_WEBHOOK_SECRET – clave de la app de marketplace (Tus integraciones >
//                           Webhooks). Sin ella NO se valida firma: cargarla.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  esDefinitivo,
  mpGet,
  validateMpSignature,
} from '../_shared/mp-signature.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const MP_API = 'https://api.mercadopago.com'

/** Estados de MP que significan que la plata volvió. */
const REVERSAL_STATUSES = ['refunded', 'charged_back', 'cancelled']

Deno.serve(async (req: Request) => {
  // MP marca la URL como caída si no contesta 200, y reintenta. Casi todo el
  // manejo de errores de acá termina en 200 a propósito: un evento que nunca va
  // a poder procesarse no mejora reintentándolo.
  try {
    const secret = Deno.env.get('MP_GYM_WEBHOOK_SECRET')
    if (!(await validateMpSignature(req, secret, 'mp-gym-webhook'))) {
      console.warn('[mp-gym-webhook] firma inválida; aviso descartado')
      return new Response('invalid signature', { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const type = body.type ?? body.topic
    const paymentId = body.data?.id ?? body.resource

    // La función solo entiende de pagos. Cualquier otro topic se contesta 200
    // para que MP no insista.
    if (type !== 'payment' || !paymentId) {
      return new Response('ignored', { status: 200 })
    }

    // ── De qué gym es este pago ─────────────────────────────────────────────
    // El aviso NO dice a qué gimnasio pertenece, y para preguntarle a MP hace
    // falta justamente el token del gym. Se sale del huevo y la gallina con el
    // external_reference que MP sí incluye en el aviso de pago cuando existe;
    // si no viniera, se prueba con los pagos que el propio MP asocia (abajo).
    const externalRef = body.data?.external_reference ?? null

    let intent = null as null | {
      id: string
      gym_id: string
      status: string
      mp_payment_id: string | null
    }

    if (externalRef) {
      const { data } = await supabaseAdmin
        .from('member_payment_intents')
        .select('id, gym_id, status, mp_payment_id')
        .eq('id', externalRef)
        .maybeSingle()
      intent = data
    }

    // Fallback: el aviso puede llegar sin external_reference. En ese caso el
    // pago ya tiene que estar anotado en un intento de una entrega anterior.
    if (!intent) {
      const { data } = await supabaseAdmin
        .from('member_payment_intents')
        .select('id, gym_id, status, mp_payment_id')
        .eq('mp_payment_id', String(paymentId))
        .maybeSingle()
      intent = data
    }

    if (!intent) {
      // Pasa con la simulación del panel de MP y con avisos de pagos que no
      // salieron de la app. No es un error nuestro.
      console.warn(`[mp-gym-webhook] pago ${paymentId} sin intento asociado; ignorado`)
      return new Response('unknown payment', { status: 200 })
    }

    // ── Credenciales del gym dueño del cobro ────────────────────────────────
    const { data: credsRows } = await supabaseAdmin
      .rpc('gym_mp_get_credentials', { p_gym_id: intent.gym_id })

    const creds = Array.isArray(credsRows) ? credsRows[0] : credsRows
    if (!creds?.access_token) {
      // El gym se desconectó entre el pago y el aviso. Sin token no hay forma
      // de confirmar el estado, y registrar sin confirmar sería creerle al
      // cuerpo del aviso.
      console.error(
        `[mp-gym-webhook] gym ${intent.gym_id} sin credenciales; pago ${paymentId} no se pudo verificar`,
      )
      return new Response('gym disconnected', { status: 200 })
    }

    // ── La verdad, según MercadoPago ────────────────────────────────────────
    let payment
    try {
      payment = await mpGet(MP_API, `/v1/payments/${paymentId}`, creds.access_token)
    } catch (err) {
      if (esDefinitivo(err)) {
        console.warn(`[mp-gym-webhook] pago ${paymentId} inaccesible; ignorado`)
        return new Response('unreachable', { status: 200 })
      }
      // 5xx: MP está caído. Acá SÍ conviene que reintente.
      console.error(`[mp-gym-webhook] MP no responde por el pago ${paymentId}`)
      return new Response('mp unavailable', { status: 500 })
    }

    const status = String(payment.status ?? '')

    // Que el pago diga pertenecer a otro intento es señal de aviso cruzado o
    // manipulado: se corta antes de tocar plata.
    if (payment.external_reference && payment.external_reference !== intent.id) {
      console.error(
        `[mp-gym-webhook] pago ${paymentId} apunta al intento ${payment.external_reference} pero se resolvió ${intent.id}; descartado`,
      )
      return new Response('mismatch', { status: 200 })
    }

    if (status === 'approved') {
      const { data: registrados, error } = await supabaseAdmin
        .rpc('register_member_online_payment', {
          p_intent_id: intent.id,
          p_mp_payment_id: String(paymentId),
        })

      if (error) {
        // El RPC es idempotente, así que un error acá no es un reintento: es un
        // intento sin items o un problema de datos. Reintentar no lo arregla y
        // hay que mirarlo a mano — pero el 200 evita el loop de MP.
        console.error(
          `[mp-gym-webhook] no se pudo registrar el pago ${paymentId} del intento ${intent.id}: ${error.message}`,
        )
        return new Response('registration failed', { status: 200 })
      }

      console.log(
        `[mp-gym-webhook] intento ${intent.id}: ${registrados} cuota(s) registrada(s) por el pago ${paymentId}`,
      )
      return new Response('ok', { status: 200 })
    }

    if (REVERSAL_STATUSES.includes(status)) {
      const { data: anulados, error } = await supabaseAdmin
        .rpc('void_member_online_payment', {
          p_intent_id: intent.id,
          p_reason: `Pago ${status} en MercadoPago (${paymentId})`,
        })

      if (error) {
        console.error(
          `[mp-gym-webhook] no se pudo anular el intento ${intent.id}: ${error.message}`,
        )
        return new Response('void failed', { status: 200 })
      }

      console.log(
        `[mp-gym-webhook] intento ${intent.id}: ${anulados} cobro(s) anulado(s) por ${status}`,
      )
      return new Response('ok', { status: 200 })
    }

    // rejected, in_process, pending: se deja constancia en la fila para que la
    // app pueda mostrarle algo al socio, pero no se toca ninguna cuota.
    if (status === 'rejected' && intent.status === 'pending') {
      await supabaseAdmin
        .from('member_payment_intents')
        .update({ status: 'rejected', mp_payment_id: String(paymentId) })
        .eq('id', intent.id)
    }

    console.log(`[mp-gym-webhook] pago ${paymentId} en estado '${status}'; sin acción`)
    return new Response('ok', { status: 200 })
  } catch (err: any) {
    console.error('[mp-gym-webhook] Error interno:', err?.message ?? err)
    // 500 acá sí: es un error inesperado nuestro y el reintento de MP puede
    // salvarlo.
    return new Response('internal error', { status: 500 })
  }
})
