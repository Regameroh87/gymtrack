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

// Best-effort: el mail de bienvenida nunca debe romper la creación del socio.
// El render branded (colores/logo del gym) vive en la función send-email.
async function sendWelcomeMemberEmail(gymId: string, to: string, name?: string | null) {
  try {
    const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!internalSecret || !supabaseUrl) {
      console.warn('[crear-socio] Falta config para enviar bienvenida; se omite.')
      return
    }

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({
        gym_id: gymId,
        to,
        type: 'welcome_member',
        data: { name: name ?? null },
      }),
    })
  } catch (err: any) {
    console.warn('[crear-socio] No se pudo enviar el mail de bienvenida:', err?.message)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: el caller debe ser staff con poder de crear (ver matriz ASSIGNABLE).
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return jsonResponse({ error: 'Token inválido.' }, 401)
    }

    const body = await req.json()
    const { email, name, last_name, image_profile, phone, document_number, address, gender } = body
    const newRole: string = body.role ?? 'member'

    // El gym objetivo viene del body (gym activo del caller); el rol del caller
    // en ESE gym se resuelve server-side contra memberships — nunca del body.
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return jsonResponse({ error: 'Perfil del caller no encontrado.' }, 403)
    }

    const targetGymId: string | null = body.gym_id ?? null
    if (!targetGymId) {
      return jsonResponse({ error: 'gym_id es requerido.' }, 400)
    }

    let callerRole: string | null = null
    if (callerProfile.is_super_admin) {
      callerRole = 'super_admin'
    } else {
      const { data: callerMembership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', callerAuth.user.id)
        .eq('gym_id', targetGymId)
        .eq('status', 'active')
        .maybeSingle()
      callerRole = callerMembership?.role ?? null
    }

    // Matriz de roles asignables: cada rol crea estrictamente por debajo del suyo.
    // Debe mantenerse en sync con ASSIGNABLE_ROLES en src/constants/roles.js.
    const ASSIGNABLE: Record<string, string[]> = {
      super_admin: ['owner', 'admin', 'coach', 'member'],
      owner: ['admin', 'coach', 'member'],
      admin: ['coach', 'member'],
      coach: ['member'],
    }
    const allowed = callerRole ? (ASSIGNABLE[callerRole] ?? []) : []

    if (allowed.length === 0) {
      return jsonResponse({ error: 'No tenés permisos para crear usuarios en este gimnasio.' }, 403)
    }

    // Whitelist: cualquier valor fuera de la taxonomía se descarta a null.
    const VALID_GENDERS = ['hombre', 'mujer', 'prefiero_no_decir']
    const newGender = VALID_GENDERS.includes(gender) ? gender : null

    if (!email) {
      return jsonResponse({ error: 'email es requerido.' }, 400)
    }

    if (!allowed.includes(newRole)) {
      return jsonResponse({ error: `El rol '${callerRole}' no puede crear usuarios con rol '${newRole}'.` }, 403)
    }

    // Verificar DNI único dentro del gym (solo si se provee document_number).
    if (document_number) {
      const { data: gymMembers } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('gym_id', targetGymId)
        .eq('status', 'active')

      if (gymMembers?.length) {
        const userIds = gymMembers.map((m: { user_id: string }) => m.user_id)
        const { data: dniConflict } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('document_number', document_number)
          .in('user_id', userIds)
          .maybeSingle()

        if (dniConflict) {
          return jsonResponse({ error: 'Ya existe un socio con ese número de documento en este gimnasio.' }, 400)
        }
      }
    }

    // ¿Ya existe una cuenta con este email? Si existe, en vez de fallar se le
    // agrega una membresía al gym del caller (multi-gym: misma cuenta, varios gyms).
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      const { data: existingMembership } = await supabaseAdmin
        .from('memberships')
        .select('id, status')
        .eq('user_id', existingProfile.user_id)
        .eq('gym_id', targetGymId)
        .maybeSingle()

      if (existingMembership?.status === 'active') {
        return jsonResponse({ error: 'Esta persona ya es socio de este gimnasio.' }, 400)
      }

      if (existingMembership) {
        // Membresía inactiva: se reactiva con el rol nuevo.
        const { error: reactivateError } = await supabaseAdmin
          .from('memberships')
          .update({ status: 'active', role: newRole, added_by: callerAuth.user.id })
          .eq('id', existingMembership.id)
        if (reactivateError) throw reactivateError
      } else {
        const { error: membershipError } = await supabaseAdmin
          .from('memberships')
          .insert({
            user_id: existingProfile.user_id,
            gym_id: targetGymId,
            role: newRole,
            added_by: callerAuth.user.id,
          })
        if (membershipError) throw membershipError
      }

      // No se pisan los datos personales de la cuenta existente.
      return jsonResponse({ done: true, linked_existing: true }, 200)
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

    // 2. Crear profile (identidad global de la persona; el vínculo con el gym
    // y el rol viven solo en memberships).
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email: email?.toLowerCase() ?? null,
        name: name?.toLowerCase() ?? null,
        last_name: last_name?.toLowerCase() ?? null,
        image_profile: image_profile || null,
        phone: phone ?? null,
        document_number: document_number ?? null,
        address: address?.toLowerCase() ?? null,
        gender: newGender,
      })

    if (profileError) {
      await rollbackUser(authData.user.id)
      throw profileError
    }

    // 3. Crear la membresía (fuente de verdad del vínculo persona↔gym).
    const { error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        gym_id: targetGymId,
        role: newRole,
        added_by: callerAuth.user.id,
      })

    if (membershipError) {
      await supabaseAdmin.from('profiles').delete().eq('user_id', authData.user.id)
      await rollbackUser(authData.user.id)
      throw membershipError
    }

    // Mail de bienvenida (best-effort; solo para cuentas nuevas).
    await sendWelcomeMemberEmail(targetGymId, email, name)

    return jsonResponse({ done: true, linked_existing: false }, 200)

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al crear socio:", message)
    return jsonResponse({ error: message }, 400)
  }
})
