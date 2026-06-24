// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB / contexto
import { getSupabaseClient } from "../../supabase.js";
import { useActiveGym } from "../../contexts/active-gym-context";

// CRUD de pases (activity_plans) de una actividad, online y directo a Supabase.
// La unicidad (activity_id, lower(label)) la valida la DB → 23505 a mensaje claro.

const DUPLICATE_LABEL_MSG = "Ya existe un pase con ese nombre en esta actividad.";

// Normaliza el payload del form del pase: label trimeado, frecuencia/precio a
// número o null.
const normalize = (value) => ({
  label: (value.label || "").trim(),
  frequency_per_week:
    value.frequency_per_week === "" || value.frequency_per_week == null
      ? null
      : Number(value.frequency_per_week),
  price:
    value.price === "" || value.price == null ? null : Number(value.price),
  is_active: value.is_active ?? true,
});

export const useActivityPlanMutations = (activityId) => {
  const queryClient = useQueryClient();
  const { gymId } = useActiveGym();

  // Refresca tanto los pases de esta actividad como el listado (las tarjetas
  // muestran cantidad de pases y precio mínimo embebidos en ["activities"]).
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activity_plans", activityId] });
    queryClient.invalidateQueries({ queryKey: ["activities", gymId] });
  };

  const create = useMutation({
    mutationFn: async (value) => {
      const row = {
        activity_id: activityId,
        sort_order: value.sort_order ?? 0,
        ...normalize(value),
      };
      const { data, error } = await supabase
        .from("activity_plans")
        .insert(row)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_LABEL_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...value }) => {
      const { data, error } = await supabase
        .from("activity_plans")
        .update(normalize(value))
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_LABEL_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("activity_plans")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
