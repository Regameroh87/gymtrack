// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Mutaciones de la agenda de clases (activity_classes), online:
//   generate   → materializa las clases del rango desde los horarios (RPC
//                idempotente: no duplica ni pisa clases editadas).
//   setStatus  → scheduled | completed (dictada) | cancelled.
//   changeCoach→ suplencia: cambia el coach efectivo de UNA clase.
// El pago por clase del coach se calcula desde estas filas ⇒ cada mutación
// invalida también el resumen de pagos.
export const useActivityClassMutations = (gymId) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activity_classes", gymId] });
    queryClient.invalidateQueries({ queryKey: ["coach_payment_summary", gymId] });
  };

  const generate = useMutation({
    mutationFn: async ({ fromISO, toISO }) => {
      const { data, error } = await supabase.rpc("generate_activity_classes", {
        p_gym_id: gymId,
        p_from: fromISO,
        p_to: toISO,
      });
      if (error) throw error;
      return data; // cantidad de clases creadas
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase
        .from("activity_classes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  const changeCoach = useMutation({
    mutationFn: async ({ id, coachId }) => {
      const { error } = await supabase
        .from("activity_classes")
        .update({ coach_id: coachId })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { generate, setStatus, changeCoach };
};
