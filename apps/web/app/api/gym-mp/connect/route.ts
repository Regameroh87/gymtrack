// GET /api/gym-mp/connect?gym_id=<uuid>
//
// Manda al dueño del gym a autorizar con su cuenta de MercadoPago. Al volver,
// MP pega en /api/gym-mp/callback con un `code` que se canjea por el token
// delegado con el que después se le cobra a los socios.
//
// ── Protección contra CSRF ──────────────────────────────────────────────────
// El `state` viaja por la URL, así que cualquiera puede fabricar uno. Lo que lo
// hace confiable es que se guarda además en una cookie httpOnly: quien no pasó
// por acá no la tiene, y el callback exige que las dos coincidan. Sin esto,
// alguien puede inducir al owner a completar un OAuth contra una cuenta de MP
// ajena y dejar los cobros del gimnasio apuntando a otro bolsillo.
//
// SameSite=Lax y no Strict: el retorno desde MP es una navegación top-level
// desde otro sitio, y con Strict el navegador no manda la cookie — el callback
// rechazaría todos los intentos legítimos.

import { NextResponse } from "next/server";

import { requireGymOwner } from "@/lib/gym-mp/authz";
import { buildAuthorizationUrl, OAUTH_STATE_COOKIE } from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

const STATE_TTL_SECONDS = 10 * 60;

export async function GET(req: Request) {
  try {
    const gymId = new URL(req.url).searchParams.get("gym_id");
    if (!gymId) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }

    const auth = await requireGymOwner(gymId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // El gym_id va dentro del state porque el callback no lo recibe de otro
    // lado: MP solo devuelve lo que le mandamos. El nonce es lo que impide que
    // alguien arme un state con el gym que quiera.
    const nonce = crypto.randomUUID();
    const state = `${nonce}.${gymId}`;

    const res = NextResponse.redirect(buildAuthorizationUrl(state));
    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/gym-mp",
      maxAge: STATE_TTL_SECONDS,
    });

    return res;
  } catch (err: unknown) {
    console.error("[gym-mp/connect] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
