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
//   MP_TEST_APPLICATION_ID   – id de la app de MP del vendedor de prueba. Sin
//                              ella, un token de prueba puede crear un
//                              preapproval sobre un gym real sin que nadie lo
//                              frene: cargarla en TODOS los entornos.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabase } from "@/lib/supabase-server";
import { SUPABASE_URL } from "@/lib/supabase-config";
import { APP_URL } from "@/lib/site";
import { paidAccessUntil } from "@/lib/saas/access-period";
import {
  MP_API,
  cancelPreapproval,
  cancelPendingPreapprovals,
  getPreapprovalState,
  trackPreapproval,
} from "@/lib/saas/mp-preapprovals";

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

    const { gym_id, plan_id } = await req.json();
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
      .select("name, is_test")
      .eq("id", gym_id)
      .single();

    // El plan que eligió el owner. Sin plan_id se cae al default, que es el que
    // ya tiene asignado el gym recién creado — así el flujo de siempre (un solo
    // plan, sin selector) sigue funcionando igual.
    //
    // Un plan_id inactivo se rechaza en vez de caer al default en silencio: el
    // owner tendría la pantalla abierta con un plan que se dio de baja mientras
    // tanto, y cobrarle otro sin avisar es peor que pedirle que recargue.
    const planQuery = supabase
      .from("saas_plans")
      .select("id, name, price, currency, trial_days")
      .eq("is_active", true);

    const { data: plan } = plan_id
      ? await planQuery.eq("id", plan_id).maybeSingle()
      : await planQuery.eq("is_default", true).maybeSingle();

    if (!plan) {
      return NextResponse.json(
        {
          error: plan_id
            ? "El plan que elegiste ya no está disponible. Recargá la página y probá de nuevo."
            : "No hay ningún plan configurado. Escribinos.",
        },
        { status: 422 },
      );
    }

    if (!plan.price) {
      return NextResponse.json(
        { error: "El precio del plan no está configurado. Actualizá saas_plans.price." },
        { status: 422 },
      );
    }

    const svcClient = getServiceClient();

    const { data: existingSub } = await svcClient
      .from("gym_saas_subscriptions")
      .select(
        "id, status, plan_id, trial_ends_at, current_period_end, cancel_at_period_end, access_until, mp_preapproval_id, mp_authorized_at",
      )
      .eq("gym_id", gym_id)
      .maybeSingle();

    // ¿Es un cambio de plan sobre una suscripción viva? Se resuelve acá porque
    // condiciona las dos decisiones que siguen: si la guarda de doble débito
    // deja pasar, y desde cuándo arranca el cobro nuevo.
    const esCambioDePlan =
      !!existingSub && !!plan_id && existingSub.plan_id !== plan.id;

    // ── Nada de checkouts sobre una suscripción que ya cobra ─────────────────
    // Es el espejo de canActivate / canAddCardDuringTrial (admin/suscripcion):
    // la UI decide qué mostrar, esto decide qué se permite. Sin la guarda, el
    // endpoint queda alcanzable con la sesión del owner y un curl, y cada
    // llamada crea un preapproval MÁS en MP — que no tiene el concepto de "una
    // suscripción por cliente": los dos debitan la misma tarjeta hasta que el
    // webhook del nuevo cancele al viejo, y si ese aviso no llega, nunca.
    //
    // De paso cierra el trial renovable: un gym 'active' llegaba al else del
    // cálculo de startDate y estrenaba otros trialDays gratis.
    //
    // Con baja programada NO se bloquea: es "reanudar", y ahí el preapproval
    // viejo ya quedó 'cancelled' en MP (/subscription/cancel) — MP no revive
    // cancelados, hace falta uno nuevo sí o sí.
    //
    // La señal de "ya tiene tarjeta" es mp_authorized_at y NO mp_preapproval_id:
    // el id se escribe unas líneas más abajo, al crear el preapproval, así que
    // un checkout abandonado lo deja seteado sin que exista ninguna
    // autorización. Usarlo acá dejaba al gym en trial sin poder cargar la
    // tarjeta hasta que venciera la prueba.
    //
    // Se declara afuera del if porque el cálculo de startDate también la
    // necesita: el cambio de plan tiene que saber si hay un cobro vivo para
    // arrancar al final del período pagado en vez de estrenar un trial.
    let cobrandoAhora = false;
    if (existingSub && !existingSub.cancel_at_period_end) {
      cobrandoAhora =
        ["active", "past_due"].includes(existingSub.status) ||
        (existingSub.status === "trialing" && !!existingSub.mp_authorized_at);

      // trialing con preapproval sin confirmar es el único caso ambiguo: puede
      // ser el checkout abandonado (hay que dejarlo reintentar) o una
      // autorización real cuyo aviso se perdió (bloquear, o se duplica el
      // débito). La fila no los distingue porque la diferencia depende
      // justamente del aviso que pudo no llegar, así que se le pregunta a MP,
      // que es la única fuente que no depende de eso.
      if (
        !cobrandoAhora &&
        existingSub.status === "trialing" &&
        existingSub.mp_preapproval_id
      ) {
        const { status: mpStatus, httpStatus } = await getPreapprovalState(
          existingSub.mp_preapproval_id,
          mpToken,
        );

        if (mpStatus === "authorized") {
          // El webhook nunca llegó o se descartó. Se repara la fila acá mismo:
          // si no, cada visita a esta pantalla vuelve a preguntarle lo mismo a
          // MP y la UI le sigue ofreciendo cargar una tarjeta que ya está.
          cobrandoAhora = true;
          await svcClient
            .from("gym_saas_subscriptions")
            .update({ mp_authorized_at: new Date().toISOString() })
            .eq("id", existingSub.id);
          console.warn(
            `[saas/checkout] gym ${gym_id}: el preapproval ${existingSub.mp_preapproval_id} estaba authorized en MP y la fila no lo sabía; fila reparada`,
          );
        } else if (httpStatus >= 500) {
          // MP no contesta. Ante la duda se frena: crear un segundo preapproval
          // sobre una suscripción que quizás está cobrando es doble débito, y
          // reintentar en unos minutos no le cuesta nada a nadie.
          return NextResponse.json(
            {
              error:
                "MercadoPago no está respondiendo. Probá de nuevo en unos minutos.",
            },
            { status: 502 },
          );
        }
        // pending / cancelled / 4xx → checkout abandonado o preapproval muerto:
        // se deja pasar, que es lo que este chequeo viene a habilitar.
      }

      // Un cambio de plan es la excepción legítima a esta guarda: la suscripción
      // está viva justamente porque el owner quiere pasarse a otro plan, y MP no
      // deja cambiarle el monto a un preapproval ya autorizado. Hace falta uno
      // nuevo sí o sí.
      //
      // No abre la puerta al doble débito, por el orden en que pasan las cosas:
      // el preapproval nuevo arranca a cobrar recién cuando termina el período
      // ya pagado, y el viejo lo cancela cancelarPreapprovalsHuerfanos (en el
      // webhook) cuando el nuevo queda 'authorized'. Si el owner abandona el
      // checkout, el viejo sigue cobrando con normalidad: es el modo de fallar
      // correcto.
      if (cobrandoAhora && !esCambioDePlan) {
        // Se deja rastro: si esto aparece seguido, hay owners llegando acá con
        // la suscripción viva, o sea que la fila local y MP se desincronizan.
        await svcClient.from("saas_subscription_events").insert({
          gym_subscription_id: existingSub.id,
          mp_event_id: `checkout_blocked_${existingSub.id}_${Date.now()}`,
          event_type: "checkout_blocked",
          payload: {
            requested_by: user.id,
            status: existingSub.status,
            mp_preapproval_id: existingSub.mp_preapproval_id,
          },
        });

        return NextResponse.json(
          {
            error:
              "Este gimnasio ya tiene una suscripción activa en MercadoPago. Si querés cambiar la tarjeta, entrá a tu cuenta de MercadoPago.",
          },
          { status: 409 },
        );
      }
    }

    // Fecha del primer cobro:
    //  - baja programada con acceso vigente ("reanudar"): el cobro arranca donde
    //    termina el período ya pagado. Sin esta rama, un gym 'active' que se dio
    //    de baja caería en el else y se llevaría un trial completo de regalo.
    //  - trialing con trial vigente (self-service sin tarjeta): respeta el trial
    //    restante — el webhook al autorizar setea trial_ends_at = start_date,
    //    que así coincide y no resetea el trial.
    //  - expired/canceled/past_due CON trial_ends_at: cobro inmediato; un trial
    //    nuevo acá sería el vector de trial infinito re-suscribiendo el mismo gym.
    //  - expired/canceled/past_due SIN trial_ends_at: nunca consumió el trial.
    //    Es el gym de alta de plataforma que abandonó un checkout y al que el
    //    cron expire-saas-pending le puso 'expired' — cae en el else y estrena
    //    su trial. No abre la puerta al trial infinito: trial_ends_at lo escribe
    //    el webhook al autorizar y nunca vuelve a NULL.
    //  - pending (alta de plataforma, sin trial corrido): trial completo.
    //  - cambio de plan sobre una suscripción viva: el precio nuevo arranca
    //    cuando termina el período que YA pagó al precio viejo. Sin esta rama
    //    caería en el else y estrenaría un trial de regalo por cambiar de plan.
    const trialDays = plan.trial_days ?? 14;
    let startDate: string;
    if (esCambioDePlan && cobrandoAhora) {
      startDate =
        paidAccessUntil(existingSub) ?? new Date(Date.now() + 10 * 60_000).toISOString();
    } else if (
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
      existingSub.trial_ends_at &&
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
        // Es el texto que MP le muestra al pagador en el resumen y en el
        // débito. Lleva el nombre del plan: desde que hay varios, "GymTrack" a
        // secas no le dice al owner cuál de todos está autorizando.
        reason: `GymTrack ${plan.name}${gym?.name ? ` - ${gym.name}` : ""}`,
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
    // La app que efectivamente creó el preapproval, según MP. Se guarda en la
    // fila para que el webhook pueda descartar avisos de otra app.
    const mpApplicationId =
      mpData.application_id != null ? String(mpData.application_id) : null;

    // Anotar el preapproval en el registro propio, ANTES de cualquier salida por
    // error: es lo único que después permite saber que este id pertenece a este
    // gym (MP no deja buscar por external_reference, ver el encabezado de
    // lib/saas/mp-preapprovals). Un id que no se registró es un huérfano que
    // nadie va a poder encontrar.
    const registrado = await trackPreapproval(svcClient, {
      mp_preapproval_id: mpPreapprovalId,
      gym_id,
      mp_application_id: mpApplicationId,
      payer_email: payerEmail ?? null,
    });

    // Si no se pudo anotar, se cancela y se aborta. Seguir dejaría en MP un
    // preapproval autorizable que no está en ningún índice: ni el reaper ni la
    // reconciliación lo encontrarían jamás, porque el registro propio es la
    // única forma de saber qué preapprovals son de este gym. Devolver un error
    // hace que el owner reintente, que es barato; el huérfano no se arregla más.
    if (!registrado) {
      const { ok } = await cancelPreapproval(mpPreapprovalId, mpToken).catch(
        () => ({ ok: false }),
      );
      console.error(
        `[saas/checkout] preapproval ${mpPreapprovalId} del gym ${gym_id} no se pudo registrar; cancelado=${ok}`,
      );

      return NextResponse.json(
        { error: "No se pudo iniciar el pago. Probá de nuevo en unos minutos." },
        { status: 500 },
      );
    }

    // El vendedor de prueba no puede estrenar suscripciones sobre gyms reales.
    // Se chequea recién acá porque hasta que MP no responde no sabemos con qué
    // app quedó creado el preapproval — el token no lo dice (un token de prueba
    // también empieza con APP_USR-).
    //
    // Se cancela el preapproval antes de salir: si se dejara colgado quedaría
    // justo el huérfano que el webhook viene a evitar.
    const testAppId = process.env.MP_TEST_APPLICATION_ID;
    if (testAppId && mpApplicationId === testAppId && !gym?.is_test) {
      console.error(
        `[saas/checkout] app de prueba ${testAppId} contra el gym real ${gym_id}; preapproval ${mpPreapprovalId} cancelado`,
      );
      const { ok } = await cancelPreapproval(mpPreapprovalId, mpToken).catch(
        () => ({ ok: false }),
      );
      if (ok) {
        await svcClient
          .from("saas_preapprovals")
          .update({ canceled_at: new Date().toISOString() })
          .eq("mp_preapproval_id", mpPreapprovalId);
      }

      return NextResponse.json(
        {
          error:
            "Estás usando las credenciales de prueba de MercadoPago sobre un gimnasio real. Marcá el gym como de prueba o cargá el token productivo.",
        },
        { status: 422 },
      );
    }

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
    //
    // mp_authorized_at sí se limpia, y no es opcional: la marca es del
    // preapproval vigente, y el vigente pasa a ser este, que todavía está
    // 'pending'. Arrastrar la del anterior diría "ya tiene tarjeta" sobre un
    // preapproval que nunca fue autorizado.
    if (existingSub) {
      // Un cambio de plan sobre un cobro vivo se anota SIN tocar nada de lo que
      // describe la suscripción vigente. Las tres columnas que se dejan quietas
      // no son un detalle:
      //
      //  · mp_preapproval_id sigue siendo el del plan viejo, que es el que
      //    realmente cobra hasta que el owner autorice el nuevo. Pisarlo rompía
      //    el cobro: handleAuthorizedPaymentEvent (mp-webhook) resuelve la fila
      //    SOLO por esta columna y sin fallback por external_reference, así que
      //    el débito mensual del viejo no encontraba la suscripción y
      //    current_period_end se quedaba clavado — el owner pagando y el sistema
      //    sin registrarlo.
      //  · plan_id, porque el débito real todavía es el del plan viejo. Si el
      //    owner abandona el checkout, el panel seguiría mostrando un plan que
      //    nadie le está cobrando.
      //  · mp_authorized_at, al revés que en el flujo de reanudar: acá la
      //    tarjeta sigue autorizada sobre el preapproval viejo. Limpiarla diría
      //    "este gym no tiene tarjeta" y le ofrecería cargar una que ya tiene.
      //
      // El preapproval y el plan destino esperan en las columnas pending_*, y
      // las promueve el webhook al recibir el 'authorized'.
      const cambioVivo = esCambioDePlan && cobrandoAhora;

      await svcClient
        .from("gym_saas_subscriptions")
        .update(
          cambioVivo
            ? {
                pending_plan_id: plan.id,
                pending_preapproval_id: mpPreapprovalId,
              }
            : {
                plan_id: plan.id,
                pending_plan_id: null,
                pending_preapproval_id: null,
                mp_preapproval_id: mpPreapprovalId,
                mp_application_id: mpApplicationId,
                payer_email: payerEmail,
                mp_authorized_at: null,
              },
        )
        .eq("id", existingSub.id);

      if (cambioVivo) {
        // Auditoría: es el único rastro de que el cobro que viene es de otro
        // plan y desde cuándo. mp_event_id es unique, se prefija para no chocar
        // con los ids de eventos de MP.
        await svcClient.from("saas_subscription_events").insert({
          gym_subscription_id: existingSub.id,
          mp_event_id: `plan_change_${existingSub.id}_${Date.now()}`,
          event_type: "plan_change_requested",
          payload: {
            requested_by: user.id,
            from_plan_id: existingSub.plan_id,
            to_plan_id: plan.id,
            starts_at: startDate,
            mp_preapproval_id: mpPreapprovalId,
          },
        });
      }
    } else {
      await svcClient.from("gym_saas_subscriptions").insert({
        gym_id,
        plan_id: plan.id,
        status: "pending",
        mp_preapproval_id: mpPreapprovalId,
        mp_application_id: mpApplicationId,
        payer_email: payerEmail,
      });
    }

    // Con el nuevo preapproval ya guardado, dar de baja los 'pending' que dejó
    // cualquier intento anterior. Recién acá para no quedarse sin ninguno si algo
    // de arriba falló, y solo los 'pending': cancelar un 'authorized' antes de
    // que el reemplazo se confirme dejaría al gym sin cobro (eso lo hace el
    // webhook cuando ya sabe que el nuevo quedó autorizado).
    //
    // A partir de acá el init_point viejo no puede cobrar nada, que es el
    // huérfano que MP dejaba vivo indefinidamente.
    await cancelPendingPreapprovals(svcClient, gym_id, mpPreapprovalId, mpToken);

    return NextResponse.json({ init_point });
  } catch (err: unknown) {
    console.error("[saas/checkout] Error interno:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
