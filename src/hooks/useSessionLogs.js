// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, count, countDistinct, desc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import {
  session_logs,
  session_set_logs,
  sessions,
  training_plans,
} from "../database/schemas";

// Hooks
import { useAuth } from "../auth/lib/getSession";

// Trae todos los entrenamientos registrados del usuario, ordenados del más
// reciente al más antiguo, con el nombre de la sesión / plan y un resumen de
// volumen (series + ejercicios distintos) calculado desde session_set_logs.
export const fetchSessionLogs = async (userId) => {
  // 1. Cabeceras de log + datos de sesión / plan asociados.
  const logs = await database
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
    })
    .from(session_logs)
    .leftJoin(sessions, eq(session_logs.session_id, sessions.id))
    .leftJoin(training_plans, eq(session_logs.plan_id, training_plans.id))
    .where(
      and(
        eq(session_logs.user_id, userId),
        ne(session_logs.sync_status, "deleted")
      )
    )
    .orderBy(desc(session_logs.completed_at));

  if (logs.length === 0) return [];

  // 2. Resumen de volumen por log en una sola consulta agrupada.
  const stats = await database
    .select({
      session_log_id: session_set_logs.session_log_id,
      set_count: count(session_set_logs.id),
      exercise_count: countDistinct(session_set_logs.exercise_id),
    })
    .from(session_set_logs)
    .innerJoin(
      session_logs,
      eq(session_set_logs.session_log_id, session_logs.id)
    )
    .where(eq(session_logs.user_id, userId))
    .groupBy(session_set_logs.session_log_id);

  const statsById = new Map(stats.map((s) => [s.session_log_id, s]));

  return logs.map((log) => ({
    ...log,
    set_count: statsById.get(log.id)?.set_count ?? 0,
    exercise_count: statsById.get(log.id)?.exercise_count ?? 0,
  }));
};

export const useSessionLogs = () => {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["session_logs", userId],
    enabled: !!userId,
    queryFn: () => fetchSessionLogs(userId),
  });
};
