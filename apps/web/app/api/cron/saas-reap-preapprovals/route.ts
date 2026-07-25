// GET /api/cron/saas-reap-preapprovals
//
// Da de baja en MercadoPago los preapprovals 'pending' que quedaron colgados:
// checkouts que el owner arrancó y nunca autorizó.
//
// Por qué existe, y por qué no es un cron de Postgres como los demás: el
// huérfano peligroso no es la fila (esa la expira expire-saas-pending), es el
// preapproval vivo en MP. Si meses después alguien reabre el init_point viejo,
// MP cobra la tarjeta y el webhook DESCARTA el aviso, porque la fila ya guarda
// otro mp_preapproval_id (ver handlePreapprovalEvent) → cobro sin registro.
// Limpiarlo requiere hablar con la API de MP, y el token vive en Vercel.
//
// Los candidatos salen de saas_preapprovals, el registro que escribe el
// checkout, y NO de /preapproval/search: MP ignora external_reference como
// filtro (ver el encabezado de lib/saas/mp-preapprovals).
//
// Va como Vercel Cron (apps/web/vercel.json). Cada entorno barre con SU token, y
// un token solo puede tocar preapprovals de su propia app de MP: el deploy
// productivo nunca cancela los del vendedor de prueba, y el local/preview nunca
// toca los reales (los deja en `skipped`).
//
// Variables de entorno requeridas (server-side):
//   MP_ACCESS_TOKEN           – token de la app cobradora de este entorno
//   SUPABASE_SERVICE_ROLE_KEY – para leer/escribir gym_saas_subscriptions sin RLS
//   CRON_SECRET               – lo manda Vercel Cron como Bearer. Sin la variable
//                               solo se puede disparar con sesión de super_admin.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";
import { SUPABASE_URL } from "@/lib/supabase-config";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { cancelPendingPreapprovals } from "@/lib/saas/mp-preapprovals";

// Estados en los que la suscripción está cobrando (o a punto): su
// mp_preapproval_id es intocable.
const LIVE_STATUSES = ["trialing", "active", "past_due"];

// Margen antes de dar por abandonado el preapproval de una fila que no está
// cobrando. Mismo criterio que el cron expire-saas-pending: un checkout recién
// arrancado está 'pending' con su id fresco y no hay que matarlo.
const STALE_MS = 3 * 86_400_000;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  return createClient(SUPABASE_URL!, key, { auth: { persistSession: false } });
}

/**
 * Vercel Cron manda `Authorization: Bearer $CRON_SECRET`. Se acepta además una
 * sesión de super_admin para poder correrlo a mano desde el panel (y en local,
 * donde no hay CRON_SECRET).
 */
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

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        { error: "MP_ACCESS_TOKEN no configurado" },
        { status: 500 },
      );
    }

    const svcClient = getServiceClient();

    // El barrido arranca del registro, NO de las suscripciones: un gym puede
    // tener preapprovals anotados y ninguna fila en gym_saas_subscriptions (fila
    // borrada a mano, alta que nunca cuajó), y esos son justamente los que nadie
    // más va a limpiar.
    const { data: tracked, error: trackedError } = await svcClient
      .from("saas_preapprovals")
      .select("gym_id")
      .is("canceled_at", null);

    if (trackedError) throw trackedError;

    const gymIds = [...new Set((tracked ?? []).map((r) => r.gym_id as string))];

    // Se revisan TODOS los gyms con preapprovals vivos, no solo los 'pending':
    // un gym que autorizó al tercer intento arrastra los dos anteriores si el
    // aviso de MP que dispara la limpieza del webhook nunca llegó.
    const subByGym = new Map<
      string,
      { id: string; status: string; mp_preapproval_id: string | null; updated_at: string | null }
    >();

    if (gymIds.length) {
      const { data: subs, error: subsError } = await svcClient
        .from("gym_saas_subscriptions")
        .select("id, gym_id, status, mp_preapproval_id, updated_at")
        .in("gym_id", gymIds);

      if (subsError) throw subsError;
      for (const s of subs ?? []) subByGym.set(s.gym_id as string, s);
    }

    const results: Array<{
      gym_id: string;
      canceled: string[];
      skipped: string[];
    }> = [];

    for (const gymId of gymIds) {
      const sub = subByGym.get(gymId);

      // El único preapproval que se preserva es el que la suscripción declara
      // vigente, y solo si hay algo esperándolo: una suscripción cobrando, o un
      // checkout arrancado hace poco. Sin fila, no hay nada que preservar.
      const fresh =
        !!sub?.updated_at && Date.now() - Date.parse(sub.updated_at) < STALE_MS;
      const keepId =
        sub && (LIVE_STATUSES.includes(sub.status) || fresh)
          ? sub.mp_preapproval_id
          : null;

      const { canceled, skipped } = await cancelPendingPreapprovals(
        svcClient,
        gymId,
        keepId,
        mpToken,
      );

      if (!canceled.length) continue;

      results.push({ gym_id: gymId, canceled, skipped });

      // Auditoría. gym_subscription_id es nullable: si el gym no tiene fila, el
      // evento queda igual registrado (mismo criterio que logEvent del webhook).
      // mp_event_id es unique, se prefija para no chocar con los ids de MP.
      await svcClient.from("saas_subscription_events").insert({
        gym_subscription_id: sub?.id ?? null,
        mp_event_id: `reap_${gymId}_${Date.now()}`,
        event_type: "orphan_preapprovals_reaped",
        payload: { status: sub?.status ?? null, kept: keepId, canceled, skipped },
      });
    }

    const totalCanceled = results.reduce((n, r) => n + r.canceled.length, 0);
    console.log(
      `[cron/reap-preapprovals] ${gymIds.length} gym(s) revisado(s), ${totalCanceled} preapproval(s) cancelado(s)`,
    );

    return NextResponse.json({
      reviewed: gymIds.length,
      canceled: totalCanceled,
      results,
    });
  } catch (err: unknown) {
    console.error("[cron/reap-preapprovals] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
