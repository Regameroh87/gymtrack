import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Evento de Resend → status que guardamos en email_log.
const EVENT_STATUS: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("Falta RESEND_WEBHOOK_SECRET");
    }

    // Webhook externo (Resend firma con Svix) → verificar firma sobre el body crudo.
    const payload = await req.text();
    const headers = {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    };

    let event: { type?: string; data?: { email_id?: string } };
    try {
      event = new Webhook(webhookSecret).verify(payload, headers) as typeof event;
    } catch (err) {
      console.warn("[resend-webhook] Firma inválida:", (err as Error).message);
      return new Response(JSON.stringify({ error: "Firma inválida" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const status = event.type ? EVENT_STATUS[event.type] : undefined;
    const resendId = event.data?.email_id;

    if (status && resendId) {
      const { error } = await supabaseAdmin
        .from("email_log")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("resend_id", resendId);
      if (error) {
        console.error("[resend-webhook] Error actualizando email_log:", error.message);
      } else {
        console.log(`[resend-webhook] ${resendId} → ${status}`);
      }
    }

    // 200 siempre que la firma sea válida; Resend reintenta ante no-2xx.
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[resend-webhook] Error crítico:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
