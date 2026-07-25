// Borrado de un gimnasio (solo super_admin / admin de plataforma).
//
// Antes del borrado en cascada se cancela la suscripción en MercadoPago: la fila
// de gym_saas_subscriptions se va por CASCADE, pero el preapproval sigue vivo en
// MP y le sigue cobrando la tarjeta al dueño todos los meses, sin ninguna fila
// donde registrarlo.
//
// Variables de entorno para esa cancelación (opcionales; sin ellas el borrado
// sigue funcionando y se avisa en la respuesta):
//   MP_ACCESS_TOKEN        – app MP real
//   MP_ACCESS_TOKEN_TEST   – app del vendedor de prueba
//   MP_TEST_APPLICATION_ID – id de esa app; decide qué token usar

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const MP_API = 'https://api.mercadopago.com'

/** Token capaz de tocar un preapproval, según la app de MP que lo creó. */
function tokenDeLaApp(mpApplicationId: string | null): string | undefined {
  const testAppId = Deno.env.get('MP_TEST_APPLICATION_ID')
  const esDePrueba = !!testAppId && mpApplicationId === testAppId
  return esDePrueba
    ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
    : Deno.env.get('MP_ACCESS_TOKEN')
}

/**
 * Cancela en MP TODOS los preapprovals vivos del gym. Devuelve un texto para la
 * respuesta, o null si no quedó nada pendiente de atención manual.
 *
 * Se recorre saas_preapprovals y no solo gym_saas_subscriptions.mp_preapproval_id:
 * un gym puede arrastrar varios (cada checkout crea uno nuevo) y basta con que
 * uno quede vivo para que MP le siga cobrando la tarjeta a un dueño que ya no
 * existe en el sistema. El registro se va por CASCADE junto con el gym, así que
 * esta es la última oportunidad de leerlo.
 *
 * Best-effort a propósito: el super_admin ya decidió borrar el gym y un fallo de
 * MP no debe abortar la operación. Lo que sí hace es DEVOLVER el resultado, para
 * que quede a la vista si hay que entrar al panel de MP a cancelar a mano.
 */
async function cancelarSuscripcionMp(gymId: string): Promise<string | null> {
  const { data: registrados } = await supabaseAdmin
    .from('saas_preapprovals')
    .select('mp_preapproval_id, mp_application_id')
    .eq('gym_id', gymId)
    .is('canceled_at', null)

  // preapproval_id → app de MP que lo creó (define con qué token se cancela).
  const objetivos = new Map<string, string | null>()
  for (const r of registrados ?? []) {
    objetivos.set(r.mp_preapproval_id, r.mp_application_id)
  }

  // Red de seguridad: el id que guarda la suscripción, por si nunca se registró
  // (fila anterior a saas_preapprovals, o un track que falló).
  const { data: sub } = await supabaseAdmin
    .from('gym_saas_subscriptions')
    .select('mp_preapproval_id, mp_application_id')
    .eq('gym_id', gymId)
    .maybeSingle()

  if (sub?.mp_preapproval_id && !objetivos.has(sub.mp_preapproval_id)) {
    objetivos.set(sub.mp_preapproval_id, sub.mp_application_id)
  }

  if (!objetivos.size) return null

  const fallidos: string[] = []

  for (const [preapprovalId, appId] of objetivos) {
    const token = tokenDeLaApp(appId)
    if (!token) {
      console.error(
        `[eliminar-gym] sin access token de MP para el preapproval ${preapprovalId}`,
      )
      fallidos.push(preapprovalId)
      continue
    }

    try {
      const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      // 4xx = el preapproval no existe o ya estaba cancelado: el objetivo (que no
      // se cobre más) ya está cumplido. Mismo criterio que /api/saas/subscription/cancel.
      if (res.ok || res.status < 500) {
        console.log(
          `[eliminar-gym] preapproval ${preapprovalId} cancelado en MP (${res.status})`,
        )
        continue
      }

      console.error(
        `[eliminar-gym] MP devolvió ${res.status} al cancelar ${preapprovalId}: ${await res.text()}`,
      )
      fallidos.push(preapprovalId)
    } catch (error: any) {
      console.error(
        `[eliminar-gym] no se pudo contactar a MercadoPago para ${preapprovalId}:`,
        error?.message,
      )
      fallidos.push(preapprovalId)
    }
  }

  if (!fallidos.length) return null

  return `quedaron sin cancelar ${fallidos.length} suscripción(es) en MercadoPago: ${fallidos.join(', ')}. Cancelalas a mano en el panel de MercadoPago o le van a seguir cobrando la tarjeta al dueño.`
}

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

    // 1. Cancelar el cobro recurrente en MP. Va ANTES del borrado porque el
    // delete en cascada se lleva la fila con el mp_preapproval_id: después ya no
    // hay forma de saber qué cancelar.
    const mpWarning = await cancelarSuscripcionMp(gymId)

    // 2. Borrado atómico de todo el contenido del gym en orden de dependencias.
    // La RPC corre en una sola transacción (un delete directo del gym fallaba por
    // las FK NO ACTION que session_exercises/session_set_logs tienen hacia
    // exercises_base). Devuelve los user_id que quedaron sin ningún gym.
    const { data: orphanUserIds, error: deleteError } = await supabaseAdmin
      .rpc('delete_gym_cascade', { p_gym_id: gymId })
    if (deleteError) throw deleteError

    // 3. Eliminar las cuentas de usuarios que ya no pertenecen a ningún gym.
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

    return jsonResponse(
      { done: true, deleted_users: deletedUsers, mp_warning: mpWarning },
      200,
    )

  } catch (error: any) {
    const message = error?.message || 'Error interno del servidor'
    console.error('[eliminar-gym] Error crítico:', message)
    return jsonResponse({ error: message }, 400)
  }
})
