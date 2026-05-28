// React / libs
import { useQuery } from "@tanstack/react-query";
import { and, count, desc, eq } from "drizzle-orm";

// DB
import { database } from "../database";
import {
  plan_assignments,
  training_plans,
  plan_weeks,
  plan_week_days,
  plan_week_day_exercises,
  sessions,
  session_logs,
} from "../database/schemas";

// Hooks
import { useAuth } from "../auth/lib/getSession";

// Resuelve solo lo que el home necesita: el plan activo + el día que toca
// según el progreso registrado en session_logs. No arma el árbol completo
// del plan (eso lo hace fetchActivePlan, reservado para la pantalla de detalle).
// Devuelve null si el usuario no tiene asignación activa.
export const fetchActivePlanSummary = async (userId) => {
  // 1. Asignación activa + plan
  const [row] = await database
    .select({
      assignment_id: plan_assignments.id,
      plan_id: plan_assignments.plan_id,
      start_date: plan_assignments.start_date,
      end_date: plan_assignments.end_date,
      status: plan_assignments.status,
      plan_name: training_plans.name,
      plan_objective: training_plans.objective,
      plan_level: training_plans.level,
      plan_cover: training_plans.cover_image_uri,
      plan_weekly_days: training_plans.weekly_days,
      plan_duration_weeks: training_plans.duration_weeks,
    })
    .from(plan_assignments)
    .leftJoin(training_plans, eq(plan_assignments.plan_id, training_plans.id))
    .where(
      and(
        eq(plan_assignments.user_id, userId),
        eq(plan_assignments.status, "active")
      )
    );

  if (!row) return null;

  // 2. Último entrenamiento registrado de este plan
  const [lastLog] = await database
    .select({
      week_number: session_logs.week_number,
      day_number: session_logs.day_number,
    })
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, userId),
        eq(session_logs.plan_id, row.plan_id)
      )
    )
    .orderBy(desc(session_logs.completed_at))
    .limit(1);

  // 3. Calcular qué semana/día toca:
  //    sin logs => semana 1, día 1; con logs => último log + 1.
  const isIndefinite = row.plan_duration_weeks === 0;
  let targetWeek = 1;
  let targetDay = 1;
  if (lastLog) {
    targetWeek = lastLog.week_number;
    targetDay = lastLog.day_number + 1;
    if (targetDay > row.plan_weekly_days) {
      if (isIndefinite) {
        targetWeek = 1;
        targetDay = 1;
      } else {
        targetWeek += 1;
        targetDay = 1;
      }
    }
  }

  const isCompleted = !isIndefinite && targetWeek > row.plan_duration_weeks;

  const summary = {
    assignment: {
      id: row.assignment_id,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
    },
    plan: {
      id: row.plan_id,
      name: row.plan_name,
      objective: row.plan_objective,
      level: row.plan_level,
      cover_image_uri: row.plan_cover,
      weekly_days: row.plan_weekly_days,
      duration_weeks: row.plan_duration_weeks,
    },
    isCompleted,
    currentDay: null,
  };

  if (isCompleted) return summary;

  // 4. El día puntual que toca + su sesión
  const [day] = await database
    .select({
      id: plan_week_days.id,
      day_number: plan_week_days.day_number,
      week_number: plan_weeks.week_number,
      session_id: plan_week_days.session_id,
      session_name: sessions.name,
      session_description: sessions.description,
      session_level: sessions.level,
      session_cover: sessions.cover_image_uri,
    })
    .from(plan_week_days)
    .innerJoin(plan_weeks, eq(plan_week_days.week_id, plan_weeks.id))
    .leftJoin(sessions, eq(plan_week_days.session_id, sessions.id))
    .where(
      and(
        eq(plan_weeks.plan_id, row.plan_id),
        eq(plan_weeks.week_number, targetWeek),
        eq(plan_week_days.day_number, targetDay)
      )
    );

  if (!day) return summary; // el plan no tiene ese día definido

  // 5. Conteo de ejercicios de ese día
  const [{ value: exerciseCount }] = await database
    .select({ value: count() })
    .from(plan_week_day_exercises)
    .where(eq(plan_week_day_exercises.week_day_id, day.id));

  summary.currentDay = {
    id: day.id,
    week_number: day.week_number,
    day_number: day.day_number,
    exercise_count: exerciseCount ?? 0,
    session: day.session_id
      ? {
          id: day.session_id,
          name: day.session_name,
          description: day.session_description,
          level: day.session_level,
          cover_image_uri: day.session_cover,
        }
      : null,
  };

  return summary;
};

export const useActivePlanSummary = () => {
  const { userId } = useAuth();

  return useQuery({
    // Comparte prefijo con ["plan_assignments"]: assign/drop lo invalidan.
    // OJO: al registrar un session_log hay que invalidar esta key a mano
    // para que el día avance (el log no toca plan_assignments).
    queryKey: ["plan_assignments", "active", "summary", userId],
    enabled: !!userId,
    queryFn: () => fetchActivePlanSummary(userId),
  });
};
