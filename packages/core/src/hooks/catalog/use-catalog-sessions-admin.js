// CRUD del CATÁLOGO de SESIONES (super_admin). Escribe DIRECTO a Supabase (no por el
// sync single-gym de SQLite). El guardado va por el RPC save_catalog_session, que corre
// la fila sessions + sus session_exercises en una sola transacción y preserva los
// session_exercise.id que ya referencian planes de catálogo. Ver [[project_default_catalog]].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSupabaseClient } from "../../supabase.js";

export const CATALOG_SESSIONS_KEY = ["catalog_admin", "sessions"];

// Lista de sesiones de catálogo con su cantidad de ejercicios.
export const useCatalogSessionsAdmin = () =>
  useQuery({
    queryKey: CATALOG_SESSIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, name, description, level, cover_image_uri, updated_at, session_exercises(count)"
        )
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        exercise_count: s.session_exercises?.[0]?.count ?? 0,
      }));
    },
  });

// Ejercicios de una sesión de catálogo, resueltos contra exercises_base. Lo usa el
// builder de sesión (edición) y el de planes (prescripción de cada día).
export const fetchCatalogSessionExercises = async (sessionId) => {
  if (!sessionId) return [];
  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      "id, exercise_id, position, exercises_base(name, muscle_group, image_uri)"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((se) => ({
    id: se.id,
    exercise_id: se.exercise_id,
    position: se.position,
    name: se.exercises_base?.name ?? "",
    muscle_group: se.exercises_base?.muscle_group ?? "",
    image_uri: se.exercises_base?.image_uri ?? null,
  }));
};

export const useCatalogSessionExercises = (sessionId) =>
  useQuery({
    queryKey: ["catalog_admin", "session", sessionId, "exercises"],
    enabled: !!sessionId,
    queryFn: () => fetchCatalogSessionExercises(sessionId),
  });

// Alta/edición de una sesión de catálogo vía RPC atómico.
// values: { name, description, level, cover_image_uri, exercises: [{ id?, exercise_id }] }
export const useSaveCatalogSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }) => {
      const payload = {
        id: id ?? null,
        name: values.name.trim(),
        description: values.description?.trim() || null,
        level: values.level || null,
        cover_image_uri: values.cover_image_uri || null,
        exercises: (values.exercises ?? []).map((ex, idx) => ({
          id: ex.id ?? null,
          exercise_id: ex.exercise_id,
          position: idx,
        })),
      };
      const { data, error } = await supabase.rpc("save_catalog_session", {
        payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_SESSIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["catalog_admin", "session"] });
    },
  });
};

export const useDeleteCatalogSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("delete_catalog_session", {
        p_session_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_SESSIONS_KEY });
    },
  });
};
