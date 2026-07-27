// GET /api/cron/refresh-mp-tokens
//
// Renueva los access tokens de OAuth de los gyms antes de que venzan.
//
// Por qué es parte del MVP y no un extra: un token vencido no avisa. El gym
// sigue con los cobros "habilitados" en el panel, la app le sigue mostrando el
// botón de pagar al socio, y recién se entera alguien cuando un pago falla. A
// diferencia del token de la plataforma —que es uno solo y está en env— acá hay
// uno por gimnasio y caducan en fechas distintas: sin barrido no hay forma de
// saber cuál está por vencer.
//
// El margen es amplio a propósito (30 días sobre los ~180 que dura un token de
// MP): así una corrida que falle tiene decenas de oportunidades de recuperarse
// antes de que el token muera de verdad.
//
// Va como Vercel Cron (apps/web/vercel.json).
//
// Variables de entorno requeridas (server-side):
//   MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET – para hablar con /oauth/token
//   SUPABASE_SERVICE_ROLE_KEY                   – Vault solo acepta service_role
//   CRON_SECRET                                 – lo manda Vercel Cron como Bearer.
//                                                 Sin la variable solo se dispara
//                                                 con sesión de super_admin.

import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import {
  getCredentials,
  getServiceClient,
  MpOAuthError,
  refreshTokens,
  revokeCredentials,
  storeCredentials,
} from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RENEW_WINDOW_MS = 30 * 86_400_000;

/** Mismo criterio que /api/cron/saas-reap-preapprovals. */
async function isAuthorized(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${secret}`) return true;
  }

  const ctx = await getSessionContext();
  return canAccessPlatformModule(ctx.platformRole, "billing");
}

export async function GET(req: Request) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const svc = getServiceClient();
    const deadline = new Date(Date.now() + RENEW_WINDOW_MS).toISOString();

    // Se leen también los que ya tienen expires_at en null: son filas viejas o
    // respuestas de MP sin expires_in, y no renovarlas nunca es peor que
    // renovarlas de más.
    const { data: accounts, error } = await svc
      .from("gym_mp_accounts")
      .select("gym_id, expires_at")
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.lt.${deadline}`);

    if (error) throw error;

    const renewed: string[] = [];
    const revoked: string[] = [];
    const failed: Array<{ gym_id: string; reason: string }> = [];

    for (const account of accounts ?? []) {
      const gymId = account.gym_id as string;

      try {
        const creds = await getCredentials(svc, gymId);

        // Sin refresh token no hay nada que hacer automáticamente: la conexión
        // se hizo antes de que guardáramos el refresh, o MP no lo devolvió. El
        // owner va a tener que reconectar cuando venza.
        if (!creds?.refreshToken) {
          failed.push({ gym_id: gymId, reason: "sin refresh token" });
          continue;
        }

        const tokens = await refreshTokens(creds.refreshToken);
        await storeCredentials(svc, gymId, tokens, null);
        renewed.push(gymId);
      } catch (err: unknown) {
        // Un 4xx sobre el refresh token es definitivo: el owner revocó el
        // permiso desde MercadoPago, o el token ya se usó y expiró. Se
        // desconecta localmente para que el panel diga la verdad y —vía el
        // cascade de gym_mp_revoke— los cobros queden apagados en vez de
        // fallarle al socio en la cara.
        //
        // Un 5xx o un fallo de red NO se toca: MP puede estar caído y
        // desconectar a todos los gyms por eso sería el peor resultado posible.
        if (err instanceof MpOAuthError && err.isPermanent) {
          await revokeCredentials(svc, gymId);
          revoked.push(gymId);
          console.error(
            `[cron/refresh-mp-tokens] gym ${gymId}: refresh token rechazado (${err.status}); cuenta desconectada, el owner tiene que reconectar`,
          );
          continue;
        }

        const reason = err instanceof Error ? err.message : String(err);
        failed.push({ gym_id: gymId, reason });
        console.error(`[cron/refresh-mp-tokens] gym ${gymId}: ${reason}`);
      }
    }

    console.log(
      `[cron/refresh-mp-tokens] ${accounts?.length ?? 0} cuenta(s) revisada(s), ${renewed.length} renovada(s), ${revoked.length} desconectada(s), ${failed.length} con error`,
    );

    return NextResponse.json({
      reviewed: accounts?.length ?? 0,
      renewed: renewed.length,
      revoked,
      failed,
    });
  } catch (err: unknown) {
    console.error("[cron/refresh-mp-tokens] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
