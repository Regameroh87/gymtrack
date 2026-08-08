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
import { createMemberCharge, MemberChargeError, type PendingCharge } from '../_shared/member-charge.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

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

    const deepLink = Deno.env.get('APP_DEEP_LINK') ?? 'gymtrack://'
    const webhookUrl = Deno.env.get('MP_GYM_WEBHOOK_URL')

    // ── Renovar el token si está por vencer ─────────────────────────────────
    // El cron /api/cron/refresh-mp-tokens es la red que evita que un gym se
    // quede sin cobrar mientras nadie mira, pero corre una vez por día: si una
    // corrida falló, o el gym estuvo meses inactivo, el token puede llegar
    // vencido justo cuando un socio va a pagar. MP contesta 401 y el socio ve
    // "MercadoPago no pudo generar el pago", que no le dice nada y no se arregla
    // solo hasta la corrida siguiente. Renovar en el momento del uso es lo que
    // hace que ese caso no se note.
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

    // ── Intento + preferencia (compartido con cobranza-recordatorios) ───────
    // Sin expiresInDays: el socio genera el link y lo usa en el momento, no
    // tiene sentido que caduque.
    let charge
    try {
      charge = await createMemberCharge({
        admin: supabaseAdmin,
        gymId,
        gymName: gym.name,
        profile,
        charges: pending as PendingCharge[],
        accessToken,
        webhookUrl,
        backUrl: deepLink,
      })
    } catch (err) {
      if (err instanceof MemberChargeError) {
        console.error(`[crear-cobro-socio] gym ${gymId}: ${err.reason}: ${err.message}`)
        if (err.reason === 'webhook_not_configured') {
          return jsonResponse({ error: 'No se pudo iniciar el pago.' }, 500)
        }
        if (err.reason === 'mp_rejected') {
          return jsonResponse({ error: 'MercadoPago no pudo generar el pago.' }, 502)
        }
        return jsonResponse({ error: 'MercadoPago no devolvió el link de pago.' }, 502)
      }
      // Items sin insertar u otro error de datos: al catch general, mismo 500
      // genérico de siempre.
      throw err
    }

    console.log(
      `[crear-cobro-socio] gym ${gymId} socio ${profile.id}: intento ${charge.intentId} por ${total} (${pending.length} cuota/s)`,
    )

    return jsonResponse({
      intent_id: charge.intentId,
      init_point: charge.initPoint,
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
