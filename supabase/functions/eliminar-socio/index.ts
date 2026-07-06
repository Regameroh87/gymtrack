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
    const { gym_id: targetGymId, target_user_id: targetUserId } = body

    if (!targetGymId) return jsonResponse({ error: 'gym_id es requerido.' }, 400)
    if (!targetUserId) return jsonResponse({ error: 'target_user_id es requerido.' }, 400)
    if (targetUserId === callerAuth.user.id) {
      return jsonResponse({ error: 'No podés eliminarte a vos mismo.' }, 400)
    }

    // Resolver rol del caller en el gym
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', callerAuth.user.id)
      .single()

    if (!callerProfile) {
      return jsonResponse({ error: 'Perfil del caller no encontrado.' }, 403)
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

    const ALLOWED_CALLER_ROLES = ['super_admin', 'owner']
    if (!callerRole || !ALLOWED_CALLER_ROLES.includes(callerRole)) {
      return jsonResponse({ error: 'Solo el dueño del gimnasio puede eliminar socios permanentemente.' }, 403)
    }

    // Verificar que el target tenga membresía en este gym y obtener su rol
    const { data: targetMembership } = await supabaseAdmin
      .from('memberships')
      .select('id, role')
      .eq('user_id', targetUserId)
      .eq('gym_id', targetGymId)
      .maybeSingle()

    if (!targetMembership) {
      return jsonResponse({ error: 'Este usuario no es miembro de este gimnasio.' }, 404)
    }

    // Impedir eliminar a otro owner o super_admin
    const PROTECTED_ROLES = ['owner', 'super_admin']
    if (PROTECTED_ROLES.includes(targetMembership.role)) {
      return jsonResponse({ error: 'No se puede eliminar a un dueño o super administrador.' }, 403)
    }

    // Eliminar la membresía de este gym
    const { error: deleteError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('id', targetMembership.id)

    if (deleteError) throw deleteError

    // Verificar si el target tiene otras membresías en cualquier gym
    const { count } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId)

    let fullDelete = false
    if ((count ?? 0) === 0) {
      // Sin otras membresías: eliminar cuenta completa (cascade borra profile y datos).
      // Antes encolamos su avatar en media_delete_queue para que el cron
      // cleanUp-media lo borre de Storage (el cascade del profile no lo limpia).
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('image_profile')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (targetProfile?.image_profile) {
        const { error: queueError } = await supabaseAdmin
          .from('media_delete_queue')
          .upsert(
            { public_id: targetProfile.image_profile, resource_type: 'image' },
            { onConflict: 'public_id' }
          )
        // No abortamos si falla el encolado: el borrado del socio es lo prioritario.
        if (queueError) {
          console.error('[eliminar-socio] Error al encolar avatar:', queueError.message)
        }
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
      if (authDeleteError) {
        console.error('[eliminar-socio] Error al borrar auth user:', authDeleteError.message)
        // La membresía ya fue eliminada; el perfil huérfano es manejable,
        // pero reportamos el error para que el caller sepa.
        throw authDeleteError
      }
      fullDelete = true
    }

    return jsonResponse({ done: true, full_delete: fullDelete }, 200)

  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor'
    console.error('[eliminar-socio] Error crítico:', message)
    return jsonResponse({ error: message }, 400)
  }
})
