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

// Inscripción de un socio a actividades (suscripciones con pago básico manual).
// La escritura la habilita la rama is_admin_of de la RLS (solo admin/owner).
export const useAssignActivityToMember = (memberId) => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["member_subscriptions", memberId],
    });

  // Inscribe al socio a un pase. Si ya tenía una inscripción activa de ESA
  // actividad (p. ej. otra frecuencia), la cierra primero (cerrar-luego-insertar,
  // igual que la asignación de planes) para respetar el único-activo por actividad.
  const assign = useMutation({
    mutationFn: async ({ activityId, activityPlanId, price, dueDate }) => {
      const today = todayDate();

      const { error: closeErr } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: today })
        .eq("user_id", memberId)
        .eq("activity_id", activityId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      // Inscripción nueva: se asume el primer mes pagado (vence el mes que viene),
      // así el badge de pago arranca "Al día". El admin lo ajusta con Registrar pago.
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
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  });

  // Da de baja una inscripción (no la borra: conserva el historial).
  const cancel = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: todayDate() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { assign, registerPayment, cancel };
};
