import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail, type EmailContext } from "./templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const FROM_DOMAIN = "mail.gymtrack.ar";
const FROM_LOCAL = "noreply";

// Tokens del design system (fallback cuando el gym no tiene theme propio).
const DEFAULT_PRIMARY = "#4A44E4";
const DEFAULT_ACCENT = "#2DD4BF";
// app.gymtrack.ar NO existe (sin DNS); la app vive en www.gymtrack.ar. Con el
// default viejo, los links de todos los mails transaccionales apuntaban a un
// dominio muerto.
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.gymtrack.ar";

// logo_url guarda la URL pública completa (Supabase Storage); solo es imagen
// servible si es una URL http(s). Si no, null → fallback a wordmark.
function getLogoUrl(uri: string | null): string | null {
  if (!uri) return null;
  return uri.startsWith("http://") || uri.startsWith("https://") ? uri : null;
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Hoisted para poder dejar una fila 'failed' en email_log desde el catch
  // ante un fallo inesperado (sino el error quedaría solo en los logs).
  let toEmail: string | undefined;
  let emailType: string | undefined;
  let gymId: string | null | undefined;

  try {
    // Canal solo server-side: verify_jwt está off, así que protegemos con un
    // secreto interno compartido entre edge functions.
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
      return jsonResponse({ error: "No autorizado." }, 401);
    }

    // Parseamos el body antes de validar RESEND_API_KEY: así, si el secret
    // falta, podemos dejar una fila 'failed' en email_log con to/type/gym_id
    // (en vez de un error invisible).
    const body = await req.json();
    const { gym_id, to, type, data, subject: subjectOverride, preview, reply_to } = body as {
      gym_id?: string | null;
      to?: string;
      type?: string;
      data?: EmailContext["data"];
      subject?: string;
      /** true = renderiza y devuelve { subject, html } sin mandar nada ni loguear. */
      preview?: boolean;
      /** Opcional. Hoy solo lo manda cobranza-recordatorios (gym_dunning_settings.reply_to). */
      reply_to?: string | null;
    };
    toEmail = to;
    emailType = type;
    gymId = gym_id;

    // En preview no hace falta destinatario: es el canvas de /admin/cobranza
    // pidiendo "mostrame el HTML", no un envío real.
    if (!type || (!preview && !to)) {
      return jsonResponse({ error: "to y type son requeridos." }, 400);
    }

    // Branding del gym: nombre + seeds de theme + logo. Sin gym (plataforma) o sin
    // theme propio → tokens default del design system.
    let gymName = "GymTrack";
    let primary = DEFAULT_PRIMARY;
    let accent = DEFAULT_ACCENT;
    let logoUrl: string | null = null;
    if (gym_id) {
      const { data: gym } = await supabaseAdmin
        .from("gyms")
        .select("name, theme_primary, theme_accent, logo_url")
        .eq("id", gym_id)
        .maybeSingle();
      if (gym?.name) gymName = gym.name;
      if (gym?.theme_primary) primary = gym.theme_primary;
      if (gym?.theme_accent) accent = gym.theme_accent;
      logoUrl = getLogoUrl(gym?.logo_url ?? null);
    }

    const rendered = renderEmail(type, { gymName, primary, accent, logoUrl, appUrl: APP_URL, data });
    if (!rendered) {
      return jsonResponse({ error: `Tipo de mail desconocido: ${type}` }, 400);
    }
    const subject = subjectOverride ?? rendered.subject;

    // El preview es el mail de verdad, no una segunda implementación: mismo
    // renderEmail() de arriba, solo que acá se corta antes de Resend y de
    // email_log. Así el canvas del panel siempre muestra el HTML real
    // (logo/colores del gym incluidos) y no puede desincronizarse del que
    // efectivamente sale.
    if (preview) {
      return jsonResponse({ subject, html: rendered.html }, 200);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      const errMsg = "Falta RESEND_API_KEY";
      console.error("[send-email]", errMsg);
      const { data: logRow } = await supabaseAdmin.from("email_log").insert({
        gym_id: gym_id ?? null,
        to_email: to,
        type,
        status: "failed",
        error: errMsg,
      }).select("id").single();
      return jsonResponse({ error: errMsg, log_id: logRow?.id ?? null }, 500);
    }

    const from = `${gymName} <${FROM_LOCAL}@${FROM_DOMAIN}>`;

    // Enviar vía API de Resend.
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html: rendered.html, reply_to: reply_to || undefined }),
    });
    const resendResult = await resendRes.json();

    if (!resendRes.ok) {
      const errMsg = resendResult?.message ?? `Resend respondió ${resendRes.status}`;
      console.error("[send-email] Error de Resend:", errMsg);
      const { data: logRow } = await supabaseAdmin.from("email_log").insert({
        gym_id: gym_id ?? null,
        to_email: to,
        type,
        subject,
        status: "failed",
        error: String(errMsg),
      }).select("id").single();
      return jsonResponse({ error: errMsg, log_id: logRow?.id ?? null }, 502);
    }

    const resendId: string | null = resendResult?.id ?? null;
    // El id de la fila de email_log (no solo resend_id, que puede faltar) va
    // en la respuesta para que un caller server-side pueda referenciar el mail
    // concreto que salió, sin depender de buscarlo por gym_id/to_email/type.
    const { data: logRow, error: logError } = await supabaseAdmin.from("email_log").insert({
      gym_id: gym_id ?? null,
      to_email: to,
      type,
      subject,
      resend_id: resendId,
      status: "sent",
    }).select("id").single();
    if (logError) {
      // El mail ya salió: no fallamos la request por un error de log, solo avisamos.
      console.warn("[send-email] Mail enviado pero falló el log:", logError.message);
    }

    return jsonResponse({ id: resendId, log_id: logRow?.id ?? null }, 200);
  } catch (error) {
    const message = (error as Error)?.message ?? "Error interno del servidor";
    console.error("[send-email] Error crítico:", message);
    // Best-effort: si ya conocíamos destinatario y tipo, dejamos rastro del fallo.
    if (toEmail && emailType) {
      await supabaseAdmin.from("email_log").insert({
        gym_id: gymId ?? null,
        to_email: toEmail,
        type: emailType,
        status: "failed",
        error: String(message).slice(0, 500),
      }).then(({ error: logErr }) => {
        if (logErr) console.warn("[send-email] Falló también el log del error:", logErr.message);
      });
    }
    return jsonResponse({ error: message }, 400);
  }
});
