// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, asc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import {
  exercises_base,
  session_logs,
  session_set_logs,
  sessions,
  training_plans,
} from "../../database/schemas";

// Trae un registro de entrenamiento con todas sus series agrupadas por
// ejercicio (preservando el orden en que aparecen las series).
export const fetchSessionLogDetail = async (logId) => {
  const [log] = await database
    .select({
      id: session_logs.id,
      session_id: session_logs.session_id,
      plan_id: session_logs.plan_id,
      week_number: session_logs.week_number,
      day_number: session_logs.day_number,
      duration_seconds: session_logs.duration_seconds,
      completed_at: session_logs.completed_at,
      session_name: sessions.name,
      session_level: sessions.level,
      session_cover: sessions.cover_image_uri,
      plan_name: training_plans.name,
      plan_duration_weeks: training_plans.duration_weeks,
    })
    .from(session_logs)
    .leftJoin(sessions, eq(session_logs.session_id, sessions.id))
    .leftJoin(training_plans, eq(session_logs.plan_id, training_plans.id))
    .where(
      and(eq(session_logs.id, logId), ne(session_logs.sync_status, "deleted"))
    );

  if (!log) return null;

  const setRows = await database
    .select({
      id: session_set_logs.id,
      exercise_id: session_set_logs.exercise_id,
      set_number: session_set_logs.set_number,
      reps: session_set_logs.reps,
      weight_kg: session_set_logs.weight_kg,
      notes: session_set_logs.notes,
      exercise_name: exercises_base.name,
      muscle_group: exercises_base.muscle_group,
    })
    .from(session_set_logs)
    .leftJoin(
      exercises_base,
      eq(session_set_logs.exercise_id, exercises_base.id)
    )
    .where(eq(session_set_logs.session_log_id, logId))
    .orderBy(asc(session_set_logs.set_number));

  // Agrupar por ejercicio conservando el orden de primera aparición.
  const exercises = [];
  const groupByExercise = new Map();
  for (const row of setRows) {
    let group = groupByExercise.get(row.exercise_id);
    if (!group) {
      group = {
        exercise_id: row.exercise_id,
        name: row.exercise_name ?? "Ejercicio",
        muscle_group: row.muscle_group ?? null,
        sets: [],
      };
      groupByExercise.set(row.exercise_id, group);
      exercises.push(group);
    }
    group.sets.push(row);
  }
  exercises.forEach((g) => g.sets.sort((a, b) => a.set_number - b.set_number));

  const totalSets = setRows.length;
  const totalVolume = setRows.reduce(
    (acc, s) => acc + (s.weight_kg ?? 0) * s.reps,
    0
  );

  return { ...log, exercises, totalSets, totalVolume };
};

export const useSessionLogDetail = (logId) =>
  useQuery({
    queryKey: ["session_logs", "detail", logId],
    enabled: !!logId,
    queryFn: () => fetchSessionLogDetail(logId),
  });
