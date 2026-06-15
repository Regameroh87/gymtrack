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

  try {
    // Auth: solo super_admin puede borrar gyms.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const { data: callerAuth, error: callerAuthError } = await supabaseAdmin.auth.getUser(jwt)
    if (callerAuthError || !callerAuth?.user) {
      return jsonResponse({ error: 'Token inválido.' }, 401)
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (!callerProfile?.is_super_admin) {
      return jsonResponse({ error: 'Solo el super_admin puede eliminar gimnasios.' }, 403)
    }

    const body = await req.json()
    const { gym_id: gymId } = body
    if (!gymId) return jsonResponse({ error: 'gym_id es requerido.' }, 400)

    // Verificar que el gym exista.
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('id')
      .eq('id', gymId)
      .maybeSingle()

    if (!gym) {
      return jsonResponse({ error: 'El gimnasio no existe.' }, 404)
    }

    // 1. Recolectar los user_id de todos los miembros del gym (para evaluar
    // huérfanos después del borrado en cascada).
    const { data: members } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('gym_id', gymId)
    const memberUserIds = [...new Set((members ?? []).map((m) => m.user_id).filter(Boolean))]

    // 2. session_logs tiene FK ON DELETE NO ACTION hacia gyms, así que un delete
    // directo del gym fallaría si hay historial. Lo limpiamos antes; sus
    // session_set_logs caen por cascade de session_logs.
    const { error: logsError } = await supabaseAdmin
      .from('session_logs')
      .delete()
      .eq('gym_id', gymId)
    if (logsError) throw logsError

    // 3. Borrar el gym. El cascade arrastra memberships, exercises_base,
    // equipment, sessions, training_plans, plan_assignments, attendances,
    // gym_qr_tokens y sus árboles descendientes.
    const { error: gymDeleteError } = await supabaseAdmin
      .from('gyms')
      .delete()
      .eq('id', gymId)
    if (gymDeleteError) throw gymDeleteError

    // 4. Eliminar las cuentas de usuarios que ya no pertenecen a ningún gym.
    // Quienes están en otros gyms conservan su cuenta. El delete del auth user
    // arrastra su profile y datos personales por cascade.
    let deletedUsers = 0
    for (const userId of memberUserIds) {
      const { count } = await supabaseAdmin
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      if ((count ?? 0) === 0) {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (authDeleteError) {
          console.error('[eliminar-gym] Error al borrar auth user:', authDeleteError.message)
          continue
        }
        deletedUsers++
      }
    }

    return jsonResponse({ done: true, deleted_users: deletedUsers }, 200)

  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor'
    console.error('[eliminar-gym] Error crítico:', message)
    return jsonResponse({ error: message }, 400)
  }
})
