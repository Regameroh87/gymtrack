import { createClient, processLock } from "@supabase/supabase-js";

// Factory agnóstica de plataforma para el cliente Supabase.
//
// El host (móvil / web) inyecta url, key y el `storage` de auth:
//   - Móvil (Expo): AsyncStorage.
//   - Web (Next): adapter de cookies (@supabase/ssr) en la fase de auth.
//
// No se leen variables de entorno acá a propósito: difieren por plataforma
// (EXPO_PUBLIC_* vs NEXT_PUBLIC_*), así que las inyecta quien crea el cliente.
export function createSupabaseClient({ url, key, storage, auth = {} }) {
  if (!url || !key) {
    console.error(
      "[core/supabase] Faltan url / key de Supabase. " +
        "Verificá las variables de entorno del host (móvil o web)."
    );
  }

  return createClient(url, key, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
      ...auth, // permite override por plataforma (ej. flow PKCE en web)
    },
  });
}
