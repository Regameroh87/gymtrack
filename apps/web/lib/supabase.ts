import { createClient } from "@supabase/supabase-js";

// Cliente Supabase de solo lectura pública (clave anon/publishable). Las páginas
// son Server Components, así que esto corre en el server. Solo se usa para las
// RPCs públicas (get_public_gym / list_public_gyms); no maneja sesión.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
