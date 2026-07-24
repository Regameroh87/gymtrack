// POST /api/saas/subscription/cancel
// Baja de la suscripción SaaS pedida por el owner desde /admin/suscripcion.
//
// Cancela el preapproval en MercadoPago (no se cobra nunca más) pero NO corta el
// acceso: congela access_until con el fin del período ya pagado y deja el status
// como está. El gate is_saas_subscription_active corta solo, y el cron
// finalize-canceled-subscriptions pasa el status a 'canceled' después.
//
// Va como API route de Next (y no como edge function) porque MP_ACCESS_TOKEN
// vive en Vercel, igual que el checkout.
//
// Variables de entorno requeridas (server-side):
//   MP_ACCESS_TOKEN           – mismo token con el que se creó el preapproval
//   SUPABASE_SERVICE_ROLE_KEY – para escribir en gym_saas_subscriptions sin RLS

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";
import { SUPABASE_URL } from "@/lib/supabase-config";
import { isCancelReason } from "@/lib/saas/cancel-reasons";

const MP_API = "https://api.mercadopago.com";

// Estados desde los que tiene sentido darse de baja. 'pending' queda afuera
// (nunca activó nada) y 'canceled'/'expired' ya no cobran.
const CANCELABLE = ["trialing", "active", "past_due"];

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  return createClient(SUPABASE_URL!, key, { auth: { persistSession: false } });
}

const esFuturo = (iso: string | null | undefined) =>
  !!iso && new Date(iso) > new Date();

export async function POST(req: Request) {
  try {
    const { gym_id, reason, feedback } = await req.json();
    if (!gym_id) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }

    // Verificar sesión y que el usuario sea owner del gym
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("gym_id", gym_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("role", "owner")
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const svcClient = getServiceClient();

    const { data: sub } = await svcClient
      .from("gym_saas_subscriptions")
      .select(
        "id, status, mp_preapproval_id, trial_ends_at, current_period_end, cancel_at_period_end",
      )
      .eq("gym_id", gym_id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json(
        { error: "Este gimnasio no tiene una suscripción para dar de baja." },
        { status: 404 },
      );
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json(
        { error: "La baja ya está programada." },
        { status: 409 },
      );
    }

    if (!CANCELABLE.includes(sub.status)) {
      return NextResponse.json(
        { error: "La suscripción no está activa, no hay nada que dar de baja." },
        { status: 409 },
      );
    }

    // ── Cancelar en MP ────────────────────────────────────────────────────────
    // Va primero: si falla, no se marca nada. Marcar la baja con el cobro vivo
    // sería lo peor de los dos mundos (el owner cree que se dio de baja y le
    // sigue llegando la factura).
    if (sub.mp_preapproval_id) {
      const mpToken = process.env.MP_ACCESS_TOKEN;
      if (!mpToken) {
        return NextResponse.json(
          { error: "MP_ACCESS_TOKEN no configurado" },
          { status: 500 },
        );
      }

      const mpRes = await fetch(
        `${MP_API}/preapproval/${sub.mp_preapproval_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${mpToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        },
      );

      if (!mpRes.ok) {
        const detail = await mpRes.text();
        // 4xx = el preapproval no existe o ya estaba cancelado: el objetivo
        // (que no se cobre más) ya se cumplió, así que se sigue. 5xx = MP caído,
        // ahí sí se aborta para no dejar la baja marcada con el cobro activo.
        if (mpRes.status >= 500) {
          console.error("[saas/cancel] MP no disponible:", detail);
          return NextResponse.json(
            {
              error:
                "MercadoPago no está respondiendo. Probá de nuevo en unos minutos.",
            },
            { status: 502 },
          );
        }
        console.warn(
          `[saas/cancel] preapproval ${sub.mp_preapproval_id} devolvió ${mpRes.status}; se continúa: ${detail}`,
        );
      }
    }

    // ── Congelar hasta cuándo tiene acceso ────────────────────────────────────
    // active   → hasta el fin del período que ya pagó
    // trialing → hasta el fin del trial (no pagó nada, se respeta entero)
    // past_due → el período vigente si todavía corre; si no, corte inmediato
    let accessUntil: string;
    if (sub.status === "trialing") {
      accessUntil = esFuturo(sub.trial_ends_at)
        ? sub.trial_ends_at!
        : new Date().toISOString();
    } else {
      accessUntil = esFuturo(sub.current_period_end)
        ? sub.current_period_end!
        : new Date().toISOString();
    }

    const now = new Date().toISOString();

    const { error: updateError } = await svcClient
      .from("gym_saas_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancel_requested_at: now,
        cancel_reason: isCancelReason(reason) ? reason : null,
        cancel_feedback:
          typeof feedback === "string" && feedback.trim()
            ? feedback.trim().slice(0, 1000)
            : null,
        access_until: accessUntil,
      })
      .eq("id", sub.id);

    if (updateError) {
      console.error("[saas/cancel] Error al guardar la baja:", updateError);
      return NextResponse.json(
        { error: "No se pudo registrar la baja." },
        { status: 500 },
      );
    }

    // Auditoría. mp_event_id es unique: se prefija para no chocar con los ids de
    // eventos de MP que guarda el webhook.
    await svcClient.from("saas_subscription_events").insert({
      gym_subscription_id: sub.id,
      mp_event_id: `cancel_request_${sub.id}_${Date.now()}`,
      event_type: "cancel_requested",
      payload: {
        requested_by: user.id,
        previous_status: sub.status,
        access_until: accessUntil,
        reason: isCancelReason(reason) ? reason : null,
        feedback: typeof feedback === "string" ? feedback.slice(0, 1000) : null,
      },
    });

    return NextResponse.json({ access_until: accessUntil });
  } catch (err: unknown) {
    console.error("[saas/cancel] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
