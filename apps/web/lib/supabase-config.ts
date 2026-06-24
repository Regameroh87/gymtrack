// Configuración compartida de Supabase para los clientes con sesión (SSR).
// Las mismas variables públicas que usa el cliente anon de solo lectura
// (lib/supabase.ts); acá habilitan la sesión por cookies vía @supabase/ssr.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[supabase] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}
