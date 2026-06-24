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
    mutationFn: async ({ memberId, activityId, activityPlanId, price, dueDate }) => {
      const today = todayDate();

      const { error: closeErr } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: today })
        .eq("user_id", memberId)
        .eq("activity_id", activityId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      const id = Crypto.randomUUID();
      const { error: insErr } = await supabase
        .from("activity_subscriptions")
        .insert({
          id,
          user_id: memberId,
          gym_id: gymId,
          activity_id: activityId,
          activity_plan_id: activityPlanId,
          price: price == null || price === "" ? null : Number(price),
          status: "active",
          start_date: today,
          last_payment_date: today,
          due_date: dueDate === undefined ? addOneMonth(today) : dueDate,
          assigned_by: staffProfileId,
        });
      if (insErr) throw insErr;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  // Registra un pago: actualiza el último pago y mueve el vencimiento.
  const registerPayment = useMutation({
    mutationFn: async ({ id, nextDueDate }) => {
      const { error } = await supabase
        .from("activity_subscriptions")
        .update({
          last_payment_date: todayDate(),
          due_date: nextDueDate ?? addOneMonth(),
        })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
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

  return { assign, registerPayment, cancel };
};
