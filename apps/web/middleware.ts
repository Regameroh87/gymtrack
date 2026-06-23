import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "gymtrack.ar";

// Subdominios reservados que NO son gyms (sirven la landing de marca o la app).
const RESERVED = new Set(["www", "app", "api", ""]);

// Extrae el subdominio (slug del gym) del host, o null si es apex/reservado.
// Soporta producción (slug.gymtrack.ar) y local (slug.localhost:3000).
function getSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]; // sin puerto

  let sub: string | null = null;
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    sub = hostname.slice(0, -1 * (ROOT_DOMAIN.length + 1));
  } else if (hostname.endsWith(".localhost")) {
    sub = hostname.slice(0, -1 * ".localhost".length);
  }

  if (!sub) return null;
  // Solo el primer label (descarta multi-nivel inesperado).
  sub = sub.split(".")[0];
  if (RESERVED.has(sub)) return null;
  return sub;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const slug = getSubdomain(host);
  if (!slug) return NextResponse.next();

  // Subdominio de gym → reescribe a la ruta interna /_sites/[slug] manteniendo
  // el resto del path. La URL del navegador no cambia.
  const url = req.nextUrl.clone();
  url.pathname = `/_sites/${slug}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Excluye assets y rutas internas; deja pasar páginas.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
