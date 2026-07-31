// Pago de la cuota por parte del socio, desde la app.
//
// Tres piezas:
//   useGymOnlinePayments  ¿este gym tiene los cobros prendidos?
//   useMyPendingCharges   ¿qué debo, desglosado por actividad?
//   usePayDues            abrir el checkout y esperar la confirmación
//
// ── Lo importante: volver del navegador NO es prueba de pago ────────────────
// Cuando el socio vuelve a la app, lo único que sabemos es que cerró el
// navegador. Puede haber pagado, puede haberle rebotado la tarjeta, puede haber
// cerrado sin hacer nada. Quien confirma es el webhook mp-gym-webhook, que habla
// con MercadoPago del lado del servidor. Por eso al volver se hace polling del
// intento y no se da nada por hecho: mostrar "pagado" al cerrar el navegador
// dejaría socios convencidos de haber pagado con la tarjeta rechazada.

// React / libs
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

// DB / hooks
import { supabase } from "../../database/supabase";
import { useAuth } from "../../auth/lib/getSession";

/** ¿El dueño del gym habilitó los cobros online? */
export const useGymOnlinePayments = (gymId) =>
  useQuery({
    queryKey: ["gym_online_payments_enabled", gymId],
    enabled: !!gymId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("online_payments_enabled")
        .eq("id", gymId)
        .maybeSingle();
      if (error) throw error;
      return data?.online_payments_enabled === true;
    },
  });

/**
 * Lo que el socio debe en este gym, una fila por actividad.
 *
 * Sale del RPC member_pending_charges, que es la MISMA definición que usa la
 * edge function al cobrar. Si la pantalla calculara el total por su cuenta,
 * podría mostrarle al socio un número distinto del que termina pagando.
 */
export const useMyPendingCharges = (gymId) => {
  const { userId: profileId } = useAuth();

  return useQuery({
    queryKey: ["member_pending_charges", gymId, profileId],
    enabled: !!gymId && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_pending_charges", {
        p_gym_id: gymId,
        p_user_id: profileId,
      });
      if (error) throw error;

      const rows = data ?? [];
      return {
        items: rows,
        total: rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
      };
    },
  });
};

// Cuánto esperar la confirmación del webhook antes de dejar de mirar. MP suele
// avisar en segundos, pero un pago con débito puede demorar. Al agotarse NO se
// dice que falló: se dice que sigue en proceso, que es la verdad.
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 2_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Flujo completo de pago. Devuelve el estado final del intento:
 *   'approved'   confirmado por el webhook
 *   'rejected'   MercadoPago lo rechazó
 *   'pending'    el socio cerró el navegador, o todavía no llegó la confirmación
 */
export const usePayDues = (gymId) => {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState("idle"); // idle | creating | checkout | confirming

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["member_pending_charges"] });
    queryClient.invalidateQueries({ queryKey: ["member_subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });
    // Si estaba bloqueado por cuota vencida, pagar tiene que devolverle el
    // acceso al entrenamiento sin reiniciar la app.
    queryClient.invalidateQueries({ queryKey: ["training_access"] });
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: async () => {
      setPhase("creating");

      // La edge function arma el desglose, congela los montos y crea la
      // preferencia con el token de MP DEL GYM: la plata va a su cuenta.
      const { data, error } = await supabase.functions.invoke("crear-cobro-socio", {
        body: { gym_id: gymId },
      });

      if (error) {
        // functions.invoke mete el detalle en el body de la respuesta, no en el
        // error, así que hay que ir a buscarlo o el socio ve "Edge Function
        // returned a non-2xx status code".
        let detail = null;
        try {
          detail = await error.context?.json();
        } catch {
          // sin body legible: queda el mensaje genérico
        }
        throw new Error(detail?.error ?? "No se pudo iniciar el pago.");
      }

      setPhase("checkout");

      // El deep link es lo que hace que se cierre el navegador in-app al
      // terminar: openAuthSessionAsync corta la sesión cuando la navegación
      // llega a esta URL.
      const returnUrl = Linking.createURL("/");
      await WebBrowser.openAuthSessionAsync(data.init_point, returnUrl);

      // A partir de acá el navegador se cerró y NO sabemos qué pasó. La única
      // fuente es el intento, que escribe el webhook.
      setPhase("confirming");

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { data: intent } = await supabase
          .from("member_payment_intents")
          .select("status")
          .eq("id", data.intent_id)
          .maybeSingle();

        if (intent?.status && intent.status !== "pending") {
          return { status: intent.status, total: data.total };
        }

        await sleep(POLL_INTERVAL_MS);
      }

      return { status: "pending", total: data.total };
    },
    onSettled: () => {
      setPhase("idle");
      invalidate();
    },
  });

  return { ...mutation, phase };
};
