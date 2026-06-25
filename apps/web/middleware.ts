import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase-middleware";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "gymtrack.ar";

// Subdominios reservados que NO son gyms (sirven la landing de marca o el panel).
const RESERVED = new Set(["www", "app", "api", ""]);

// Rutas del panel autenticado (sirven en el host `app.`). Sin sesión → /login.
const PROTECTED_PREFIXES = [
  "/admin",
  "/platform",
  "/select-gym",
  "/dashboard",
  // Área de socio (web)
  "/home",
  "/planes",
  "/progreso",
  "/sesion-active",
];
// Rutas de autenticación. Con sesión → resolver post-login.
const AUTH_PREFIXES = ["/login", "/verify"];

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

// ¿El host es el subdominio del panel (app.)?
function isAppHost(host: string): boolean {
  const hostname = host.split(":")[0];
  return hostname === `app.${ROOT_DOMAIN}` || hostname === "app.localhost";
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Copia las cookies de sesión (refrescadas por updateSession) a otra respuesta
// (rewrite/redirect) para no perder el token actualizado.
function carryCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function middleware(req: NextRequest) {
  // 1. Refresca la sesión de Supabase para todo request (cookies actualizadas).
  const { response, user } = await updateSession(req);

  const host = req.headers.get("host") ?? "";
  const slug = getSubdomain(host);

  // 2. Subdominio de gym → reescribe a la ruta interna /s/[slug]. La URL del
  //    navegador no cambia. Se preservan las cookies de sesión.
  if (slug) {
    const url = req.nextUrl.clone();
    url.pathname = `/s/${slug}${url.pathname === "/" ? "" : url.pathname}`;
    return carryCookies(response, NextResponse.rewrite(url));
  }

  // 3. Apex / app. / www → gating de auth por prefijo de path.
  const { pathname } = req.nextUrl;
  const isProtected = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isAuthPath = matchesPrefix(pathname, AUTH_PREFIXES);

  // Ruta protegida sin sesión → al login (con destino de retorno).
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return carryCookies(response, NextResponse.redirect(url));
  }

  // Ya logueado entrando a login/verify → resolver post-login.
  if (isAuthPath && user) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return carryCookies(response, NextResponse.redirect(url));
  }

  // En el host del panel, la raíz no sirve la landing de marketing.
  if (isAppHost(host) && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return carryCookies(response, NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  // Excluye assets y rutas internas; deja pasar páginas.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
