// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

// DB / hooks
import { supabase } from "../../database/supabase";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

// Suma un mes a una fecha ISO (YYYY-MM-DD); por defecto a partir de hoy.
export const addOneMonth = (fromISO = todayDate()) => {
  const d = new Date(`${fromISO}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

// Mutaciones de inscripciones a actividades (membresías con pago básico manual),
// member-agnósticas: el socio se pasa por llamada. Las usa Contabilidad (gym-wide)
// y cualquier vista de lectura por-socio. La escritura la habilita la rama
// is_admin_of de la RLS (solo admin/owner). Cada mutación invalida el listado
// gym-wide y, si se conoce el socio, también su vista por-socio.
export const useActivitySubscriptionMutations = () => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = (memberId) => {
    queryClient.invalidateQueries({ queryKey: ["gym_subscriptions", gymId] });
    // Cada cobro queda registrado en subscription_payments y alimenta el % de
    // ingresos de los coaches: refrescar también esas vistas. Prefijo (sin
    // gymId) para cubrir además el historial por-suscripción del modal.
    queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });
    queryClient.invalidateQueries({
      queryKey: ["coach_payment_summary", gymId],
    });
    if (memberId) {
      queryClient.invalidateQueries({
        queryKey: ["member_subscriptions", memberId],
      });
    }
  };

  // Inscribe a un socio a un pase. Si ya tenía una inscripción activa de ESA
  // actividad (otra frecuencia), la cierra primero (cerrar-luego-insertar) para
  // respetar el único-activo por actividad. Asume el primer mes pagado (vence el
  // mes que viene) → el badge arranca "Al día".
  const assign = useMutation({
    mutationFn: async ({
      memberId,
      activityId,
      activityPlanId,
      price,
      dueDate,
    }) => {
      const today = todayDate();

      const { error: closeErr } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: today })
        .eq("user_id", memberId)
        .eq("activity_id", activityId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      const id = Crypto.randomUUID();
      const normalizedPrice =
        price == null || price === "" ? null : Number(price);
      const { error: insErr } = await supabase
        .from("activity_subscriptions")
        .insert({
          id,
          user_id: memberId,
          gym_id: gymId,
          activity_id: activityId,
          activity_plan_id: activityPlanId,
          price: normalizedPrice,
          status: "active",
          start_date: today,
          last_payment_date: today,
          due_date: dueDate === undefined ? addOneMonth(today) : dueDate,
          assigned_by: staffProfileId,
        });
      if (insErr) throw insErr;

      // El alta asume el primer mes pagado: dejar ese cobro registrado en caja
      // (subscription_payments) para que ingresos y % de coaches cierren. El
      // período cubierto es el mes en curso.
      const periodStart = `${today.slice(0, 7)}-01`;
      const { error: payErr } = await supabase
        .from("subscription_payments")
        .insert({
          gym_id: gymId,
          subscription_id: id,
          activity_id: activityId,
          user_id: memberId,
          amount: normalizedPrice ?? 0,
          period_start: periodStart,
          period_end: addOneMonth(periodStart),
          registered_by: staffProfileId,
        });
      if (payErr) throw payErr;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  // Registra un pago vía RPC atómico: inserta el cobro en subscription_payments
  // (con el mes que cubre) Y mueve el vencimiento en la misma transacción (caja
  // y "al día" no divergen). periodStart = primer día del mes a pagar; si se
  // omite, el RPC usa el mes del vencimiento actual.
  const registerPayment = useMutation({
    mutationFn: async ({ id, price, periodStart }) => {
      const { data, error } = await supabase.rpc(
        "register_subscription_payment",
        {
          p_subscription_id: id,
          p_amount: price == null || price === "" ? null : Number(price),
          p_period_start: periodStart ?? null,
        }
      );
      if (error) throw error;
      return data; // id del cobro
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  // Anula un cobro (insert-only: la fila nunca se edita ni se borra). El RPC
  // valida permiso payments.void o ventana de gracia del mismo día para quien
  // registró el pago, y revierte el vencimiento de la suscripción.
  const voidPayment = useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      const { error } = await supabase.rpc("void_subscription_payment", {
        p_payment_id: paymentId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => invalidate(vars.memberId),
  });

  // Da de baja una inscripción (no la borra: conserva el historial).
  const cancel = useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: todayDate() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  return { assign, registerPayment, voidPayment, cancel };
};
