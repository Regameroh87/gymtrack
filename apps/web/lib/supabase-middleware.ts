// Helper de refresco de sesión para el middleware (@supabase/ssr). Devuelve la
// respuesta con las cookies de sesión actualizadas y el usuario autenticado (o
// null). El middleware combina esto con el rewrite de subdominios y el gating.

// Librerías
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type User } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Config
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  // Partimos de los headers originales y borramos cualquier valor que el cliente
  // haya podido inyectar — el header solo lo escribe el middleware tras validar.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-auth-uid");

  // Acumulamos las cookies a aplicar en lugar de recrear la response en setAll,
  // para poder construir UNA sola response final con headers + cookies juntos.
  const cookiesToApply: CookieToSet[] = [];

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToApply.push(...cookiesToSet);
      },
    },
  });

  // getUser() valida el JWT contra Supabase Auth y refresca el token si hace falta.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sellamos el UID validado en el request para que los Server Components puedan
  // leerlo con headers() y saltarse su propio getUser() (sin round-trip extra).
  if (user) requestHeaders.set("x-auth-uid", user.id);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  cookiesToApply.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );

  return { response, user };
}
