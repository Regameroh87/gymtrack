// Helper de refresco de sesión para el middleware (@supabase/ssr). Devuelve la
// respuesta con las cookies de sesión actualizadas y el usuario autenticado (o
// null). El middleware combina esto con el rewrite de subdominios y el gating.

// Librerías
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { type User } from "@supabase/supabase-js";

// Config
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() refresca el token si hace falta y dispara setAll() arriba.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
