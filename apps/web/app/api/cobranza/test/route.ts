// POST /api/cobranza/test  { gym_id, subject, heading, body_text, cta_label, show_payment_button }
//
// Manda el recordatorio de prueba al mail de quien está logueado, con los
// mismos datos de ejemplo que el preview (no hay un socio real detrás). Mismo
// guard que /api/cobranza/preview; a diferencia de ese, este SÍ pasa por
// Resend y queda en email_log — es un envío real, solo que a quien lo pidió.

import { NextResponse } from "next/server";

import { requireGymAdmin } from "@/lib/cobranza/authz";
import { invokeSendEmail } from "@/lib/cobranza/send-email-client";
import { DUNNING_SAMPLE_VARS, resolveDunningVars } from "@/lib/dunning-defaults";
import { getServiceClient } from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

interface TestBody {
  gym_id?: string;
  subject?: string;
  heading?: string;
  body_text?: string;
  cta_label?: string;
  show_payment_button?: boolean;
}

export async function POST(req: Request) {
  try {
    const {
      gym_id: gymId,
      subject,
      heading,
      body_text: bodyText,
      cta_label: ctaLabel,
      show_payment_button: showPaymentButton,
    } = (await req.json()) as TestBody;

    if (!gymId) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }

    const auth = await requireGymAdmin(gymId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.ctx.email) {
      return NextResponse.json({ error: "Tu cuenta no tiene un email asociado" }, { status: 400 });
    }

    const { data: gym } = await getServiceClient()
      .from("gyms")
      .select("name")
      .eq("id", gymId)
      .maybeSingle();

    const vars: Record<string, string> = {
      ...DUNNING_SAMPLE_VARS,
      gimnasio: gym?.name ?? DUNNING_SAMPLE_VARS.gimnasio,
    };

    const result = await invokeSendEmail({
      gym_id: gymId,
      to: auth.ctx.email,
      type: "dunning_reminder",
      subject: `[PRUEBA] ${resolveDunningVars(subject ?? "", vars)}`,
      data: {
        heading: resolveDunningVars(heading ?? "", vars),
        body: resolveDunningVars(bodyText ?? "", vars),
        ctaLabel: resolveDunningVars(ctaLabel || "Pagar mi cuota", vars),
        // Sin link, y no clickeable: la prueba no crea un cobro real (no hay un
        // socio detrás), solo confirma si el mail queda con o sin botón. Antes
        // iba con href="#", que según el cliente de correo terminaba llevando
        // al login — parecía un bug cuando en realidad no había ningún checkout
        // detrás.
        //
        // Un checkout real acá es imposible, no solo indeseable:
        // member_payment_intent_items tiene FK contra activity_subscriptions,
        // y la prueba usa datos de ejemplo sin ninguna cuota detrás. El link
        // verdadero lo genera el job, por socio, contra su deuda real.
        payUrl: null,
        ctaInert: showPaymentButton,
        items: [{ label: "Musculación · julio 2026", amount: vars.monto }],
        total: vars.monto,
        dueDate: vars.vencimiento,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.body.error ?? "No se pudo enviar el mail de prueba" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, to: auth.ctx.email });
  } catch (err: unknown) {
    console.error("[cobranza/test] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
