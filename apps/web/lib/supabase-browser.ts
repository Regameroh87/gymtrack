// Cliente Supabase del NAVEGADOR (client components). Lee/escribe la sesión en
// cookies que el servidor también puede leer (@supabase/ssr). Es el que usan el
// login/verify (signInWithOtp / verifyOtp) y los providers de auth.

// Librerías
import { createBrowserClient } from "@supabase/ssr";

// Config
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

let _client: ReturnType<typeof createBrowserClient> | null = null;

// Singleton: un único cliente por pestaña (evita múltiples listeners de auth).
export function getBrowserSupabase() {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return _client;
}
