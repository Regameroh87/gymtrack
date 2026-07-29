// Crea el cobro de la cuota de un socio y devuelve el link de pago de MercadoPago.
//
// La llama la app móvil con supabase.functions.invoke('crear-cobro-socio'), que
// es el patrón que ya usan eliminar-socio y eliminar-gym: el JWT del socio viaja
// solo en el Authorization y acá se verifica con getUser(jwt).
//
// ── Qué cobra ───────────────────────────────────────────────────────────────
// TODAS las cuotas que el socio debe en ese gym, en un solo pago. Si hace
// musculación y funcional, se le cobra la suma — no una y después la otra. Qué
// entra exactamente lo decide member_pending_charges (migración 20260726130000),
// que es la definición única de "lo que debe": actividades activas con el
// vencimiento cumplido. Las que están pagas hacia adelante quedan afuera.
//
// El desglose se congela en member_payment_intent_items al crear el intento: si
// el gym cambia un precio mientras el socio está en el checkout, se cobra y se
// registra lo que el socio aceptó.
//
// ── Por qué la plata no pasa por nosotros ───────────────────────────────────
// La preferencia se crea con el token OAuth DEL GYM, así que el cobro entra
// directo en su cuenta de MercadoPago. La plataforma nunca es intermediaria de
// esos fondos.
//
// Variables de entorno requeridas:
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY – los wrappers de Vault son service_role
//   MP_GYM_WEBHOOK_URL  – URL pública de la función mp-gym-webhook. Sin esto el
//                         pago se cobra y nadie lo registra.
// Opcionales:
//   MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET – credenciales de la app de
//                         marketplace, los mismos valores que van en Vercel.
//                         Habilitan renovar el token del gym acá mismo si está
//                         por vencer. Sin ellas se cobra igual con el token que
//                         haya: el único respaldo pasa a ser el cron diario.
//   APP_DEEP_LINK       – a dónde vuelve el socio al terminar (default gymtrack://).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { hasOAuthApp, needsRefresh, refreshGymToken } from '../_shared/mp-oauth.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const MP_API = 'https://api.mercadopago.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

interface PendingCharge {
  subscription_id: string
  activity_id: string
  activity_name: string
  plan_label: string | null
  amount: number
  period_start: string
  period_end: string
}

