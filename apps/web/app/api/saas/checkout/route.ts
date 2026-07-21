// POST /api/saas/checkout
// Crea un preapproval de MercadoPago (status=pending) para el gym del owner
// y devuelve el init_point (URL de checkout de MP).
//
// Variables de entorno requeridas (server-side):
//   MP_ACCESS_TOKEN          – access token de la app MP de GymTrack
//   SUPABASE_SERVICE_ROLE_KEY – para escribir en gym_saas_subscriptions sin RLS

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";
import { SUPABASE_URL } from "@/lib/supabase-config";

const MP_API = "https://api.mercadopago.com";

// Cliente con service role para escribir en gym_saas_subscriptions (bypass RLS).
function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  return createClient(SUPABASE_URL!, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        { error: "MP_ACCESS_TOKEN no configurado" },
        { status: 500 },
      );
    }

    const { gym_id } = await req.json();
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
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Datos del gym y del plan activo
    const { data: gym } = await supabase
      .from("gyms")
      .select("name")
      .eq("id", gym_id)
      .single();

    const { data: plan } = await supabase
      .from("saas_plans")
      .select("id, price, currency, trial_days")
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!plan?.price) {
      return NextResponse.json(
        { error: "El precio del plan no está configurado. Actualizá saas_plans.price." },
        { status: 422 },
      );
    }

    // Fecha de inicio del primer cobro = hoy + trial_days
    const trialDays = plan.trial_days ?? 14;
    const startDate = new Date(
      Date.now() + trialDays * 86_400_000,
    ).toISOString();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://gymtrack.app";
    const backUrl = `${appUrl}/api/saas/checkout/callback`;

    // Crear preapproval en MP (status=pending → MP devuelve init_point)
    const mpRes = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `GymTrack Pro${gym?.name ? ` - ${gym.name}` : ""}`,
        external_reference: gym_id,
        payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          start_date: startDate,
          transaction_amount: plan.price,
          currency_id: plan.currency ?? "ARS",
        },
        back_url: backUrl,
        status: "pending",
      }),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error("[saas/checkout] Error MP:", err);
      return NextResponse.json(
        { error: "Error al crear la suscripción en MercadoPago" },
        { status: 502 },
      );
    }

    const mpData = await mpRes.json();
    const { id: mpPreapprovalId, init_point } = mpData;

    if (!init_point) {
      return NextResponse.json(
        { error: "MP no devolvió init_point" },
        { status: 502 },
      );
    }

    // Guardar el mp_preapproval_id en la suscripción del gym
    const svcClient = getServiceClient();
    await svcClient
      .from("gym_saas_subscriptions")
      .upsert(
        {
          gym_id,
          plan_id: plan.id,
          status: "pending",
          mp_preapproval_id: mpPreapprovalId,
          payer_email: user.email,
        },
        { onConflict: "gym_id" },
      );

    return NextResponse.json({ init_point });
  } catch (err: unknown) {
    console.error("[saas/checkout] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
