import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    // Canal solo server-side: verify_jwt está off, así que protegemos con un
    // secreto interno compartido entre edge functions.
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
      return jsonResponse({ error: "No autorizado." }, 401);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("Falta RESEND_API_KEY");
    }

    const body = await req.json();
    const { gym_id, to, type, subject, html } = body as {
      gym_id?: string | null;
      to?: string;
      type?: string;
      subject?: string;
      html?: string;
    };

    if (!to || !type || !subject || !html) {
      return jsonResponse({ error: "to, type, subject y html son requeridos." }, 400);
    }

    // Resolver el display name del `from` con el nombre del gym (branding por gym).
    let senderName = "GymTrack";
    if (gym_id) {
      const { data: gym } = await supabaseAdmin
        .from("gyms")
        .select("name")
        .eq("id", gym_id)
        .maybeSingle();
      if (gym?.name) senderName = gym.name;
    }
    const from = `${senderName} <${FROM_LOCAL}@${FROM_DOMAIN}>`;

    // Enviar vía API de Resend.
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
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
    return jsonResponse({ error: message }, 400);
  }
});
