import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

// Errores de auth.admin.createUser()
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


Deno.serve(async (req) => {
  // 1. Manejo de CORS (Para que tu app de React Native pueda llamar a la función)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()
    const { email, name, last_name, image_profile, phone, document_number, address } = body
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'tugimnasio123',
      email_confirm: true
    })
    if (authError) {
      const message = getErrorMessage(authError)
      return new Response(JSON.stringify({ error: message }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email?.toLowerCase() ?? null,
        name: name?.toLowerCase() ?? null,
        last_name: last_name?.toLowerCase() ?? null,
        image_profile: image_profile || null,      
        phone: phone ?? null,                      
        document_number: document_number ?? null,
        address: address?.toLowerCase() ?? null
      })

    if (profileError) {
      // Rollback: intentar eliminar el usuario de Auth para no dejar un usuario huérfano.
      // Usamos retry limitado (máx 3 intentos) con backoff.
      const MAX_RETRIES = 3
      let deleted = false
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        if (!deleteError) {
          deleted = true
          break // ✅ Borrado exitoso
        }
        console.warn(
          `[ROLLBACK] Intento ${attempt}/${MAX_RETRIES} fallido para borrar user ${authData.user.id}: ${deleteError.message}`
        )
        // Esperar antes del próximo intento: 500ms → 1000ms → 2000ms
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }
      }
      if (!deleted) {
        console.error(
          `[ROLLBACK FALLIDO] No se pudo eliminar el usuario de Auth tras ${MAX_RETRIES} intentos. ID: ${authData.user.id} — Eliminarlo manualmente desde el dashboard.`
        )
      }
      throw profileError
    }
    
    return new Response(JSON.stringify({ done: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error: any) {
    const message = error?.message || error?.msg || "Error interno del servidor";
    console.error("Error crítico al crear usuario en supabase");
    
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
