// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, eq, gte, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import {
  session_logs,
  session_set_logs,
  exercises_base,
} from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";

// Utilidades
import { lastNWeeks, weekKey } from "@gymtrack/core/format-date";

const WEEKS = 12;

// Deriva el progreso de entrenamiento de los últimos WEEKS períodos a partir de
// los logs locales (session_logs + session_set_logs), sin tablas nuevas:
//   - weeks: entrenamientos y volumen (Σ reps×peso) por semana
//   - muscleVolume: volumen acumulado por grupo muscular en la ventana
//   - totales para las stat tiles
// El volumen se agrega en JS (no en SQL) para no depender de expresiones
// aritméticas de Drizzle y mantener el hook simple.
export const fetchTrainingProgress = async (userId) => {
  const weeks = lastNWeeks(WEEKS);
  const since = weeks[0].start.toISOString();

  // Entrenamientos del rango (cabeceras): uno por session_log.
  const logs = await database
    .select({
      id: session_logs.id,
      completed_at: session_logs.completed_at,
    })
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, userId),
        ne(session_logs.sync_status, "deleted"),
        gte(session_logs.completed_at, since)
      )
    );

  // Series del rango, con la fecha del log y el grupo muscular del ejercicio.
  const sets = await database
    .select({
      completed_at: session_logs.completed_at,
      reps: session_set_logs.reps,
      weight_kg: session_set_logs.weight_kg,
      muscle_group: exercises_base.muscle_group,
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
        gte(session_logs.completed_at, since)
      )
    );

  // Inicializa los buckets por semana en el orden de `weeks`.
  const byWeek = new Map(weeks.map((w) => [w.key, { workouts: 0, volume: 0 }]));
  for (const log of logs) {
    const bucket = byWeek.get(weekKey(log.completed_at));
    if (bucket) bucket.workouts += 1;
  }

  const muscleVolume = new Map();
  let totalVolume = 0;
  for (const s of sets) {
    const vol = (s.reps || 0) * (s.weight_kg || 0);
    if (vol <= 0) continue;
    totalVolume += vol;
    const bucket = byWeek.get(weekKey(s.completed_at));
    if (bucket) bucket.volume += vol;
    const muscle = s.muscle_group || "Otros";
    muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + vol);
  }

  return {
    weeks: weeks.map((w) => ({
      key: w.key,
      label: w.label,
      workouts: byWeek.get(w.key).workouts,
      volume: Math.round(byWeek.get(w.key).volume),
    })),
    muscleVolume: Array.from(muscleVolume.entries())
      .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume),
    totalWorkouts: logs.length,
    totalVolume: Math.round(totalVolume),
  };
};

export const useTrainingProgress = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["progress", "training", userId],
    enabled: !!userId,
    queryFn: () => fetchTrainingProgress(userId),
  });
};
