// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// CRUD de horarios semanales (activity_schedules), online y directo a Supabase.
// La unicidad (activity_id, weekday, start_time) la valida la DB → 23505 a
// mensaje claro. Editar/borrar un horario NO toca las clases ya materializadas
// (conservan su snapshot); las futuras generaciones usan el horario nuevo.

const DUPLICATE_SLOT_MSG =
  "Esta actividad ya tiene un horario ese día a esa hora.";

// Normaliza HH:MM y campos opcionales.
const normalize = (value) => ({
  weekday: Number(value.weekday),
  start_time: value.start_time,
  end_time: value.end_time,
  capacity:
    value.capacity === "" || value.capacity == null
      ? null
      : Number(value.capacity),
  coach_id: value.coach_id || null,
  is_active: value.is_active ?? true,
});

export const useActivityScheduleMutations = (activityId, gymId) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["activity_schedules"] });
    // Las clases futuras se generan desde los horarios: refrescar la agenda.
    queryClient.invalidateQueries({ queryKey: ["activity_classes", gymId] });
  };

  const create = useMutation({
    mutationFn: async (value) => {
      const row = { activity_id: activityId, gym_id: gymId, ...normalize(value) };
      const { data, error } = await supabase
        .from("activity_schedules")
        .insert(row)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_SLOT_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...value }) => {
      const { data, error } = await supabase
        .from("activity_schedules")
        .update(normalize(value))
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_SLOT_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("activity_schedules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
