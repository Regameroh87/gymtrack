// Helpers compartidos de las edge functions que crean/gestionan gyms.
// Mismos cuerpos que los locales de crear-gym / transferir-owner (que conservan
// sus copias: son funciones deployadas y estables; consolidar acá al tocarlas).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

export async function rollbackGym(gymId: string) {
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
export async function logFailedWelcome(gymId: string, to: string, error: string) {
  try {
    await supabaseAdmin.from('email_log').insert({
      gym_id: gymId,
      to_email: to,
      type: 'welcome_owner',
      status: 'failed',
      error: error.slice(0, 500),
    })
  } catch (err: any) {
    console.warn('[gym-helpers] No se pudo registrar el fallo de email:', err?.message)
  }
}

// Best-effort: el mail de bienvenida nunca debe romper la creación del gym.
// El render branded (colores/logo del gym) vive en la función send-email.
export async function sendWelcomeOwnerEmail(gymId: string, to: string, name?: string | null) {
  try {
    const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!internalSecret || !supabaseUrl) {
      console.warn('[gym-helpers] Falta config para enviar bienvenida; se omite.')
      await logFailedWelcome(gymId, to, 'Falta INTERNAL_FUNCTION_SECRET o SUPABASE_URL')
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
      console.warn(`[gym-helpers] send-email respondió ${res.status} al enviar bienvenida.`)
    }
  } catch (err: any) {
    console.warn('[gym-helpers] No se pudo enviar el mail de bienvenida:', err?.message)
    await logFailedWelcome(gymId, to, err?.message ?? 'error de red al invocar send-email')
  }
}
