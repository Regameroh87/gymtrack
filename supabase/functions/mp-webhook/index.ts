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
//   MP_WEBHOOK_SECRET   – clave secreta de esa app (Tus integraciones > Webhooks).
//                         Sin ella los avisos de la app real se rechazan con 401
//                         y ninguna suscripción se activa: cargarla ANTES de
//                         deployar, no después.
// Opcionales, para poder probar sin pisar producción. Las tres van juntas: con
// MP_TEST_APPLICATION_ID cargada y sin las otras dos, los avisos del vendedor de
// prueba se rechazan (que es lo correcto, pero conviene saberlo antes de probar).
//   MP_TEST_APPLICATION_ID – id de la aplicación del vendedor de prueba
//   MP_ACCESS_TOKEN_TEST   – access token de esa aplicación
//   MP_WEBHOOK_SECRET_TEST – clave secreta de esa aplicación

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  esDefinitivo,
  mpGet as mpApiGet,
  validateMpSignature,
} from '../_shared/mp-signature.ts'

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
  /** application_id del aviso, normalizado. Identifica de qué app viene. */
  appId: string
}

function resolveMpCreds(applicationId: unknown): MpCreds {
  const testAppId = Deno.env.get('MP_TEST_APPLICATION_ID')
  const appId = String(applicationId ?? '')
  const isTest = !!testAppId && appId === testAppId

  if (isTest) {
    return {
      token: Deno.env.get('MP_ACCESS_TOKEN_TEST'),
      secret: Deno.env.get('MP_WEBHOOK_SECRET_TEST'),
      isTest: true,
      appId,
    }
  }
  return {
    token: Deno.env.get('MP_ACCESS_TOKEN'),
    secret: Deno.env.get('MP_WEBHOOK_SECRET'),
    isTest: false,
    appId,
  }
}

// ── Helpers de MP ────────────────────────────────────────────────────────────
// validateMpSignature, mpGet y esDefinitivo viven en _shared/mp-signature.ts:
// mp-gym-webhook necesita los mismos y MP firma igual los dos flujos. Esta
// función tenía su propia copia palabra por palabra, que es la clase de duplicado
// que se descubre cuando uno de los dos se arregla y el otro no.
//
// Lo único que queda acá es fijar el apiBase, que el helper recibe por parámetro
// para no atarse a una constante de ningún flujo.
const mpGet = (path: string, token: string) => mpApiGet(MP_API, path, token)

// ── Mapeo de status MP → nuestro status ──────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  authorized: 'trialing',
  cancelled: 'canceled',
  paused: 'past_due',
}

// Columnas que necesita el manejo de bajas: sin cancel_at_period_end no se puede
// distinguir el eco de nuestra propia cancelación de una baja hecha en MP.
// mp_preapproval_id se lee para descartar avisos de preapprovals superados.
const GYM_SUB_COLUMNS =
  'id, gym_id, cancel_at_period_end, access_until, current_period_end, trial_ends_at, mp_preapproval_id, mp_application_id'

interface GymSubRow {
  id: string
  gym_id: string
  cancel_at_period_end: boolean | null
  access_until: string | null
  current_period_end: string | null
  trial_ends_at: string | null
  mp_preapproval_id: string | null
  mp_application_id: string | null
}

