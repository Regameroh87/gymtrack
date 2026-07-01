// Librerías externas
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { session_logs, session_set_logs } from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";

// Por cada ejercicio base, las series (peso/reps) de la última sesión en la
// que el usuario lo registró. Se usa en la sesión activa para mostrar como
// placeholder lo que se levantó la vez anterior.
export const fetchLastExerciseSetLogs = async (userId, exerciseIds) => {
  if (!exerciseIds?.length) return {};

  const rows = await database
    .select({
      exercise_id: session_set_logs.exercise_id,
      session_log_id: session_set_logs.session_log_id,
      set_number: session_set_logs.set_number,
      reps: session_set_logs.reps,
      weight_kg: session_set_logs.weight_kg,
    })
    .from(session_set_logs)
    .innerJoin(
      session_logs,
      eq(session_set_logs.session_log_id, session_logs.id)
    )
    .where(
      and(
        eq(session_logs.user_id, userId),
        ne(session_logs.sync_status, "deleted"),
        ne(session_set_logs.sync_status, "deleted"),
        inArray(session_set_logs.exercise_id, exerciseIds)
      )
    )
    .orderBy(desc(session_logs.completed_at), asc(session_set_logs.set_number));

  // Las filas vienen de la más reciente a la más antigua: la primera sesión
  // que aparece para cada ejercicio es su última sesión, y solo nos quedamos
  // con las series de esa.
  const byExercise = {};
  for (const r of rows) {
    const entry = byExercise[r.exercise_id];
    if (!entry) {
      byExercise[r.exercise_id] = { logId: r.session_log_id, sets: [r] };
    } else if (entry.logId === r.session_log_id) {
      entry.sets.push(r);
    }
  }

  return Object.fromEntries(
    Object.entries(byExercise).map(([id, e]) => [id, e.sets])
  );
};

export const useLastExerciseSetLogs = (exerciseIds) => {
  const { userId } = useAuth();

  const ids = useMemo(
    () => [...new Set((exerciseIds ?? []).filter(Boolean))].sort(),
    [exerciseIds]
  );

  return useQuery({
    // Prefijo ["session_logs", userId]: la invalidación que dispara
    // useSaveSessionLog al guardar también refresca esta query.
    queryKey: ["session_logs", userId, "last-by-exercise", ids],
    enabled: !!userId && ids.length > 0,
    queryFn: () => fetchLastExerciseSetLogs(userId, ids),
  });
};
