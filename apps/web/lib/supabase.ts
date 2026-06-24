import { createSupabaseClient } from "@gymtrack/core/supabase";

// Cliente Supabase de solo lectura pública (clave anon/publishable). Las páginas
// son Server Components, así que esto corre en el server. Solo se usa para las
// RPCs públicas (get_public_gym / list_public_gyms); no maneja sesión.
//
// Usa la factory agnóstica de @gymtrack/core (la misma que construye el cliente
// en el móvil) para no duplicar la creación. Acá no hay sesión: persistSession y
// autoRefreshToken van en false y no se inyecta storage.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createSupabaseClient({
  url,
  key: anonKey,
  auth: { persistSession: false, autoRefreshToken: false },
});
