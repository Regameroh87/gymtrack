import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const AUTH_ERRORS: Record<string, string> = {
  "User already registered": "Este correo ya se encuentra registrado.",
  "email_exists":            "Este correo ya se encuentra registrado.",
  "user_already_exists":     "Este correo ya se encuentra registrado.",
  "Invalid email":           "El correo electrónico no es válido.",
  "invalid_email":           "El correo electrónico no es válido.",
  "email_address_invalid":   "El correo electrónico no es válido.",
  "Email rate limit exceeded": "Demasiados intentos. Esperá unos minutos.",
  "over_email_send_rate_limit": "Demasiados intentos. Esperá unos minutos.",
  "Database error saving new user": "Error interno al guardar el usuario. Intentá de nuevo.",
}

function getErrorMessage(error: any): string {
  console.error("Auth Error details:", JSON.stringify(error));
  return AUTH_ERRORS[error.code] ?? "Ha ocurrido un error inesperado, por favor intentá de nuevo.";
}

async function rollbackUser(userId: string) {
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (!error) return true
    console.warn(`[ROLLBACK user] Intento ${attempt}/${MAX_RETRIES}: ${error.message}`)
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }
  return false
}

async function rollbackGym(gymId: string) {
  const { error } = await supabaseAdmin.from('gyms').delete().eq('id', gymId)
  if (error) {
    console.error(`[ROLLBACK gym FALLIDO] gym_id=${gymId}: ${error.message}`)
    return false
  }
  return true
}

// Best-effort: deja una fila 'failed' en email_log cuando el envío ni siquiera
// llega a send-email (config faltante o error de red). Los fallos que ocurren
// dentro de send-email (Resend, RESEND_API_KEY, etc.) los loguea send-email.
async function logFailedWelcome(gymId: string, to: string, error: string) {
  try {
    await supabaseAdmin.from('email_log').insert({
      gym_id: gymId,
      to_email: to,
      type: 'welcome_owner',
      status: 'failed',
      error: error.slice(0, 500),
    })
  } catch (err: any) {
    console.warn('[crear-gym] No se pudo registrar el fallo de email:', err?.message)
  }
}

// Best-effort: el mail de bienvenida nunca debe romper la creación del gym.
// El render branded (colores/logo del gym) vive en la función send-email.
async function sendWelcomeOwnerEmail(gymId: string, to: string, name?: string | null) {
  try {
    const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!internalSecret || !supabaseUrl) {
      console.warn('[crear-gym] Falta config para enviar bienvenida; se omite.')
      await logFailedWelcome(gymId, to, 'Falta INTERNAL_FUNCTION_SECRET o SUPABASE_URL en crear-gym')
      return
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        gym_id: gymId,
        to,
        type: 'welcome_owner',
        data: { name: name ?? null },
      }),
    })
    // send-email loguea sus propios fallos (Resend, RESEND_API_KEY); acá solo
    // dejamos rastro en los logs de la función para correlacionar.
    if (!res.ok) {
      console.warn(`[crear-gym] send-email respondió ${res.status} al enviar bienvenida.`)
    }
  } catch (err: any) {
    console.warn('[crear-gym] No se pudo enviar el mail de bienvenida:', err?.message)
    await logFailedWelcome(gymId, to, err?.message ?? 'error de red al invocar send-email')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let createdUserId: string | null = null
  let createdGymId: string | null = null

  try {
    // Auth: solo super_admin puede crear gyms.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return new Response(JSON.stringify({ error: 'Token inválido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (callerProfileError || !callerProfile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Solo el super_admin puede crear gyms.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const body = await req.json()
    const {
      gym_name,
      gym_slug,
      logo_url,
      logo_url_dark,
      theme_primary,
      theme_accent,
      header_logo_size,
      header_logo_position,
      header_content,
      gym_address,
      gym_phone,
      gym_email,
      gym_instagram,
      email,
      name,
      last_name,
      image_profile,
      phone,
      document_number,
      address,
    } = body

    if (!gym_name || !gym_slug || !email) {
      return new Response(JSON.stringify({ error: 'gym_name, gym_slug y email son requeridos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Crear owner en Auth. Si el email ya tiene cuenta (multi-gym: un profe
    // o dueño puede ya ser usuario de otro gym), se reutiliza esa cuenta y solo
    // se le agrega la membresía de owner del gym nuevo.
    let ownerUserId: string
    let ownerIsExisting = false

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      ownerUserId = existingProfile.user_id
      ownerIsExisting = true
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'tugimnasio123',
        email_confirm: true
      })
      if (authError) {
        return new Response(JSON.stringify({ error: getErrorMessage(authError) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      createdUserId = authData.user.id
      ownerUserId = authData.user.id
    }

    // 2. Crear gym con owner_id = user del owner
    const { data: gymData, error: gymError } = await supabaseAdmin
      .from('gyms')
      .insert({
        name: gym_name,
        slug: gym_slug,
        owner_id: ownerUserId,
        logo_url: logo_url ?? null,
        logo_url_dark: logo_url_dark ?? null,
        theme_primary: theme_primary ?? null,
        theme_accent: theme_accent ?? null,
        // Config del header (si no viene, la BD aplica sus defaults).
        header_logo_size: header_logo_size ?? undefined,
        header_logo_position: header_logo_position ?? undefined,
        header_content: header_content ?? undefined,
        address: gym_address ?? null,
        phone: gym_phone ?? null,
        email: gym_email ?? null,
        instagram: gym_instagram ?? null,
      })
      .select()
      .single()

    if (gymError) {
      if (createdUserId) await rollbackUser(createdUserId)
      throw gymError
    }
    createdGymId = gymData.id

    // 3. Crear profile (solo si la cuenta es nueva; un owner existente conserva
    // sus datos). El vínculo con el gym y el rol viven solo en memberships.
    if (!ownerIsExisting) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: ownerUserId,
          email: email?.toLowerCase() ?? null,
          name: name?.toLowerCase() ?? null,
          last_name: last_name?.toLowerCase() ?? null,
          image_profile: image_profile || null,
          phone: phone ?? null,
          document_number: document_number ?? null,
          address: address?.toLowerCase() ?? null,
        })

      if (profileError) {
        await rollbackGym(createdGymId)
        if (createdUserId) await rollbackUser(createdUserId)
        throw profileError
      }
    }

    // 4. Membresía de owner (fuente de verdad del vínculo persona↔gym).
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: ownerUserId,
        gym_id: createdGymId,
        role: 'owner',
        added_by: callerAuth.user.id,
      })

    if (membershipError) {
      // El delete del gym arrastra la membresía por cascade.
      await rollbackGym(createdGymId)
      if (createdUserId) await rollbackUser(createdUserId)
      throw membershipError
    }

    // Mail de bienvenida al owner (best-effort).
    await sendWelcomeOwnerEmail(createdGymId, email, name)

    return new Response(JSON.stringify({ done: true, gym_id: createdGymId, user_id: ownerUserId, linked_existing: ownerIsExisting }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al crear gym:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
