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
  console.error(`[ROLLBACK FALLIDO] No se pudo eliminar user de Auth. Eliminarlo manualmente.`)
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    // Auth: el caller debe ser staff con poder de crear (ver matriz ASSIGNABLE).
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

    // gym_id y role vienen del caller — el cliente nunca los pasa en el body.
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('gym_id, role')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return new Response(JSON.stringify({ error: 'Perfil del caller no encontrado.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 403,
      })
    }

    const { gym_id: callerGymId, role: callerRole } = callerProfile

    // Matriz de roles asignables: cada rol crea estrictamente por debajo del suyo.
    // Debe mantenerse en sync con ASSIGNABLE_ROLES en src/constants/roles.js.
    const ASSIGNABLE: Record<string, string[]> = {
      super_admin: ['owner', 'admin', 'coach', 'member'],
      owner: ['admin', 'coach', 'member'],
      admin: ['coach', 'member'],
      coach: ['member'],
    }
    const allowed = ASSIGNABLE[callerRole] ?? []

    if (allowed.length === 0) {
      return new Response(JSON.stringify({ error: 'No tenés permisos para crear usuarios.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 403,
      })
    }

    const body = await req.json()
    const { email, name, last_name, image_profile, phone, document_number, address } = body
    const newRole: string = body.role ?? 'member'

    if (!email) {
      return new Response(JSON.stringify({ error: 'email es requerido.' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      })
    }

    if (!allowed.includes(newRole)) {
      return new Response(JSON.stringify({ error: `El rol '${callerRole}' no puede crear usuarios con rol '${newRole}'.` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 403,
      })
    }

    // 1. Crear user en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'tugimnasio123',
      email_confirm: true,
    })
    if (authError) {
      return new Response(JSON.stringify({ error: getErrorMessage(authError) }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      })
    }

    // 2. Crear profile con gym_id heredado del caller
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        gym_id: callerGymId,
        role: newRole,
        email: email?.toLowerCase() ?? null,
        name: name?.toLowerCase() ?? null,
        last_name: last_name?.toLowerCase() ?? null,
        image_profile: image_profile || null,
        phone: phone ?? null,
        document_number: document_number ?? null,
        address: address?.toLowerCase() ?? null,
      })

    if (profileError) {
      await rollbackUser(authData.user.id)
      throw profileError
    }

    return new Response(JSON.stringify({ done: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al crear socio:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
