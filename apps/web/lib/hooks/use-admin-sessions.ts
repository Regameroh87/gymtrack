// CRUD de SESIONES del gym activo (admin). Tablas `sessions` / `session_exercises`
// con gym_id=<gym activo> e is_catalog=false. Escribe DIRECTO a Supabase (sin RPC),
// replicando en TS el diff + cascada de `save_catalog_session`. Port a Next de
// apps/mobile admin/sessions/builder.jsx + [id].jsx + use-session-form / use-delete-session.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export const SESSION_LEVELS = [
  { label: "Principiante", value: "principiante" },
  { label: "Intermedio", value: "intermedio" },
  { label: "Avanzado", value: "avanzado" },
];

export type SessionExerciseRow = {
  id: string | null; // id del session_exercise (null = nuevo)
  exercise_id: string;
  position?: number;
  name: string;
  muscle_group: string;
  image_uri: string | null;
};

export type AdminSession = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  cover_image_uri: string | null;
  exercises: SessionExerciseRow[];
};

export type AdminSessionValues = {
  name: string;
  description: string;
  level: string;
  cover_image_uri: string | null;
  exercises: SessionExerciseRow[];
};

export type PickerExercise = {
  id: string;
  name: string;
  muscle_group: string;
  image_uri: string | null;
};

// ── Ejercicios del gym para el picker del builder ──
export function useGymExercisesForPicker(gymId: string | null) {
  return useQuery({
    queryKey: ["admin_session_ex_picker", gymId],
    enabled: !!gymId,
    queryFn: async (): Promise<PickerExercise[]> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("exercises_base")
        .select("id, name, muscle_group, image_uri")
        .eq("gym_id", gymId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PickerExercise[];
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

async function fetchSessionExercises(
  sessionId: string
): Promise<SessionExerciseRow[]> {
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

// ── Header + ejercicios de una sesión del gym (para editar) ──
export function useAdminSession(id: string | null) {
  return useQuery({
    queryKey: ["admin_session", id],
    enabled: !!id,
    queryFn: async (): Promise<AdminSession | null> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, name, description, level, cover_image_uri")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const exercises = await fetchSessionExercises(id as string);
      return { ...(data as Omit<AdminSession, "exercises">), exercises };
    },
  });
}

// Borra los plan_week_day_exercises (y sus sets) que referencian estos session_exercises.
async function cascadeDeleteSessionExercises(seIds: string[]) {
  if (!seIds.length) return;
  const supabase = getBrowserSupabase();
  const { data: pex, error: pexErr } = await supabase
    .from("plan_week_day_exercises")
    .select("id")
    .in("session_exercise_id", seIds);
  if (pexErr) throw pexErr;
  const pexIds = ((pex ?? []) as { id: string }[]).map((r) => r.id);
  if (!pexIds.length) return;
  const { error: setErr } = await supabase
    .from("plan_week_day_exercise_sets")
    .delete()
    .in("exercise_id", pexIds);
  if (setErr) throw setErr;
  const { error: delErr } = await supabase
    .from("plan_week_day_exercises")
    .delete()
    .in("id", pexIds);
  if (delErr) throw delErr;
}

// ── Alta / edición de una sesión del gym ──
export function useSaveAdminSession(gymId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: AdminSessionValues;
    }) => {
      const supabase = getBrowserSupabase();
      const now = new Date().toISOString();
      const header = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        level: values.level || null,
        cover_image_uri: values.cover_image_uri || null,
        updated_at: now,
      };

      let sessionId = id ?? null;

      if (sessionId) {
        const { error } = await supabase
          .from("sessions")
          .update(header)
          .eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        sessionId = crypto.randomUUID();
        const { error } = await supabase.from("sessions").insert({
          ...header,
          id: sessionId,
          gym_id: gymId,
          is_catalog: false,
          created_by: auth?.user?.id ?? null,
          created_at: now,
        });
        if (error) throw error;
      }

      // Diff de session_exercises (preservar ids existentes que ya referencian planes)
      const incoming = values.exercises ?? [];
      const keepIds = incoming
        .map((e) => e.id)
        .filter((v): v is string => !!v);

      const { data: existing, error: exErr } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", sessionId);
      if (exErr) throw exErr;

      const removed = ((existing ?? []) as { id: string }[])
        .map((r) => r.id)
        .filter((rid) => !keepIds.includes(rid));

      if (removed.length) {
        await cascadeDeleteSessionExercises(removed);
        const { error: rmErr } = await supabase
          .from("session_exercises")
          .delete()
          .in("id", removed);
        if (rmErr) throw rmErr;
      }

      // Upsert en orden: actualizar posición de existentes, insertar nuevos.
      for (let idx = 0; idx < incoming.length; idx++) {
        const ex = incoming[idx];
        if (ex.id) {
          const { error } = await supabase
            .from("session_exercises")
            .update({ position: idx, exercise_id: ex.exercise_id, updated_at: now })
            .eq("id", ex.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("session_exercises").insert({
            id: crypto.randomUUID(),
            session_id: sessionId,
            exercise_id: ex.exercise_id,
            position: idx,
            created_at: now,
            updated_at: now,
          });
          if (error) throw error;
        }
      }

      return sessionId;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_sessions_web"] });
      if (vars.id)
        queryClient.invalidateQueries({ queryKey: ["admin_session", vars.id] });
    },
  });
}

// ── Borrado de una sesión del gym (con cascada) ──
export function useDeleteAdminSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = getBrowserSupabase();
      const now = new Date().toISOString();

      const { data: ses, error: sesErr } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("session_id", sessionId);
      if (sesErr) throw sesErr;
      const seIds = ((ses ?? []) as { id: string }[]).map((r) => r.id);

      await cascadeDeleteSessionExercises(seIds);

      // Los días de plan que usaban la sesión quedan sin sesión (replica SET NULL).
      const { error: dayErr } = await supabase
        .from("plan_week_days")
        .update({ session_id: null, updated_at: now })
        .eq("session_id", sessionId);
      if (dayErr) throw dayErr;

      const { error: rmSeErr } = await supabase
        .from("session_exercises")
        .delete()
        .eq("session_id", sessionId);
      if (rmSeErr) throw rmSeErr;

      const { error: rmErr } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);
      if (rmErr) throw rmErr;

      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sessions_web"] });
      queryClient.invalidateQueries({ queryKey: ["training_plans"] });
    },
  });
}
