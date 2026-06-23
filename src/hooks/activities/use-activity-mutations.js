// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB / contexto
import { supabase } from "../../database/supabase";
import { useActiveGym } from "../../contexts/active-gym-context";

// CRUD de actividades, online y directo a Supabase (sin sync local: las gestiona
// el admin conectado). Cada mutación invalida ["activities", gymId] para refrescar
// la lista. La unicidad (gym_id, lower(name)) la valida la DB → el código 23505 se
// traduce a un mensaje claro.

const DUPLICATE_NAME_MSG = "Ya existe una actividad con ese nombre en este gimnasio.";

// Normaliza el payload del form: trimea el nombre, vacíos → null. El precio ya no
// vive en la actividad sino en cada pase (activity_plans).
const normalize = (value) => ({
  name: (value.name || "").trim(),
  description: (value.description || "").trim() || null,
  color: value.color || null,
  coach_id: value.coach_id || null,
  is_active: value.is_active ?? true,
});

export const useActivityMutations = () => {
  const queryClient = useQueryClient();
  const { gymId } = useActiveGym();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["activities", gymId] });

  const create = useMutation({
    mutationFn: async (value) => {
      // id lo genera Postgres (default gen_random_uuid()).
      const row = { gym_id: gymId, ...normalize(value) };
      const { data, error } = await supabase
        .from("activities")
        .insert(row)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_NAME_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...value }) => {
      const { data, error } = await supabase
        .from("activities")
        .update(normalize(value))
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error(DUPLICATE_NAME_MSG);
        throw error;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
};
