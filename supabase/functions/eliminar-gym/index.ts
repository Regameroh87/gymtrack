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
      .select('is_super_admin, platform_staff_role')
      .eq('user_id', callerAuth.user.id)
      .single()

    const callerIsPlatformAdmin =
      !!callerProfile?.is_super_admin || callerProfile?.platform_staff_role === 'admin'
    if (!callerIsPlatformAdmin) {
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

    // 1. Borrado atómico de todo el contenido del gym en orden de dependencias.
    // La RPC corre en una sola transacción (un delete directo del gym fallaba por
    // las FK NO ACTION que session_exercises/session_set_logs tienen hacia
    // exercises_base). Devuelve los user_id que quedaron sin ningún gym.
    const { data: orphanUserIds, error: deleteError } = await supabaseAdmin
      .rpc('delete_gym_cascade', { p_gym_id: gymId })
    if (deleteError) throw deleteError

    // 2. Eliminar las cuentas de usuarios que ya no pertenecen a ningún gym.
    // El gym ya se borró atómicamente, así que un fallo acá no debe abortar la
    // operación: se loguea y se sigue. El delete del auth user arrastra su profile
    // y datos personales por cascade.
    let deletedUsers = 0
    for (const userId of (orphanUserIds ?? [])) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (authDeleteError) {
        console.error('[eliminar-gym] Error al borrar auth user:', authDeleteError.message)
        continue
      }
      deletedUsers++
    }

    return jsonResponse({ done: true, deleted_users: deletedUsers }, 200)

  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor'
    console.error('[eliminar-gym] Error crítico:', message)
    return jsonResponse({ error: message }, 400)
  }
})
