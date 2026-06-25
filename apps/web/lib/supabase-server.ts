// Cliente Supabase del SERVIDOR (RSC, server actions, route handlers). Ligado a
// las cookies del request vía next/headers. IMPORTANTE: crear UNA instancia por
// request (no reutilizar un singleton de módulo) para no filtrar sesiones entre
// usuarios. Por eso NO se usa el proxy global de @gymtrack/core en el server.

// Librerías
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Config
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export async function createServerSupabase() {
  // En Next 15 cookies() es asíncrono.
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // En Server Components puros, escribir cookies lanza; se ignora porque el
        // refresco de sesión ya lo hace el middleware. En server actions / route
        // handlers sí persiste.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // no-op (contexto sin escritura de cookies)
        }
      },
    },
  });
}
