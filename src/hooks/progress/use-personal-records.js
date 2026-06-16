// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, eq, isNotNull, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import {
  session_logs,
  session_set_logs,
  exercises_base,
} from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";

// 1RM estimado (fórmula de Epley): weight × (1 + reps/30). Permite comparar
// series de distinto peso/reps con una sola métrica de fuerza.
const estimate1RM = (weight, reps) => weight * (1 + (reps || 1) / 30);

// Récords personales por ejercicio, derivados de las series cargadas
// (session_set_logs). Por cada ejercicio guarda la mejor serie según 1RM
// estimado, junto con el mejor peso absoluto y la fecha. Ordena por 1RM desc.
export const fetchPersonalRecords = async (userId) => {
  const rows = await database
    .select({
      exercise_id: session_set_logs.exercise_id,
      name: exercises_base.name,
      muscle_group: exercises_base.muscle_group,
      reps: session_set_logs.reps,
      weight_kg: session_set_logs.weight_kg,
      completed_at: session_logs.completed_at,
    })
    .from(session_set_logs)
    .innerJoin(
      session_logs,
      eq(session_set_logs.session_log_id, session_logs.id)
    )
    .leftJoin(
      exercises_base,
      eq(session_set_logs.exercise_id, exercises_base.id)
    )
    .where(
      and(
        eq(session_logs.user_id, userId),
        ne(session_logs.sync_status, "deleted"),
        isNotNull(session_set_logs.weight_kg)
      )
    );

  const byExercise = new Map();
  for (const r of rows) {
    if (!r.weight_kg || r.weight_kg <= 0) continue;
    const e1rm = estimate1RM(r.weight_kg, r.reps);
    const prev = byExercise.get(r.exercise_id);
    if (!prev || e1rm > prev.e1rm) {
      byExercise.set(r.exercise_id, {
        exercise_id: r.exercise_id,
        name: r.name ?? "Ejercicio",
        muscle_group: r.muscle_group ?? null,
        weight_kg: r.weight_kg,
        reps: r.reps,
        e1rm: Math.round(e1rm * 10) / 10,
        completed_at: r.completed_at,
      });
    }
  }

  return Array.from(byExercise.values()).sort((a, b) => b.e1rm - a.e1rm);
};

export const usePersonalRecords = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["progress", "records", userId],
    enabled: !!userId,
    queryFn: () => fetchPersonalRecords(userId),
  });
};
