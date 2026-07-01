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
  console.error(`[ROLLBACK FALLIDO] No se pudo eliminar user de Auth. Eliminarlo manualmente.`)
  return false
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Matriz de roles de plataforma asignables: cada rol crea estrictamente por
// debajo del suyo. Debe mantenerse en sync con PLATFORM_ASSIGNABLE_ROLES en
// apps/web/lib/auth/roles.ts.
const ASSIGNABLE: Record<string, string[]> = {
  super_admin: ['admin', 'coach'],
  admin: ['coach'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: el caller debe ser super_admin o admin de plataforma.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return jsonResponse({ error: 'Token inválido.' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin, platform_staff_role')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return jsonResponse({ error: 'Perfil del caller no encontrado.' }, 403)
    }

    const callerRole = callerProfile.is_super_admin ? 'super_admin' : callerProfile.platform_staff_role
    const allowed = callerRole ? (ASSIGNABLE[callerRole] ?? []) : []

    if (allowed.length === 0) {
      return jsonResponse({ error: 'No tenés permisos para crear staff de plataforma.' }, 403)
    }

    const body = await req.json()
    const { email, name, last_name } = body
    const newRole: string = body.role ?? ''

    if (!email) {
      return jsonResponse({ error: 'email es requerido.' }, 400)
    }

    if (!allowed.includes(newRole)) {
      return jsonResponse({ error: `El rol '${callerRole}' no puede crear staff con rol '${newRole}'.` }, 403)
    }

    // A diferencia de crear-socio, acá NO se linkea una cuenta existente:
    // elevar a alguien a staff de plataforma tiene que ser explícito.
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      return jsonResponse({ error: 'Ya existe una cuenta con este correo.' }, 400)
    }

    // 1. Crear user en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'tugimnasio123',
      email_confirm: true,
    })
    if (authError) {
      return jsonResponse({ error: getErrorMessage(authError) }, 400)
    }

    // 2. Crear profile con el rol de plataforma (sin membership: no pertenece a ningún gym).
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email: email?.toLowerCase() ?? null,
        name: name?.toLowerCase() ?? null,
        last_name: last_name?.toLowerCase() ?? null,
        is_super_admin: false,
        platform_staff_role: newRole,
      })

    if (profileError) {
      await rollbackUser(authData.user.id)
      throw profileError
    }

    return jsonResponse({ done: true }, 200)

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al crear staff de plataforma:", message)
    return jsonResponse({ error: message }, 400)
  }
})
