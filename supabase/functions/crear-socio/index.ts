import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ERROR_MESSAGES = {
  23505: "Este correo o número de documento ya se encuentra registrado.",
  23502: "Faltan datos obligatorios para el registro.",
  42501: "Error de permisos. Verifica tu sesión.",
  default: "Ocurrió un error inesperado. Inténtalo de nuevo.",
};

Deno.serve(async (req) => {
  // 1. Manejo de CORS (Para que tu app de React Native pueda llamar a la función)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { email, name, last_name, image_profile, phone, document_number, address } = await req.json()

    // 2. Cliente con Service Role Key (Permisos de Admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Crear el usuario en AUTH
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'tugimnasio123', // El socio la cambiará después
      email_confirm: false
    })

    if (authError) throw authError

    // 4. Crear el perfil en PUBLIC.PROFILES con el MISMO ID
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id, // Sincronización total
        email,
        name,
        last_name,
        image_profile,
        phone,
        document_number,
        address,
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ done: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
