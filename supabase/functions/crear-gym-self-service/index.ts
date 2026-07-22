// Signup self-service: el caller autenticado crea SU propio gym y queda como
// owner, con la suscripción SaaS naciendo en 'trialing' SIN tarjeta (14 días;
// el checkout de MP se ofrece desde el panel antes de que venza).
//
// Diferencias deliberadas con crear-gym (flujo de plataforma, que queda intacto):
//   - No crea usuario Auth: el caller ya existe (OTP con shouldCreateUser: true
//     desde /registro, o sesión previa multi-gym).
//   - Gateado por el kill switch platform_settings.self_service_signup_enabled.
//   - La fila de gym_saas_subscriptions es OBLIGATORIA (con rollback): un gym
//     self-service sin fila tendría acceso gratis ilimitado por la compat
//     hacia atrás de is_saas_subscription_active.
//   - Branding default: el theme se configura después desde el panel.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rollbackGym, sendWelcomeOwnerEmail } from '../_shared/gym-helpers.ts'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Límites anti-abuso (trial sin tarjeta = vector de trials infinitos; esto más
// el cap por cuenta, la visibilidad en platform/billing y la suspensión a 30
// días lo mantienen en fricción alta / valor bajo).
const MAX_SELF_SERVICE_GYMS_PER_ACCOUNT = 2
const MAX_SIGNUPS_PER_IP_PER_HOUR = 3
const MAX_SIGNUPS_PER_IP_PER_DAY = 10

