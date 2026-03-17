import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Errores de auth.admin.createUser()
const AUTH_ERRORS: Record<string, string> = {
  "User already registered": "Este correo ya se encuentra registrado.",
  "email_exists":            "Este correo ya se encuentra registrado.",
  "Invalid email":           "El correo electrónico no es válido.",
  "Email rate limit exceeded": "Demasiados intentos. Esperá unos minutos.",
  "Database error saving new user": "Error interno al guardar el usuario. Intentá de nuevo.",
}


function getErrorMessage(error: { message?: string; code?: string | number }): string {
  // Buscar en errores de auth por message o code
  const authMsg = AUTH_ERRORS[error.message ?? ''] ?? AUTH_ERRORS[error.code ?? '']
  if (authMsg) return authMsg

  return error.message ?? "Ocurrió un error inesperado. Inténtalo de nuevo."
}


Deno.serve(async (req) => {
  // 1. Manejo de CORS (Para que tu app de React Native pueda llamar a la función)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const body = await req.json()
    const { email, name, last_name, image_profile, phone, document_number, address } = body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    if (profileError){
      // DEBERIA BORRA DE AUTH EL USUARIO CREADO, SINO ME QUEDA EN AUTH Y AL IUNTENTAR INGRESARLO NUEVAMENTE ME DA ERROR
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    } 

    return new Response(JSON.stringify({ done: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error) {
    console.log("Error en la funcion crear-socio:", error.message, "| code:", error.code)
    return new Response(JSON.stringify({ error: "Ha ocurrido un error al guardar al usuario. Inténtalo de nuevo." }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
