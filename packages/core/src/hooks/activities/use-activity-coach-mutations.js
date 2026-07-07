// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// CRUD de coaches asignados a una actividad (activity_coaches), online y directo
// a Supabase. La unicidad (activity_id, coach_id) la valida la DB → 23505 a
// mensaje claro.

const DUPLICATE_COACH_MSG = "Ese coach ya está asignado a esta actividad.";

// Normaliza el payload del form: los tres campos del esquema de pago son
// opcionales/combinables; vacíos → null.
const toNumberOrNull = (v) => (v === "" || v == null ? null : Number(v));

const normalize = (value) => ({
  coach_id: value.coach_id,
  monthly_fee: toNumberOrNull(value.monthly_fee),
  revenue_share_pct: toNumberOrNull(value.revenue_share_pct),
  rate_per_class: toNumberOrNull(value.rate_per_class),
  is_active: value.is_active ?? true,
});

export const useActivityCoachMutations = (activityId, gymId) => {
  const queryClient = useQueryClient();

  // Refresca los coaches de esta actividad, el listado (las tarjetas muestran
  // los coaches embebidos) y el resumen de pagos a coaches si está montado.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activity_coaches", activityId] });
    queryClient.invalidateQueries({ queryKey: ["activities", gymId] });
    queryClient.invalidateQueries({ queryKey: ["coach_payment_summary", gymId] });
  };

  const create = useMutation({
    mutationFn: async (value) => {
      const row = { activity_id: activityId, gym_id: gymId, ...normalize(value) };
      const { data, error } = await supabase
        .from("activity_coaches")
        .insert(row)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_COACH_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...value }) => {
      const { data, error } = await supabase
        .from("activity_coaches")
        .update(normalize(value))
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_COACH_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("activity_coaches")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