// "Energym Río Cuarto" -> "energym-rio-cuarto" (mismo slugify de apps/web/lib/gyms.ts)
const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let createdGymId: string | null = null

  try {
    // Kill switch: enforcement autoritativo (la UI solo lo refleja).
    const { data: settings } = await supabaseAdmin
      .from('platform_settings')
      .select('self_service_signup_enabled')
      .maybeSingle()

    if (!settings?.self_service_signup_enabled) {
      return jsonResponse({ error: 'Los registros están temporalmente cerrados.' }, 403)
    }

    // Auth: identidad solo del JWT, nunca del body.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!jwt) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user?.email) {
      return jsonResponse({ error: 'Token inválido.' }, 401)
    }
    const caller = callerAuth.user
    const callerEmail = caller.email!.toLowerCase()

    // El staff de plataforma crea gyms por su propio flujo (crear-gym).
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, is_super_admin, platform_staff_role')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (callerProfile?.is_super_admin || callerProfile?.platform_staff_role) {
      return jsonResponse({ error: 'El staff de plataforma crea gyms desde el panel de plataforma.' }, 403)
    }

    const body = await req.json()
    const gymName = typeof body?.gym_name === 'string' ? body.gym_name.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const lastName = typeof body?.last_name === 'string' ? body.last_name.trim() : ''

    if (gymName.length < 3 || gymName.length > 60) {
      return jsonResponse({ error: 'El nombre del gimnasio debe tener entre 3 y 60 caracteres.' }, 400)
    }
    if (!name) {
      return jsonResponse({ error: 'Tu nombre es requerido.' }, 400)
    }

    // Idempotencia ante doble submit: mismo owner + mismo nombre hace <2 min.
    const twoMinAgo = new Date(Date.now() - 2 * 60_000).toISOString()
    const { data: recentDupe } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('owner_id', caller.id)
      .eq('created_via', 'self_service')
      .eq('name', gymName)
      .gte('created_at', twoMinAgo)
      .maybeSingle()

    if (recentDupe) {
      return jsonResponse({ done: true, existing: true, gym_id: recentDupe.id }, 200)
    }

    // Cap por cuenta: gyms self-service cuya suscripción sigue viva.
    const { data: ownedGyms } = await supabaseAdmin
      .from('gyms')
      .select('id, gym_saas_subscriptions(status)')
      .eq('owner_id', caller.id)
      .eq('created_via', 'self_service')

    const liveGyms = (ownedGyms ?? []).filter((g: any) => {
      const sub = Array.isArray(g.gym_saas_subscriptions)
        ? g.gym_saas_subscriptions[0]
        : g.gym_saas_subscriptions
      return sub && !['canceled', 'expired'].includes(sub.status)
    })
    if (liveGyms.length >= MAX_SELF_SERVICE_GYMS_PER_ACCOUNT) {
      return jsonResponse(
        { error: `Alcanzaste el máximo de ${MAX_SELF_SERVICE_GYMS_PER_ACCOUNT} gimnasios creados por registro directo. Escribinos para sumar más.` },
        403,
      )
    }

    // Cap por IP (primer hop de x-forwarded-for; defensa en profundidad, la
    // capa 0 es el rate limit de emails OTP de Supabase Auth).
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()

    const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
      supabaseAdmin
        .from('self_service_signup_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', hourAgo),
      supabaseAdmin
        .from('self_service_signup_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', dayAgo),
    ])

    if ((hourCount ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR || (dayCount ?? 0) >= MAX_SIGNUPS_PER_IP_PER_DAY) {
      return jsonResponse({ error: 'Demasiados registros desde esta conexión. Probá de nuevo más tarde.' }, 429)
    }

    // El intento cuenta aunque la creación después falle.
    await supabaseAdmin
      .from('self_service_signup_attempts')
      .insert({ ip, user_id: caller.id })

    // Plan activo: obligatorio, la fila SaaS en trialing es la que da acceso.
    const { data: activePlan } = await supabaseAdmin
      .from('saas_plans')
      .select('id, trial_days')
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (!activePlan) {
      console.error('[crear-gym-self-service] No hay saas_plans activo.')
      return jsonResponse({ error: 'El registro no está disponible en este momento. Escribinos.' }, 500)
    }

    // 1. Gym con slug único (retry ante colisión 23505 sobre gyms_slug_key).
    const baseSlug = slugify(gymName) || 'gym'
    const candidates = [
      baseSlug,
      ...[2, 3, 4, 5].map((n) => `${baseSlug}-${n}`),
      `${baseSlug}-${crypto.randomUUID().slice(0, 4)}`,
    ]

    let gymData: { id: string; slug: string } | null = null
    for (const slug of candidates) {
      const { data, error } = await supabaseAdmin
        .from('gyms')
        .insert({
          name: gymName,
          slug,
          owner_id: caller.id,
          created_via: 'self_service',
        })
        .select('id, slug')
        .single()

      if (!error) {
        gymData = data
        break
      }
      if (error.code !== '23505') throw error
    }
    if (!gymData) {
      throw new Error('No se pudo generar un identificador único para el gimnasio.')
    }
    createdGymId = gymData.id

    // 2. Profile solo si no existe (usuario OTP nuevo no tiene; sin profile,
    // el pre-check email_exists del login lo dejaría afuera).
    if (!callerProfile) {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        user_id: caller.id,
        email: callerEmail,
        name: name.toLowerCase(),
        last_name: lastName ? lastName.toLowerCase() : null,
      })
      if (profileError) {
        await rollbackGym(createdGymId)
        throw profileError
      }
    }

    // 3. Membresía de owner (fuente de verdad del vínculo persona↔gym).
    const { error: membershipError } = await supabaseAdmin.from('memberships').insert({
      user_id: caller.id,
      gym_id: createdGymId,
      role: 'owner',
      added_by: caller.id,
    })
    if (membershipError) {
      await rollbackGym(createdGymId)
      throw membershipError
    }

    // 4. Suscripción SaaS en trialing sin tarjeta. Obligatoria (ver header).
    const trialDays = activePlan.trial_days ?? 14
    const trialEndsAt = new Date(Date.now() + trialDays * 86_400_000).toISOString()
    const { error: subError } = await supabaseAdmin.from('gym_saas_subscriptions').insert({
      gym_id: createdGymId,
      plan_id: activePlan.id,
      status: 'trialing',
      trial_ends_at: trialEndsAt,
      payer_email: callerEmail,
    })
    if (subError) {
      // El delete del gym arrastra membership y sub por cascade.
      await rollbackGym(createdGymId)
      throw subError
    }

    // Rastro del gym creado en el intento (diagnóstico), best-effort.
    await supabaseAdmin
      .from('self_service_signup_attempts')
      .update({ gym_id: createdGymId })
      .eq('ip', ip)
      .eq('user_id', caller.id)
      .is('gym_id', null)
      .gte('created_at', twoMinAgo)

    await sendWelcomeOwnerEmail(createdGymId, callerEmail, name)

    return jsonResponse(
      { done: true, gym_id: createdGymId, slug: gymData.slug, trial_ends_at: trialEndsAt },
      200,
    )
  } catch (error: any) {
    const message = error?.message || error?.msg || 'Error interno del servidor'
    console.error('[crear-gym-self-service] Error crítico:', message)
    return jsonResponse({ error: message }, 400)
  }
})
