import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderEmail } from "./templates.ts";

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
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.gymtrack.ar";

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
    const { gym_id, to, type, data, subject: subjectOverride } = body as {
      gym_id?: string | null;
      to?: string;
      type?: string;
      data?: { name?: string | null };
      subject?: string;
    };
    toEmail = to;
    emailType = type;
    gymId = gym_id;

    if (!to || !type) {
      return jsonResponse({ error: "to y type son requeridos." }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      const errMsg = "Falta RESEND_API_KEY";
      console.error("[send-email]", errMsg);
      await supabaseAdmin.from("email_log").insert({
        gym_id: gym_id ?? null,
        to_email: to,
        type,
        status: "failed",
        error: errMsg,
      });
      return jsonResponse({ error: errMsg }, 500);
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
    const from = `${gymName} <${FROM_LOCAL}@${FROM_DOMAIN}>`;

    // Enviar vía API de Resend.
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html: rendered.html }),
    });
    const resendResult = await resendRes.json();

    if (!resendRes.ok) {
      const errMsg = resendResult?.message ?? `Resend respondió ${resendRes.status}`;
      console.error("[send-email] Error de Resend:", errMsg);
      await supabaseAdmin.from("email_log").insert({
        gym_id: gym_id ?? null,
        to_email: to,
        type,
        subject,
        status: "failed",
        error: String(errMsg),
      });
      return jsonResponse({ error: errMsg }, 502);
    }

    const resendId: string | null = resendResult?.id ?? null;
    const { error: logError } = await supabaseAdmin.from("email_log").insert({
      gym_id: gym_id ?? null,
      to_email: to,
      type,
      subject,
      resend_id: resendId,
      status: "sent",
    });
    if (logError) {
      // El mail ya salió: no fallamos la request por un error de log, solo avisamos.
      console.warn("[send-email] Mail enviado pero falló el log:", logError.message);
    }

    return jsonResponse({ id: resendId }, 200);
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
