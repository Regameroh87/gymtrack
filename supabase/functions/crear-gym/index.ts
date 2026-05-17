import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  let createdUserId: string | null = null
  let createdGymId: string | null = null

  try {
    // Auth: solo super_admin puede crear gyms.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 401,
      })
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return new Response(JSON.stringify({ error: 'Token inválido.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 401,
      })
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Solo el super_admin puede crear gyms.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 403,
      })
    }

    const body = await req.json()
    const {
      gym_name,
      gym_slug,
      logo_url,
      theme_primary,
      theme_accent,
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      })
    }

    // 1. Crear owner en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'tugimnasio123',
      email_confirm: true
    })
    if (authError) {
      return new Response(JSON.stringify({ error: getErrorMessage(authError) }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      })
    }
    createdUserId = authData.user.id

    // 2. Crear gym con owner_id = nuevo user
    const { data: gymData, error: gymError } = await supabaseAdmin
      .from('gyms')
      .insert({
        name: gym_name,
        slug: gym_slug,
        owner_id: createdUserId,
        logo_url: logo_url ?? null,
        theme_primary: theme_primary ?? null,
        theme_accent: theme_accent ?? null,
      })
      .select()
      .single()

    if (gymError) {
      await rollbackUser(createdUserId)
      throw gymError
    }
    createdGymId = gymData.id

    // 3. Crear profile vinculado al gym y con role=owner
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: createdUserId,
        gym_id: createdGymId,
        role: 'owner',
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
      await rollbackUser(createdUserId)
      throw profileError
    }

    return new Response(JSON.stringify({ done: true, gym_id: createdGymId, user_id: createdUserId }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al crear gym:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
