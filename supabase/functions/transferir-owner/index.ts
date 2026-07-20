// Transferencia del dueño de un gimnasio (panel de plataforma).
//
// La parte de base de datos la hace el RPC transfer_gym_owner, que corre las
// tres escrituras (gyms.owner_id + membership saliente + membership entrante) en
// una sola transacción. Esta función existe para lo que el RPC no puede hacer:
// crear la cuenta en Auth cuando el dueño nuevo todavía no es usuario (requiere
// service role) y mandar el mail de bienvenida.
//
// El RPC se invoca con el JWT de quien llama, NO con service role: así auth.uid()
// resuelve, is_platform_admin() puede autorizar y memberships.added_by queda
// atribuido a la persona real. Es también la razón de que el guard de acá abajo
// no sea el único control: el RPC vuelve a chequear por su cuenta.

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
  console.error("Auth Error details:", JSON.stringify(error))
  return AUTH_ERRORS[error.code] ?? "Ha ocurrido un error inesperado, por favor intentá de nuevo."
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
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

// Best-effort: deja una fila 'failed' en email_log cuando el envío ni siquiera
// llega a send-email (config faltante o error de red).
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
    console.warn('[transferir-owner] No se pudo registrar el fallo de email:', err?.message)
  }
}

// Best-effort: el mail de bienvenida nunca debe romper la transferencia, que a
// esta altura ya está confirmada en la base.
async function sendWelcomeOwnerEmail(gymId: string, to: string, name?: string | null) {
  try {
    const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!internalSecret || !supabaseUrl) {
      console.warn('[transferir-owner] Falta config para enviar bienvenida; se omite.')
      await logFailedWelcome(gymId, to, 'Falta INTERNAL_FUNCTION_SECRET o SUPABASE_URL en transferir-owner')
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
    if (!res.ok) {
      console.warn(`[transferir-owner] send-email respondió ${res.status} al enviar bienvenida.`)
    }
  } catch (err: any) {
    console.warn('[transferir-owner] No se pudo enviar el mail de bienvenida:', err?.message)
    await logFailedWelcome(gymId, to, err?.message ?? 'error de red al invocar send-email')
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let createdUserId: string | null = null

  try {
    // ── Auth: solo staff admin de plataforma ──────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return json({ error: 'No autorizado.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return json({ error: 'Token inválido.' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin, platform_staff_role')
      .eq('user_id', callerAuth.user.id)
      .single()

    const callerIsPlatformAdmin =
      !!callerProfile?.is_super_admin || callerProfile?.platform_staff_role === 'admin'
    if (callerProfileError || !callerIsPlatformAdmin) {
      return json({ error: 'Solo el super_admin puede transferir gimnasios.' }, 403)
    }

    const body = await req.json()
    const {
      gym_id,
      mode,
      user_id,
      email,
      name,
      last_name,
      phone,
      previous_action = 'demote',
    } = body

    if (!gym_id) {
      return json({ error: 'gym_id es requerido.' }, 400)
    }
    if (mode !== 'existing' && mode !== 'new') {
      return json({ error: "mode debe ser 'existing' o 'new'." }, 400)
    }
    if (previous_action !== 'demote' && previous_action !== 'remove') {
      return json({ error: "previous_action debe ser 'demote' o 'remove'." }, 400)
    }
    if (mode === 'existing' && !user_id) {
      return json({ error: 'Seleccioná el nuevo dueño.' }, 400)
    }
    if (mode === 'new' && !email) {
      return json({ error: 'El email del nuevo dueño es requerido.' }, 400)
    }

    // ── 1. Resolver quién va a ser el dueño ───────────────────────────────
    let newOwnerUserId: string
    let ownerIsExisting = true

    if (mode === 'existing') {
      newOwnerUserId = user_id
    } else {
      // Mismo criterio multi-gym que crear-gym: si el email ya tiene cuenta se
      // reutiliza (una persona puede ser dueña de varios gyms).
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (existingProfile) {
        newOwnerUserId = existingProfile.user_id
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: 'tugimnasio123',
          email_confirm: true,
        })
        if (authError) {
          return json({ error: getErrorMessage(authError) }, 400)
        }
        createdUserId = authData.user.id
        newOwnerUserId = authData.user.id
        ownerIsExisting = false

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: newOwnerUserId,
            email: email.toLowerCase(),
            name: name?.toLowerCase() ?? null,
            last_name: last_name?.toLowerCase() ?? null,
            phone: phone ?? null,
          })

        if (profileError) {
          await rollbackUser(createdUserId)
          throw profileError
        }
      }
    }

    // ── 2. Transferencia atómica (gym + ambas memberships) ────────────────
    // Con el JWT de quien llama, no con service role: el RPC necesita auth.uid()
    // para autorizar y para registrar added_by.
    const supabaseAsCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    )

    const { error: rpcError } = await supabaseAsCaller.rpc('transfer_gym_owner', {
      p_gym_id: gym_id,
      p_new_owner_id: newOwnerUserId,
      p_previous_action: previous_action,
    })

    if (rpcError) {
      // La cuenta recién creada no llegó a ser dueña de nada: se deshace para no
      // dejar usuarios huérfanos por un intento fallido.
      if (createdUserId) await rollbackUser(createdUserId)
      return json({ error: rpcError.message ?? 'No se pudo transferir el gimnasio.' }, 400)
    }

    // ── 3. Bienvenida solo a cuentas nuevas (best-effort) ─────────────────
    if (!ownerIsExisting) {
      await sendWelcomeOwnerEmail(gym_id, email, name)
    }

    return json({ done: true, user_id: newOwnerUserId, linked_existing: ownerIsExisting }, 200)

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor"
    console.error("Error crítico al transferir el gym:", message)
    return json({ error: message }, 400)
  }
})
