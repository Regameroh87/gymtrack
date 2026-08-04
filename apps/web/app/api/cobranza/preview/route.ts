// POST /api/cobranza/preview  { gym_id, subject, heading, body_text, cta_label, show_payment_button }
//
// Renderiza el mail de un recordatorio con datos de ejemplo, para el canvas de
// /admin/cobranza. Llama a send-email con preview:true — el MISMO render que
// usa el envío real, para que el preview sea el mail de verdad y no una
// segunda implementación que se desincroniza (logo/colores del gym incluidos).
//
// Recibe los campos del formulario TAL COMO ESTÁN en el canvas (no el step
// guardado): así el preview cambia mientras el owner tipea, antes de guardar.

import { NextResponse } from "next/server";

import { requireGymAdmin } from "@/lib/cobranza/authz";
import { invokeSendEmail } from "@/lib/cobranza/send-email-client";
import { DUNNING_SAMPLE_VARS, resolveDunningVars } from "@/lib/dunning-defaults";
import { getServiceClient } from "@/lib/gym-mp/credentials";

export const dynamic = "force-dynamic";

interface PreviewBody {
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
    } = (await req.json()) as PreviewBody;

    if (!gymId) {
      return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });
    }

    const auth = await requireGymAdmin(gymId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      type: "dunning_reminder",
      preview: true,
      subject: resolveDunningVars(subject ?? "", vars),
      data: {
        heading: resolveDunningVars(heading ?? "", vars),
        body: resolveDunningVars(bodyText ?? "", vars),
        ctaLabel: resolveDunningVars(ctaLabel || "Pagar mi cuota", vars),
        // Sin link, y no clickeable: el preview no crea ningún cobro real, solo
        // muestra si el botón queda o no según el toggle "Incluir botón de
        // pago". Antes iba con href="#", que según el cliente terminaba
        // llevando al login — parecía un bug cuando en realidad no había
        // ningún checkout detrás.
        //
        // Un checkout real acá es imposible, no solo indeseable:
        // member_payment_intent_items tiene FK contra activity_subscriptions,
        // y la vista previa usa datos de ejemplo sin ninguna cuota detrás.
        payUrl: null,
        ctaInert: showPaymentButton,
        items: [{ label: "Musculación · julio 2026", amount: vars.monto }],
        total: vars.monto,
        dueDate: vars.vencimiento,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.body.error ?? "No se pudo generar la vista previa" },
        { status: 502 },
      );
    }

    return NextResponse.json({ subject: result.body.subject, html: result.body.html });
  } catch (err: unknown) {
    console.error("[cobranza/preview] Error interno:", err);
    // Un error de configuración se devuelve tal cual: nombra una variable de
    // entorno que falta (nunca su valor), la ruta ya está detrás de
    // requireGymAdmin, y es la diferencia entre que el owner lea "Error
    // interno" y que sepa exactamente qué le falta cargar. El resto sigue
    // saliendo genérico.
    const message = err instanceof Error ? err.message : "";
    if (message.endsWith("no configurado")) {
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
