// GET /api/gym-mp/callback?code=...&state=...
//
// Vuelta del OAuth de MercadoPago. Canjea el `code` por el par de tokens del
// vendedor y los guarda en Vault.
//
// Conectar NO prende los cobros: deja la cuenta lista y el owner decide después
// desde /admin/cobros. Son dos estados separados a propósito (ver la migración
// 20260726120000), y arrancar prendido le sacaría al dueño la posibilidad de
// conectar y revisar antes de abrirle el pago a los socios.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { APP_URL } from "@/lib/site";
import { requireGymOwner } from "@/lib/gym-mp/authz";
import {
  exchangeCodeForTokens,
  getServiceClient,
  OAUTH_STATE_COOKIE,
  storeCredentials,
} from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

/** Vuelve al panel con un motivo legible en la query. */
function backToPanel(status: "conectado" | string, gymId?: string) {
  const url = new URL(`${APP_URL}/admin/cobros`);
  url.searchParams.set("mp", status);
  if (gymId) url.searchParams.set("gym", gymId);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const code = params.get("code");
    const state = params.get("state");

    // MP avisa acá cuando el owner cancela la pantalla de autorización.
    if (params.get("error")) {
      return backToPanel("cancelado");
    }

    const cookieState = (await cookies()).get(OAUTH_STATE_COOKIE)?.value;

    // El state tiene que existir en la URL Y en la cookie, y ser el mismo. Sin
    // esta comparación el callback acepta cualquier code que le tiren.
    if (!code || !state || !cookieState || state !== cookieState) {
      console.warn("[gym-mp/callback] state inválido o ausente");
      return backToPanel("state_invalido");
    }

    const gymId = state.split(".").slice(1).join(".");
    if (!gymId) {
      return backToPanel("state_invalido");
    }

    // Se re-valida el owner: la cookie prueba que este navegador arrancó el
    // flujo, no que quien vuelve siga teniendo permiso sobre el gym. Entre el
    // connect y la vuelta pudieron sacarle el rol, o pudo cambiar de sesión.
    const auth = await requireGymOwner(gymId);
    if (!auth.ok) {
      return backToPanel("sin_permiso", gymId);
    }

    const tokens = await exchangeCodeForTokens(code);
    await storeCredentials(getServiceClient(), gymId, tokens, auth.ctx.profileId);

    console.log(
      `[gym-mp/callback] gym ${gymId} conectó la cuenta MP ${tokens.mpUserId} (live_mode=${tokens.liveMode})`,
    );

    // La cookie se quema apenas se usa: un code ya canjeado no sirve, pero el
    // state todavía vivo sí serviría para colar un canje distinto.
    const res = backToPanel("conectado", gymId);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/gym-mp", maxAge: 0 });
    return res;
  } catch (err: unknown) {
    // El detalle va al log del servidor y no a la URL: los errores de
    // /oauth/token pueden traer material sensible de la app.
    console.error("[gym-mp/callback] Error interno:", err);
    return backToPanel("error");
  }
}
