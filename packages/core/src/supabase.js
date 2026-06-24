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

// Singleton del cliente, configurado por el host al boot (mismo patrón que el
// storage adapter). Los hooks de datos agnósticos de core lo consumen vía
// getSupabaseClient() en lugar de importar el cliente del host —así core no
// depende de la ruta del wrapper móvil ni de las env del host—. Móvil registra
// el cliente construido con AsyncStorage; web registrará el suyo de cookies.
let _client = null;

export function setSupabaseClient(client) {
  _client = client;
}

export function getSupabaseClient() {
  if (!_client) {
    throw new Error(
      "[core/supabase] No hay cliente configurado. Llamá setSupabaseClient(...) en el arranque del host (móvil o web)."
    );
  }
  return _client;
}
