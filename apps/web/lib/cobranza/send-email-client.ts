// Server-side only: invoca la edge function send-email con el secreto interno.
//
// Es la ÚNICA forma correcta de hablar con send-email desde el panel: el canal
// es server-to-server (verify_jwt off + x-internal-secret), así que esto NUNCA
// se importa desde un componente de cliente. Lo usan las dos rutas de
// /api/cobranza (preview y test) — el envío real de cada recordatorio lo hace
// el job cobranza-recordatorios, no el panel.

import { SUPABASE_URL } from "@/lib/supabase-config";

export interface SendEmailPayload {
  gym_id: string;
  to?: string;
  type: string;
  subject?: string;
  preview?: boolean;
  reply_to?: string | null;
  data?: Record<string, unknown>;
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  body: {
    subject?: string;
    html?: string;
    error?: string;
    id?: string | null;
    log_id?: string | null;
  };
}

export async function invokeSendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const internalSecret = process.env.INTERNAL_FUNCTION_SECRET;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurado");
  if (!internalSecret) throw new Error("INTERNAL_FUNCTION_SECRET no configurado");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
