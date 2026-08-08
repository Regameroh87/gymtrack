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
 * Anota un preapproval recién creado. Devuelve false si no se pudo registrar.
 *
 * NO es best-effort: quien la llama tiene que abortar. Un preapproval que no
 * quedó anotado ya existe en MP y el owner puede autorizarlo, pero no está en
 * ningún índice — ni el reaper ni la reconciliación lo van a encontrar nunca,
 * porque a MP no se le puede preguntar qué preapprovals tiene un gym (ver el
 * encabezado). Es la única forma de perder un id, y sale caro.
 */
export async function trackPreapproval(
  svcClient: SupabaseClient,
  row: {
    mp_preapproval_id: string;
    gym_id: string;
    mp_application_id: string | null;
    payer_email: string | null;
  },
): Promise<boolean> {
  const { error } = await svcClient
    .from("saas_preapprovals")
    .upsert(row, { onConflict: "mp_preapproval_id" });

  if (error) {
    console.error(
      `[mp-preapprovals] no se pudo registrar el preapproval ${row.mp_preapproval_id} del gym ${row.gym_id}:`,
      error,
    );
    return false;
  }

  return true;
}

/**
 * Estado de un preapproval según MP, con el código HTTP de la consulta.
 *
 * El código va aparte a propósito: `status: null` solo dice "no se sabe", y qué
 * hacer ante esa duda depende de quien pregunta. Para cancelar, lo seguro es no
 * tocar nada; para decidir si hay un cobro vivo, lo seguro es asumir que sí. Un
 * 4xx (no existe / es de otra app) y un 5xx (MP caído) no significan lo mismo y
 * colapsarlos en null hacía imposible distinguirlos.
 */
export async function getPreapprovalState(
  preapprovalId: string,
  token: string,
): Promise<{ status: string | null; httpStatus: number }> {
  const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn(
      `[mp-preapprovals] GET /preapproval/${preapprovalId} devolvió ${res.status}`,
    );
    return { status: null, httpStatus: res.status };
  }

  const data = await res.json();
  return {
    status: typeof data.status === "string" ? data.status : null,
    httpStatus: res.status,
  };
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
 * ¿Puede el token de ESTE entorno operar sobre un preapproval de esta app?
 *
 * Cada entorno barre con su propio token y un token solo sirve para su propia
 * app de MP. Preguntarle a MP por un preapproval de la otra app devuelve 4xx,
 * así que preguntarlo no aporta nada: el id queda en `unknown` y se vuelve a
 * consultar en cada corrida, para siempre. Descartarlo antes de preguntar
 * ahorra esa llamada sin cambiar quién limpia qué.
 *
 * Descartar NO es sellar: la fila queda con canceled_at en null a propósito,
 * porque el único que puede darle de baja es el reaper del otro entorno y
 * sellarla acá se la escondería.
 *
 * Cuál es "la app de este entorno" se deduce del despliegue (ver PROD_CHECKLIST):
 * el token de prueba va en Preview/Development y el productivo en Production. Es
 * el mismo criterio con el que el checkout decide si ignorar MP_TEST_PAYER_EMAIL.
 * El token no se puede interrogar: los dos empiezan con APP_USR-.
 *
 * mp_application_id null = fila anterior a la columna. Ahí no se puede decidir,
 * así que se consulta igual y decide MP, como antes de este filtro.
 */
function isFromThisEnvsApp(mpApplicationId: string | null): boolean {
  const testAppId = process.env.MP_TEST_APPLICATION_ID;
  if (!testAppId || !mpApplicationId) return true;

  const vercelEnv = process.env.VERCEL_ENV;
  const isProd =
    process.env.NODE_ENV === "production" &&
    (!vercelEnv || vercelEnv === "production");

  const esDeLaAppDePrueba = mpApplicationId === testAppId;
  return isProd ? !esDeLaAppDePrueba : esDeLaAppDePrueba;
}

/**
 * Cancela los preapprovals 'pending' registrados para un gym, salvo los de
 * `keep`.
 *
 * Es la limpieza del checkout abandonado: el owner arrancó un pago, no lo
 * terminó, y ese preapproval quedó vivo esperando que alguien reabra el
 * init_point viejo. Si eso pasa MP cobra la tarjeta y el webhook descarta el
 * aviso (la fila ya guarda otro mp_preapproval_id), o sea cobro sin registro.
 *
 * `keep` es una lista y no un id suelto porque durante un cambio de plan hay dos
 * preapprovals legítimos a la vez: el vigente (mp_preapproval_id, que sigue
 * cobrando el plan viejo) y el del cambio todavía sin autorizar
 * (pending_preapproval_id). Con un solo id, el reaper daba de baja el cambio que
 * el owner acababa de arrancar.
 *
 * Nunca tira: quien la llama tiene algo más importante que hacer y un huérfano
 * de más se reintenta en la próxima corrida del reaper.
 *
 * Devuelve además lo que vio sin tocar, porque ya consultó el estado de cada id
 * y tirarlo obligaría a repetir las mismas llamadas a MP:
 *   - `authorized`: preapprovals con débito vivo que NO están en `keep`. Es la
 *     señal de doble cobro (o de que la fila local quedó desincronizada de MP).
 *     No se cancelan acá: darle de baja el cobro a un gym en base a una fila que
 *     puede estar vieja es peor que el problema. Solo el webhook cancela
 *     'authorized', y recién cuando confirmó que hay un reemplazo autorizado.
 *   - `unknown`: MP no contestó, o el id es de otra app y la fila no lo declara
 *     (mp_application_id null). Se reintenta después.
 *
 * Los preapprovals que la fila declara de otra app ni se consultan: los filtra
 * isFromThisEnvsApp, porque este token no puede hacer nada con ellos.
 */
export async function cancelPendingPreapprovals(
  svcClient: SupabaseClient,
  gymId: string,
  keep: string | null | Array<string | null>,
  token: string,
): Promise<{ canceled: string[]; authorized: string[]; unknown: string[] }> {
  const canceled: string[] = [];
  const authorized: string[] = [];
  const unknown: string[] = [];

  const keepIds = new Set(
    (Array.isArray(keep) ? keep : [keep]).filter((id): id is string => !!id),
  );

  try {
    const { data, error } = await svcClient
      .from("saas_preapprovals")
      .select("mp_preapproval_id, mp_application_id")
      .eq("gym_id", gymId)
      .is("canceled_at", null);

    if (error) throw error;

    const candidates = (data ?? [])
      .filter((r) => isFromThisEnvsApp(r.mp_application_id as string | null))
      .map((r) => r.mp_preapproval_id as string)
      .filter((id) => !keepIds.has(id));

    for (const id of candidates) {
      // El estado se consulta antes de tocar nada: el registro no sabe si el
      // owner autorizó este preapproval por fuera, y cancelar un 'authorized'
      // por error deja al gym sin cobro.
      const { status } = await getPreapprovalState(id, token);

      if (status === "cancelled") {
        // Ya estaba dado de baja: se marca para no volver a consultarlo.
        await svcClient
          .from("saas_preapprovals")
          .update({ canceled_at: new Date().toISOString() })
          .eq("mp_preapproval_id", id);
        continue;
      }

      if (status === "authorized") {
        authorized.push(id);
        continue;
      }

      if (status !== "pending") {
        // status null (MP caído o id de otra app) o algún estado que MP agregue.
        unknown.push(id);
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

  return { canceled, authorized, unknown };
}
