// Preapprovals de MercadoPago: registro propio y cancelación.
//
// Lo usan el checkout (anota lo que crea y limpia lo que dejó un intento
// anterior) y el reaper agendado (/api/cron/saas-reap-preapprovals).
//
// ── Por qué hay un registro propio ──────────────────────────────────────────
// A MP no se le puede preguntar "qué preapprovals tiene este gym". Verificado
// contra la API el 2026-07-25:
//
//   GET /preapproval/search?external_reference=<gym_id>  → 14 resultados
//   GET /preapproval/search                              → los MISMOS 14
//
// external_reference se ignora como filtro (status sí funciona), y paginar
// tampoco sirve: offset=0 y offset=5 devolvieron ids repetidos entre sí. Así que
// los ids los anotamos nosotros en saas_preapprovals al crearlos, y para saber
// el estado de cada uno se usa GET /preapproval/{id}, que sí es exacto.
//
// ── Qué se puede cancelar ───────────────────────────────────────────────────
// SOLO preapprovals cuyo estado en MP es 'pending'. Un 'pending' nunca cobró
// nada, así que darlo de baja no le quita el servicio a nadie. Un 'authorized'
// puede ser la suscripción viva del gym incluso si nuestra fila está
// desactualizada, y cancelarlo lo deja sin cobro: de eso se encarga únicamente
// el webhook, y recién cuando confirmó que hay un reemplazo autorizado.

import type { SupabaseClient } from "@supabase/supabase-js";

export const MP_API = "https://api.mercadopago.com";

/**
 * Anota un preapproval recién creado. Best-effort: si falla, el preapproval
 * existe igual y la suscripción funciona; lo que se pierde es la posibilidad de
 * reapearlo después, así que se loguea fuerte.
 */
export async function trackPreapproval(
  svcClient: SupabaseClient,
  row: {
    mp_preapproval_id: string;
    gym_id: string;
    mp_application_id: string | null;
    payer_email: string | null;
  },
): Promise<void> {
  const { error } = await svcClient
    .from("saas_preapprovals")
    .upsert(row, { onConflict: "mp_preapproval_id" });

  if (error) {
    console.error(
      `[mp-preapprovals] no se pudo registrar el preapproval ${row.mp_preapproval_id} del gym ${row.gym_id}:`,
      error,
    );
  }
}

/** Estado de un preapproval según MP. null si MP no lo reconoce. */
export async function getPreapprovalStatus(
  preapprovalId: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // 4xx = no existe o no es de esta app. 5xx = MP caído; en los dos casos se
    // deja para la próxima corrida en vez de arriesgar una cancelación a ciegas.
    console.warn(
      `[mp-preapprovals] GET /preapproval/${preapprovalId} devolvió ${res.status}`,
    );
    return null;
  }

  const data = await res.json();
  return typeof data.status === "string" ? data.status : null;
}

/**
 * PUT status=cancelled sobre un preapproval.
 *
 * Un 4xx cuenta como éxito: significa que no existe o ya estaba cancelado, y el
 * objetivo (que no pueda cobrar nunca) ya está cumplido. Mismo criterio que
 * /api/saas/subscription/cancel.
 */
export async function cancelPreapproval(
  preapprovalId: string,
  token: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  if (!res.ok && res.status >= 500) {
    console.error(
      `[mp-preapprovals] MP no disponible al cancelar ${preapprovalId}: ${await res.text()}`,
    );
  }

  return { ok: res.ok || res.status < 500, status: res.status };
}

/**
 * Cancela los preapprovals 'pending' registrados para un gym, salvo `keepId`.
 *
 * Es la limpieza del checkout abandonado: el owner arrancó un pago, no lo
 * terminó, y ese preapproval quedó vivo esperando que alguien reabra el
 * init_point viejo. Si eso pasa MP cobra la tarjeta y el webhook descarta el
 * aviso (la fila ya guarda otro mp_preapproval_id), o sea cobro sin registro.
 *
 * Nunca tira: quien la llama tiene algo más importante que hacer y un huérfano
 * de más se reintenta en la próxima corrida del reaper.
 */
export async function cancelPendingPreapprovals(
  svcClient: SupabaseClient,
  gymId: string,
  keepId: string | null,
  token: string,
): Promise<{ canceled: string[]; skipped: string[] }> {
  const canceled: string[] = [];
  const skipped: string[] = [];

  try {
    const { data, error } = await svcClient
      .from("saas_preapprovals")
      .select("mp_preapproval_id")
      .eq("gym_id", gymId)
      .is("canceled_at", null);

    if (error) throw error;

    const candidates = (data ?? [])
      .map((r) => r.mp_preapproval_id as string)
      .filter((id) => id !== keepId);

    for (const id of candidates) {
      // El estado se consulta antes de tocar nada: el registro no sabe si el
      // owner autorizó este preapproval por fuera, y cancelar un 'authorized'
      // por error deja al gym sin cobro.
      const status = await getPreapprovalStatus(id, token);

      if (status === "cancelled") {
        // Ya estaba dado de baja: se marca para no volver a consultarlo.
        await svcClient
          .from("saas_preapprovals")
          .update({ canceled_at: new Date().toISOString() })
          .eq("mp_preapproval_id", id);
        continue;
      }

      if (status !== "pending") {
        skipped.push(id);
        continue;
      }

      const { ok } = await cancelPreapproval(id, token);
      if (!ok) continue;

      canceled.push(id);
      await svcClient
        .from("saas_preapprovals")
        .update({ canceled_at: new Date().toISOString() })
        .eq("mp_preapproval_id", id);
    }
  } catch (err) {
    console.error(
      `[mp-preapprovals] gym ${gymId}: falló la limpieza de pendientes:`,
      err,
    );
  }

  if (canceled.length) {
    console.log(
      `[mp-preapprovals] gym ${gymId}: ${canceled.length} preapproval(s) pending cancelado(s): ${canceled.join(", ")}`,
    );
  }

  return { canceled, skipped };
}
