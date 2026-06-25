// CRUD del CATÁLOGO de SESIONES (super_admin). Port a Next de core
// hooks/catalog/use-catalog-sessions-admin.js: escribe directo a Supabase; el alta/
// edición va por el RPC atómico save_catalog_session (preserva los session_exercise.id
// que ya referencian planes de catálogo). Ver [[project_default_catalog]].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type CatalogSession = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  cover_image_uri: string | null;
  updated_at: string | null;
  exercise_count: number;
};

export type SessionExerciseRow = {
  id: string | null;
  exercise_id: string;
  position?: number;
  name: string;
  muscle_group: string;
  image_uri: string | null;
};

export type CatalogSessionValues = {
  name: string;
  description: string;
  level: string;
  cover_image_uri: string | null;
  exercises: SessionExerciseRow[];
};

export const CATALOG_SESSIONS_KEY = ["catalog_admin", "sessions"] as const;

type SessionRowDb = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  cover_image_uri: string | null;
  updated_at: string | null;
  session_exercises: { count: number }[] | null;
};

// Lista de sesiones de catálogo con su cantidad de ejercicios.
export function useCatalogSessionsAdmin() {
  return useQuery({
    queryKey: CATALOG_SESSIONS_KEY,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, name, description, level, cover_image_uri, updated_at, session_exercises(count)"
        )
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as SessionRowDb[]).map((s) => ({
        ...s,
        exercise_count: s.session_exercises?.[0]?.count ?? 0,
      })) as CatalogSession[];
    },
  });
}

type SessionExerciseDb = {
  id: string;
  exercise_id: string;
  position: number;
  exercises_base: {
    name: string | null;
    muscle_group: string | null;
    image_uri: string | null;
  } | null;
};

// Ejercicios de una sesión de catálogo, resueltos contra exercises_base.
export async function fetchCatalogSessionExercises(
  sessionId: string | null | undefined
): Promise<SessionExerciseRow[]> {
  if (!sessionId) return [];
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      "id, exercise_id, position, exercises_base(name, muscle_group, image_uri)"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as SessionExerciseDb[]).map((se) => ({
    id: se.id,
    exercise_id: se.exercise_id,
    position: se.position,
    name: se.exercises_base?.name ?? "",
    muscle_group: se.exercises_base?.muscle_group ?? "",
    image_uri: se.exercises_base?.image_uri ?? null,
  }));
}

export function useCatalogSessionExercises(sessionId: string | null) {
  return useQuery({
    queryKey: ["catalog_admin", "session", sessionId, "exercises"],
    enabled: !!sessionId,
    queryFn: () => fetchCatalogSessionExercises(sessionId),
  });
}

// Alta/edición de una sesión de catálogo vía RPC atómico.
export function useSaveCatalogSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: CatalogSessionValues;
    }) => {
      const supabase = getBrowserSupabase();
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
}

export function useDeleteCatalogSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getBrowserSupabase();
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
}

export const SESSION_LEVELS = [
  { label: "Principiante", value: "principiante" },
  { label: "Intermedio", value: "intermedio" },
  { label: "Avanzado", value: "avanzado" },
];
