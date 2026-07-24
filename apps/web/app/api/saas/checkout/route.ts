// POST /api/saas/checkout
// Crea un preapproval de MercadoPago (status=pending) para el gym del owner
// y devuelve el init_point (URL de checkout de MP).
//
// Variables de entorno requeridas (server-side):
//   MP_ACCESS_TOKEN          – access token de la app MP cobradora. En local y en
//                              previews se carga el del vendedor de PRUEBA; en
//                              Vercel producción, el productivo. Es la misma
//                              variable con distinto valor por entorno.
//   SUPABASE_SERVICE_ROLE_KEY – para escribir en gym_saas_subscriptions sin RLS
// Solo pruebas (requiere MP_ACCESS_TOKEN de un vendedor de prueba):
//   MP_TEST_PAYER_EMAIL      – email del comprador de prueba de MP; reemplaza al
//                              del owner como payer_email. Se ignora en el
//                              entorno de producción.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";
import { SUPABASE_URL } from "@/lib/supabase-config";
import { APP_URL } from "@/lib/site";

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
      .eq("role", "owner")
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

    const svcClient = getServiceClient();

    const { data: existingSub } = await svcClient
      .from("gym_saas_subscriptions")
      .select("id, status, trial_ends_at, cancel_at_period_end, access_until")
      .eq("gym_id", gym_id)
      .maybeSingle();

    // Fecha del primer cobro:
    //  - baja programada con acceso vigente ("reanudar"): el cobro arranca donde
    //    termina el período ya pagado. Sin esta rama, un gym 'active' que se dio
    //    de baja caería en el else y se llevaría un trial completo de regalo.
    //  - trialing con trial vigente (self-service sin tarjeta): respeta el trial
    //    restante — el webhook al autorizar setea trial_ends_at = start_date,
    //    que así coincide y no resetea el trial.
    //  - expired/canceled/past_due: cobro inmediato; un trial nuevo acá sería
    //    el vector de trial infinito re-suscribiendo el mismo gym.
    //  - pending (alta de plataforma, sin trial corrido): trial completo.
    const trialDays = plan.trial_days ?? 14;
    let startDate: string;
    if (
      existingSub?.cancel_at_period_end &&
      existingSub.access_until &&
      new Date(existingSub.access_until) > new Date()
    ) {
      startDate = existingSub.access_until;
    } else if (
      existingSub?.status === "trialing" &&
      existingSub.trial_ends_at &&
      new Date(existingSub.trial_ends_at) > new Date()
    ) {
      startDate = existingSub.trial_ends_at;
    } else if (
      existingSub &&
      ["expired", "canceled", "past_due"].includes(existingSub.status)
    ) {
      startDate = new Date(Date.now() + 10 * 60_000).toISOString();
    } else {
      startDate = new Date(Date.now() + trialDays * 86_400_000).toISOString();
    }

    // APP_URL (lib/site) resuelve NEXT_PUBLIC_APP_URL con el dominio real de la
    // app como default; evita que el back_url caiga a un dominio equivocado.
    const backUrl = `${APP_URL}/api/saas/checkout/callback`;

    // El checkout de preapproval queda atado a payer_email: MP exige que el
    // pagador use ese mismo mail y que ambas partes sean del mismo tipo (real o
    // de prueba). Para probar en sandbox hay que apuntarlo a un comprador de
    // prueba, con MP_ACCESS_TOKEN de un vendedor de prueba.
    //
    // La guarda NO puede ser el prefijo del token: el de un vendedor de prueba
    // empieza con APP_USR-, igual que uno productivo. Se mira el entorno.
    //
    // Vercel pone NODE_ENV="production" en todos sus builds, previews incluidos,
    // así que NODE_ENV solo dejaría afuera a los previews — donde sí queremos
    // poder probar el flujo desplegado. VERCEL_ENV distingue production de
    // preview; en producción real la variable queda inerte pase lo que pase.
    const vercelEnv = process.env.VERCEL_ENV;
    const testPayerEmail = process.env.MP_TEST_PAYER_EMAIL;
    const isProd =
      process.env.NODE_ENV === "production" &&
      (!vercelEnv || vercelEnv === "production");
    if (testPayerEmail && isProd) {
      console.warn(
        "[saas/checkout] MP_TEST_PAYER_EMAIL ignorado: es el entorno de producción",
      );
    }
    const payerEmail = !isProd && testPayerEmail ? testPayerEmail : user.email;

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
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          start_date: startDate,
          transaction_amount: plan.price,
          currency_id: plan.currency ?? "ARS",
        },
        // OJO: /preapproval NO acepta notification_url (MP lo ignora y ni
        // siquiera lo devuelve en el objeto). Los webhooks de suscripciones se
        // configuran por APLICACIÓN en el panel de MP: si cambia la app
        // cobradora, hay que cargar la URL allá o no llega ninguna notificación.
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

    // Guardar el mp_preapproval_id en la suscripción del gym. Si la fila ya
    // existe NO se toca status: pisarlo a 'pending' degradaría a un gym en
    // trialing a read-only (políticas RESTRICTIVE) hasta que llegue el webhook.
    //
    // Tampoco se limpian los campos de baja: acá el preapproval todavía está
    // 'pending' y el owner puede abandonar el checkout. Si se limpiaran ahora,
    // una baja abandonada a mitad de camino dejaría el gym con acceso indefinido
    // (sin access_until, ningún cron lo cierra). Los limpia el webhook al recibir
    // 'authorized', que es cuando la reactivación es real.
    if (existingSub) {
      await svcClient
        .from("gym_saas_subscriptions")
        .update({
          plan_id: plan.id,
          mp_preapproval_id: mpPreapprovalId,
          payer_email: payerEmail,
        })
        .eq("id", existingSub.id);
    } else {
      await svcClient.from("gym_saas_subscriptions").insert({
        gym_id,
        plan_id: plan.id,
        status: "pending",
        mp_preapproval_id: mpPreapprovalId,
        payer_email: payerEmail,
      });
    }

    return NextResponse.json({ init_point });
  } catch (err: unknown) {
    console.error("[saas/checkout] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