// ── Aislamiento del vendedor de prueba ───────────────────────────────────────
// Las dos apps de MP (la real y la de prueba) pegan al MISMO webhook y escriben
// en la MISMA base. Sin estas guardas un aviso del sandbox muta la suscripción
// de un gym real: pasó el 2026-07-24.
//
// Asimetría deliberada: se bloquea prueba → gym real, pero NO real → gym de
// prueba. En ese sentido el cobro en MP ya ocurrió, y descartar el aviso solo
// lograría que la plata se mueva sin quedar registrada.
//
// Devuelve el motivo del descarte, o null si el aviso puede aplicarse.
async function motivoDeDescarte(
  gymSub: GymSubRow,
  creds: MpCreds,
): Promise<string | null> {
  // Integridad: la fila pertenece a la app que la creó. Si no tiene app guardada
  // es anterior a la columna y la reclama el primer aviso que llegue.
  if (
    gymSub.mp_application_id &&
    creds.appId &&
    gymSub.mp_application_id !== creds.appId
  ) {
    return `la suscripción es de la app ${gymSub.mp_application_id} y el aviso vino de ${creds.appId}`
  }

  // Alcance: el sandbox solo puede tocar gyms de prueba. La consulta corre solo
  // cuando el aviso es de prueba, así que en producción no cuesta nada.
  if (creds.isTest) {
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('is_test')
      .eq('id', gymSub.gym_id)
      .maybeSingle()

    if (!gym?.is_test) {
      return 'es un aviso del vendedor de prueba y el gym no está marcado como de prueba'
    }
  }

  return null
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

// ── Limpieza de preapprovals huérfanos ────────────────────────────────────────
// Cada checkout crea un preapproval NUEVO en MP y el anterior queda vivo. Si dos
// llegan a 'authorized' para el mismo gym, MP le cobra dos veces por mes.
//
// Por qué acá y no en el checkout: cancelar el viejo cuando el owner *arranca* un
// checkout deja al gym sin cobro si abandona el pago a mitad de camino. Recién
// cuando el reemplazo está 'authorized' es seguro dar de baja al resto —
// incluidos los 'authorized', que es lo que distingue esta limpieza de la del
// checkout (esa solo toca 'pending').
//
// Los candidatos salen de saas_preapprovals, el registro propio. La versión
// anterior usaba /preapproval/search?external_reference={gym_id} creyendo que
// filtraba por gym, pero MP IGNORA ese parámetro: verificado el 2026-07-25, con
// y sin filtro devuelve los mismos resultados. Recorría todos los preapprovals
// del colector, así que con más de un gym el primer 'authorized' de cualquiera
// daba de baja las suscripciones vivas de los demás. Paginar tampoco arregla
// nada: offset=0 y offset=5 devuelven ids repetidos entre sí.
//
// Nunca tira: la fila ya quedó bien y propagar el error haría que MP reintente el
// evento entero para rehacer trabajo ya hecho.
async function cancelarPreapprovalsHuerfanos(
  gymId: string,
  vigenteId: string,
  token: string,
  appId: string,
) {
  const sellarCancelado = (id: string) =>
    supabaseAdmin
      .from('saas_preapprovals')
      .update({ canceled_at: new Date().toISOString() })
      .eq('mp_preapproval_id', id)

  try {
    // El vigente se registra por si el checkout no llegó a anotarlo (o la fila
    // viene de antes del registro): si no, quedaría fuera del reaper para siempre.
    await supabaseAdmin.from('saas_preapprovals').upsert(
      {
        mp_preapproval_id: vigenteId,
        gym_id: gymId,
        mp_application_id: appId || null,
      },
      { onConflict: 'mp_preapproval_id' },
    )

    const { data: registrados, error } = await supabaseAdmin
      .from('saas_preapprovals')
      .select('mp_preapproval_id')
      .eq('gym_id', gymId)
      .is('canceled_at', null)
      .neq('mp_preapproval_id', vigenteId)

    if (error) throw error
    if (!registrados?.length) return

    for (const { mp_preapproval_id: id } of registrados) {
      // Se consulta el estado real antes de tocar nada: GET /preapproval/{id} sí
      // es exacto, y así no se manda un PUT contra algo ya cancelado.
      let estado: string | null = null
      try {
        const preapproval = await mpGet(`/preapproval/${id}`, token)
        estado = preapproval.status ?? null
      } catch (err) {
        // 4xx = no existe o es de otra app; 5xx = MP caído. En los dos casos se
        // deja para la próxima corrida del reaper.
        console.warn(`[mp-webhook] gym ${gymId}: no se pudo leer ${id}:`, err)
        continue
      }

      if (estado === 'cancelled') {
        await sellarCancelado(id)
        continue
      }

      if (estado !== 'authorized' && estado !== 'pending') continue

      const res = await fetch(`${MP_API}/preapproval/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      if (res.ok || res.status < 500) await sellarCancelado(id)

      console.log(
        `[mp-webhook] gym ${gymId}: preapproval huérfano ${id} (${estado}) → cancelado=${res.ok}`,
      )
    }
  } catch (err) {
    // Queda un huérfano vivo, pero el gym tiene su suscripción bien. Se ve en el
    // log y el próximo 'authorized' (o el reaper diario) reintenta la limpieza.
    console.error(`[mp-webhook] gym ${gymId}: falló la limpieza de huérfanos:`, err)
  }
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

  const valid = await validateMpSignature(req, creds.secret, 'mp-webhook')
  if (!valid) {
    console.error('[mp-webhook] Firma inválida; aviso descartado.')
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
      await handlePreapprovalEvent(resourceId, mpEventId, rawBody, creds.token, creds)
    } else if (eventType === 'subscription_authorized_payment') {
      await handleAuthorizedPaymentEvent(resourceId, mpEventId, rawBody, creds.token, creds)
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
  creds: MpCreds,
) {
  // La respuesta de MP no es plana: auto_recurring es un objeto anidado y se lee
  // más abajo. Anotarla como Record<string, string> hacía que `deno check`
  // fallara sobre auto_recurring?.start_date — en runtime nunca molestó porque
  // nada type-cheque estas funciones, pero la anotación era falsa.
  // deno-lint-ignore no-explicit-any
  let preapproval: Record<string, any>
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

    // El fallback por external_reference existe solo para la ventana en que el
    // checkout ya creó el preapproval en MP pero todavía no escribió su id en la
    // fila. Si la fila guarda OTRO id, este aviso es de un preapproval superado
    // y aplicarlo pisa la suscripción vigente: MP reintenta avisos con horas de
    // atraso, y el 2026-07-24 tres avisos de las 14:45 llegaron 21:46 y
    // devolvieron a 'trialing' una fila que ya tenía un pago hasta el 23/08.
    //
    // Descartar es recuperable y corromper no: si el preapproval fuera de verdad
    // el nuevo, el checkout ya guardó su id y el reintento de MP entra por byId.
    if (byRef?.mp_preapproval_id && byRef.mp_preapproval_id !== preapprovalId) {
      console.warn(
        `[mp-webhook] preapproval ${preapprovalId} no es el vigente del gym ${byRef.gym_id} (${byRef.mp_preapproval_id}); aviso descartado`,
      )
      await logEvent(byRef.id, mpEventId, 'subscription_preapproval', rawBody)
      return
    }

    gymSub = byRef ?? null
  }

  if (!gymSub) {
    console.warn(`[mp-webhook] No se encontró gym para preapproval ${preapprovalId}`)
    await logEvent(null, mpEventId, 'subscription_preapproval', rawBody)
    return
  }

  const descarte = await motivoDeDescarte(gymSub, creds)
  if (descarte) {
    console.warn(
      `[mp-webhook] gym ${gymSub.gym_id}: aviso descartado porque ${descarte}`,
    )
    await logEvent(gymSub.id, mpEventId, 'subscription_preapproval', rawBody)
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
    // Deja constancia de qué app maneja esta suscripción. En filas anteriores a
    // la columna, este es el aviso que la reclama.
    mp_application_id: creds.appId || null,
  }

  if (newStatus === 'trialing') {
    // MP dijo 'authorized': el owner adhirió la tarjeta y hay débito programado.
    // Es el único momento en que eso se sabe con certeza, y va afuera del if de
    // abajo a propósito — la autorización es un hecho aunque el status no se
    // toque por haber período pagado vigente.
    updates.mp_authorized_at = new Date().toISOString()

    // Un 'authorized' no puede degradar una suscripción con período pagado
    // vigente. Si lo hiciera, la fila quedaría en 'trialing' con trial_ends_at =
    // start_date (una fecha pasada), y todo lo que mire el trial la vería
    // vencida aunque el mes esté pagado.
    if (esFuturo(gymSub.current_period_end)) {
      delete updates.status
      console.log(
        `[mp-webhook] gym ${gymSub.gym_id}: pago vigente hasta ${gymSub.current_period_end}; no se degrada a trialing`,
      )
    } else {
      // trial_ends_at = fecha de inicio del primer cobro
      const startDate: string = preapproval.auto_recurring?.start_date
      updates.trial_ends_at = startDate ?? new Date(Date.now() + 14 * 86400_000).toISOString()
    }

    // Solo se pisa si MP realmente trae un mail. Verificado el 2026-07-26: una
    // vez autorizado el preapproval, GET /preapproval/{id} devuelve payer_email
    // como string VACÍO, no como null — y `?? null` no atrapa '', así que la
    // versión anterior borraba en cada aviso el mail que el checkout había
    // guardado bien. El valor bueno sigue en saas_preapprovals, que la escribe
    // el checkout y no el webhook.
    if (preapproval.payer_email) updates.payer_email = preapproval.payer_email

    // La limpieza de la baja va afuera del if: reanudar mientras todavía queda
    // período pagado es justamente el caso normal, y ahí hay que borrar
    // access_until igual (si no, el cron finalize apaga un gym que acaba de
    // reautorizar el pago).
    //
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
    // El preapproval vigente quedó muerto: MP no revive un cancelado. Dejar la
    // marca de autorizado haría que el checkout crea que todavía cobra y le
    // bloquee al owner la reactivación.
    updates.mp_authorized_at = null

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

  // Con el reemplazo ya confirmado, dar de baja cualquier otro preapproval del
  // gym: a partir de acá hay a lo sumo uno vivo por gym.
  if (newStatus === 'trialing') {
    await cancelarPreapprovalsHuerfanos(
      gymSub.gym_id,
      preapprovalId,
      token,
      creds.appId,
    )
  }
}

// ── Authorized payment: pago exitoso del período ──────────────────────────────
async function handleAuthorizedPaymentEvent(
  paymentId: string,
  mpEventId: string,
  rawBody: string,
  token: string,
  creds: MpCreds,
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
    .select(GYM_SUB_COLUMNS)
    .eq('mp_preapproval_id', preapprovalId)
    .maybeSingle()

  if (!gymSub) {
    console.warn(`[mp-webhook] No se encontró gym para preapproval ${preapprovalId}`)
    await logEvent(null, mpEventId, 'subscription_authorized_payment', rawBody)
    return
  }

  const descarte = await motivoDeDescarte(gymSub, creds)
  if (descarte) {
    console.warn(
      `[mp-webhook] gym ${gymSub.gym_id}: cobro descartado porque ${descarte}`,
    )
    await logEvent(gymSub.id, mpEventId, 'subscription_authorized_payment', rawBody)
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