// ── Datos del pagador ────────────────────────────────────────────────────────
// Todo lo que sigue existe para el motor antifraude de MercadoPago: cuanto más
// completo va el objeto `payer`, menos pagos legítimos rechaza (está en su
// checklist de calidad, como buena práctica).
//
// La regla común a los tres helpers: ante la duda, NO mandar el campo. Los tres
// leen columnas de texto libre que carga el staff a mano, y un dato mal armado
// es peor que la ausencia del dato — el motor lo cruza contra el titular de la
// tarjeta y una discrepancia cuenta en contra.

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "julio 2026" a partir de un date ISO (YYYY-MM-DD). */
function monthLabel(iso: string | null): string {
  const [y, m] = (iso ?? '').split('-')
  const name = MONTHS_ES[Number(m) - 1]
  return name ? `${name} ${y}` : ''
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

/**
 * Documento del socio. Se manda solo cuando la longitud es inequívoca: 7-8
 * dígitos es DNI, 11 es CUIL. Cualquier otra cosa queda afuera.
 */
function buildIdentification(raw: string | null) {
  const n = onlyDigits(raw ?? '')
  if (n.length === 7 || n.length === 8) return { type: 'DNI', number: n }
  if (n.length === 11) return { type: 'CUIL', number: n }
  return undefined
}

/**
 * Teléfono normalizado. Se sacan el prefijo de país, el 9 de celular y el 0 de
 * larga distancia (ningún número argentino de 10 dígitos empieza con 9 ni 0,
 * así que sacarlos no puede comerse un dígito válido), y el 15 viejo de los
 * celulares del AMBA, que aparece seguido en datos cargados a mano.
 *
 * Después queda un solo criterio: un número argentino normalizado tiene
 * exactamente 10 dígitos (área + abonado). Si no da 10, es que no entendimos lo
 * que el staff escribió y no se manda nada — un teléfono con un 15 de más no es
 * un teléfono, y mandarlo le resta al perfil en vez de sumarle.
 *
 * El área se separa SOLO en el caso inequívoco: AMBA, 11 + 8 dígitos. Los demás
 * códigos de área argentinos son de 2, 3 o 4 dígitos y no se distinguen mirando
 * el número, así que en vez de partirlo mal van los 10 juntos en `number`. MP
 * acepta el objeto sin `area_code`.
 */
function buildPhone(raw: string | null) {
  let n = onlyDigits(raw ?? '')
  if (n.startsWith('54')) n = n.slice(2)
  if (n.startsWith('9')) n = n.slice(1)
  if (n.startsWith('0')) n = n.slice(1)
  if (n.startsWith('1115') && n.length === 12) n = '11' + n.slice(4)
  if (n.length !== 10) return undefined
  if (n.startsWith('11')) return { area_code: '11', number: n.slice(2) }
  return { number: n }
}

/**
 * profiles.address es una línea suelta, no está desagregada en calle / número /
 * CP. Va entera como street_name y los otros dos campos quedan sin completar:
 * MP acepta la dirección parcial, e inventar un número o un código postal sería
 * exactamente el tipo de dato falso que conviene no mandar.
 */
function buildAddress(raw: string | null) {
  const street = (raw ?? '').trim()
  return street ? { street_name: street.slice(0, 255) } : undefined
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return jsonResponse({ error: 'Falta el token de sesión.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return jsonResponse({ error: 'Sesión inválida.' }, 401)
    }

    const { gym_id: gymId } = await req.json()
    if (!gymId) {
      return jsonResponse({ error: 'gym_id es requerido.' }, 400)
    }

    // Las tablas de cuotas usan profiles.id, NO auth.users.id (ver
    // auth_profile_id() en el baseline). Confundirlos devuelve cero cuotas sin
    // ningún error, que es el peor tipo de bug.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, last_name, email, phone, document_number, address')
      .eq('user_id', callerAuth.user.id)
      .maybeSingle()

    if (!profile) {
      return jsonResponse({ error: 'No se encontró tu perfil.' }, 404)
    }

    // Membresía activa en ESE gym: sin esto, cualquier usuario logueado podría
    // pedir el cobro de un gimnasio en el que no está.
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('gym_id', gymId)
      .eq('user_id', callerAuth.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      return jsonResponse({ error: 'No pertenecés a este gimnasio.' }, 403)
    }

    // ── El gym tiene que tener los cobros prendidos ────────────────────────
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('name, online_payments_enabled')
      .eq('id', gymId)
      .maybeSingle()

    if (!gym?.online_payments_enabled) {
      return jsonResponse(
        { error: 'Este gimnasio no tiene habilitados los pagos online.' },
        409,
      )
    }

    // El gate del SaaS se chequea acá y NO en el RPC que registra: si el gym
    // dejó de pagar su abono, lo que corresponde es no dejarle generar cobros
    // nuevos. Registrar uno que YA ocurrió tiene que funcionar siempre, o el
    // socio paga y el sistema no se entera.
    const { data: saasActive } = await supabaseAdmin
      .rpc('is_saas_subscription_active', { p_gym_id: gymId })

    if (saasActive === false) {
      return jsonResponse(
        { error: 'Los pagos online no están disponibles en este momento.' },
        409,
      )
    }

    // ── Credenciales del gym ────────────────────────────────────────────────
    const { data: credsRows, error: credsError } = await supabaseAdmin
      .rpc('gym_mp_get_credentials', { p_gym_id: gymId })

    if (credsError) {
      console.error('[crear-cobro-socio] error leyendo credenciales:', credsError.message)
      return jsonResponse({ error: 'No se pudo iniciar el pago.' }, 500)
    }

    const creds = Array.isArray(credsRows) ? credsRows[0] : credsRows
    if (!creds?.access_token) {
      return jsonResponse(
        { error: 'Este gimnasio no tiene una cuenta de MercadoPago conectada.' },
        409,
      )
    }

    // ── Qué se le cobra ─────────────────────────────────────────────────────
    const { data: charges, error: chargesError } = await supabaseAdmin
      .rpc('member_pending_charges', { p_gym_id: gymId, p_user_id: profile.id })

    if (chargesError) throw chargesError

    const pending = (charges ?? []) as PendingCharge[]
    if (!pending.length) {
      return jsonResponse({ error: 'No tenés cuotas pendientes.', up_to_date: true }, 422)
    }

    const total = pending.reduce((sum, c) => sum + Number(c.amount), 0)
    if (total <= 0) {
      // Cuotas de importe cero: no hay nada que cobrar y MercadoPago rechaza
      // una preferencia sin monto. Que lo resuelva el staff a mano.
      return jsonResponse(
        { error: 'Tus cuotas no tienen un importe cargado. Hablá con el gimnasio.' },
        422,
      )
    }

    // ── Intento + desglose congelado ────────────────────────────────────────
    const { data: intent, error: intentError } = await supabaseAdmin
      .from('member_payment_intents')
      .insert({ gym_id: gymId, user_id: profile.id, total_amount: total })
      .select('id')
      .single()

    if (intentError) throw intentError

    const { error: itemsError } = await supabaseAdmin
      .from('member_payment_intent_items')
      .insert(pending.map((c) => ({
        intent_id: intent.id,
        subscription_id: c.subscription_id,
        activity_id: c.activity_id,
        amount: c.amount,
        period_start: c.period_start,
        period_end: c.period_end,
      })))

    // Sin items el intento no sirve para nada: el RPC de registro lo rechaza a
    // propósito (no habría a qué imputar el pago). Se marca expirado y se corta
    // ANTES de crear la preferencia, para no dejar un link que cobre plata que
    // después nadie pueda registrar.
    if (itemsError) {
      await supabaseAdmin
        .from('member_payment_intents')
        .update({ status: 'expired' })
        .eq('id', intent.id)
      throw itemsError
    }

    // ── Preferencia en MercadoPago ──────────────────────────────────────────
    const deepLink = Deno.env.get('APP_DEEP_LINK') ?? 'gymtrack://'
    const webhookUrl = Deno.env.get('MP_GYM_WEBHOOK_URL')

    if (!webhookUrl) {
      // Sin webhook el pago se cobra y nunca se registra. Es preferible no
      // dejar pagar a dejar al socio pagando al vacío.
      await supabaseAdmin
        .from('member_payment_intents')
        .update({ status: 'expired' })
        .eq('id', intent.id)
      console.error('[crear-cobro-socio] MP_GYM_WEBHOOK_URL no configurada')
      return jsonResponse({ error: 'No se pudo iniciar el pago.' }, 500)
    }

    // ── Renovar el token si está por vencer ─────────────────────────────────
    // El cron /api/cron/refresh-mp-tokens es la red que evita que un gym se
    // quede sin cobrar mientras nadie mira, pero corre una vez por día: si una
    // corrida falló, o el gym estuvo meses inactivo, el token puede llegar
    // vencido justo cuando un socio va a pagar. MP contesta 401 y el socio ve
    // "MercadoPago no pudo generar el pago", que no le dice nada y no se arregla
    // solo hasta la corrida siguiente. Renovar en el momento del uso es lo que
    // hace que ese caso no se note.
    //
    // Va acá y no junto a la lectura de credenciales para no gastar una
    // renovación en los caminos que ni siquiera llegan a cobrar (socio al día,
    // cuotas en cero, webhook sin configurar).
    //
    // Nada de esto puede impedir un cobro: si la renovación falla se sigue con
    // el token viejo, que dentro del margen de un día probablemente todavía
    // sirva. Fallar acá dejaría al socio sin pagar por un problema que quizás no
    // lo afecta todavía — mismo criterio que getUsableAccessToken en la web.
    let accessToken: string = creds.access_token

    if (needsRefresh(creds.expires_at) && creds.refresh_token && hasOAuthApp()) {
      try {
        const renewed = await refreshGymToken(creds.refresh_token)

        const { error: storeError } = await supabaseAdmin.rpc('gym_mp_store_credentials', {
          p_gym_id: gymId,
          p_mp_user_id: renewed.mpUserId,
          p_access_token: renewed.accessToken,
          p_refresh_token: renewed.refreshToken,
          p_public_key: renewed.publicKey,
          p_expires_at: renewed.expiresAt,
          p_live_mode: renewed.liveMode,
          p_connected_by: null,
        })

        // Si no se pudo guardar, el token nuevo igual sirve para ESTE cobro: no
        // hay razón para descartarlo y usar uno más viejo. Lo que se pierde es
        // la renovación, que vuelve a intentarse en el cobro o el cron siguiente.
        if (storeError) {
          console.error(
            `[crear-cobro-socio] gym ${gymId}: token renovado pero no guardado: ${storeError.message}`,
          )
        } else {
          console.log(`[crear-cobro-socio] gym ${gymId}: token de MP renovado`)
        }

        accessToken = renewed.accessToken
      } catch (err) {
        console.error(
          `[crear-cobro-socio] gym ${gymId}: no se pudo renovar el token:`,
          err instanceof Error ? err.message : err,
        )
      }
    }

    const mpRes = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Un item por actividad: así el socio ve el detalle en el checkout de
        // MP y no un monto suelto que no sabe de dónde sale.
        items: pending.map((c) => ({
          id: c.subscription_id,
          title: c.plan_label ? `${c.activity_name} · ${c.plan_label}` : c.activity_name,
          description: [
            `Cuota de ${c.activity_name}`,
            monthLabel(c.period_start),
            gym.name,
          ].filter(Boolean).join(' · '),
          // El listado de categorías está en
          // https://api.mercadopago.com/item_categories. Una cuota de gimnasio
          // es un servicio, no un producto físico.
          category_id: 'services',
          quantity: 1,
          unit_price: Number(c.amount),
          currency_id: 'ARS',
        })),
        // Los campos que devuelven undefined los descarta JSON.stringify, así
        // que un socio sin teléfono ni documento cargado manda el payer mínimo
        // y el cobro sale igual.
        payer: {
          email: profile.email,
          name: profile.name ?? undefined,
          surname: profile.last_name ?? undefined,
          identification: buildIdentification(profile.document_number),
          phone: buildPhone(profile.phone),
          address: buildAddress(profile.address),
        },
        // El intent es lo que ata el pago de MP a nuestras filas. El webhook no
        // tiene otra forma de saber qué cuotas saldar.
        external_reference: intent.id,
        // A diferencia de /preapproval —que ignora notification_url y obliga a
        // configurar el webhook por aplicación— las preferencias sí lo aceptan.
        notification_url: webhookUrl,
        // El deep link es lo que hace que se cierre el navegador in-app:
        // WebBrowser.openAuthSessionAsync corta cuando la navegación llega a
        // esta URL. Va sin auto_return a propósito — MP valida ese parámetro
        // contra http/https y un esquema propio le hace rechazar la preferencia
        // entera. Sin auto_return el socio vuelve con el botón de MP, y de todas
        // formas quien confirma el pago es el webhook, no este retorno.
        back_urls: { success: deepLink, pending: deepLink, failure: deepLink },
        statement_descriptor: (gym.name ?? 'GYM').slice(0, 22),
      }),
    })

    if (!mpRes.ok) {
      const detail = await mpRes.text()
      console.error(`[crear-cobro-socio] MP ${mpRes.status}: ${detail.slice(0, 300)}`)
      await supabaseAdmin
        .from('member_payment_intents')
        .update({ status: 'expired' })
        .eq('id', intent.id)
      return jsonResponse({ error: 'MercadoPago no pudo generar el pago.' }, 502)
    }

    const pref = await mpRes.json()
    const initPoint = pref.init_point ?? pref.sandbox_init_point

    if (!initPoint) {
      await supabaseAdmin
        .from('member_payment_intents')
        .update({ status: 'expired' })
        .eq('id', intent.id)
      return jsonResponse({ error: 'MercadoPago no devolvió el link de pago.' }, 502)
    }

    await supabaseAdmin
      .from('member_payment_intents')
      .update({ mp_preference_id: pref.id, init_point: initPoint })
      .eq('id', intent.id)

    console.log(
      `[crear-cobro-socio] gym ${gymId} socio ${profile.id}: intento ${intent.id} por ${total} (${pending.length} cuota/s)`,
    )

    return jsonResponse({
      intent_id: intent.id,
      init_point: initPoint,
      total,
      items: pending.map((c) => ({
        activity: c.activity_name,
        plan: c.plan_label,
        amount: Number(c.amount),
        period_start: c.period_start,
      })),
    }, 200)
  } catch (err: any) {
    console.error('[crear-cobro-socio] Error interno:', err?.message ?? err)
    return jsonResponse({ error: 'Ha ocurrido un error inesperado.' }, 500)
  }
})
