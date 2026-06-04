// React / libs
import { useQuery } from "@tanstack/react-query";
import { and, count, desc, eq, ne } from "drizzle-orm";

// DB
import { database } from "../../database";
import {
  plan_assignments,
  training_plans,
  plan_weeks,
  plan_week_days,
  plan_week_day_exercises,
  sessions,
  session_logs,
  custom_plans,
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_sessions,
} from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";

// Resuelve solo lo que el home necesita: el plan activo + el día que toca
// según el progreso registrado en session_logs. Soporta tanto planes del gym
// (training_plans) como planes custom (custom_plans): la asignación activa
// distingue por custom_plan_id. Devuelve la misma forma en ambos casos, más un
// flag isCustom para que los hooks aguas abajo (día/ejercicios, guardar log)
// sepan de qué tablas leer/escribir. Devuelve null si no hay asignación activa.

// Calcula qué semana/día toca a partir del último log registrado del plan.
//   sin logs => semana 1, día 1; con logs => último log + 1, rotando de semana.
const resolveTarget = (lastLog, weeklyDays, durationWeeks) => {
  const isIndefinite = durationWeeks === 0;
  let targetWeek = 1;
  let targetDay = 1;
  if (lastLog) {
    targetWeek = lastLog.week_number;
    targetDay = lastLog.day_number + 1;
    if (targetDay > weeklyDays) {
      if (isIndefinite) {
        targetWeek = 1;
        targetDay = 1;
      } else {
        targetWeek += 1;
        targetDay = 1;
      }
    }
  }
  const isCompleted = !isIndefinite && targetWeek > durationWeeks;
  return { targetWeek, targetDay, isCompleted };
};

// Esqueleto común del summary (la card del home espera esta forma exacta).
const buildSummary = (assignment, plan, planId, isCustom, isCompleted) => ({
  assignment: {
    id: assignment.assignment_id,
    start_date: assignment.start_date,
    end_date: assignment.end_date,
    status: assignment.status,
  },
  plan: {
    id: planId,
    name: plan.name,
    objective: plan.objective,
    level: plan.level,
    cover_image_uri: plan.cover_image_uri,
    weekly_days: plan.weekly_days,
    duration_weeks: plan.duration_weeks,
  },
  isCustom,
  isCompleted,
  currentDay: null,
});

// ── Plan del gym (training_plans) ──────────────────────────────────────────
const fetchGymPlanSummary = async (userId, assignment) => {
  const planId = assignment.plan_id;

  const [plan] = await database
    .select({
      name: training_plans.name,
      objective: training_plans.objective,
      level: training_plans.level,
      cover_image_uri: training_plans.cover_image_uri,
      weekly_days: training_plans.weekly_days,
      duration_weeks: training_plans.duration_weeks,
    })
    .from(training_plans)
    .where(eq(training_plans.id, planId));

  if (!plan) return null;

  const [lastLog] = await database
    .select({
      week_number: session_logs.week_number,
      day_number: session_logs.day_number,
    })
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, userId),
        eq(session_logs.plan_id, planId),
        ne(session_logs.sync_status, "deleted")
      )
    )
    .orderBy(desc(session_logs.completed_at))
    .limit(1);

  const { targetWeek, targetDay, isCompleted } = resolveTarget(
    lastLog,
    plan.weekly_days,
    plan.duration_weeks
  );

  const summary = buildSummary(assignment, plan, planId, false, isCompleted);
  if (isCompleted) return summary;

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
        eq(plan_weeks.plan_id, planId),
        eq(plan_weeks.week_number, targetWeek),
        eq(plan_week_days.day_number, targetDay)
      )
    );

  if (!day) return summary; // el plan no tiene ese día definido

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

// ── Plan custom (custom_plans) ─────────────────────────────────────────────
const fetchCustomPlanSummary = async (userId, assignment) => {
  const customPlanId = assignment.custom_plan_id;

  const [plan] = await database
    .select({
      name: custom_plans.name,
      objective: custom_plans.objective,
      level: custom_plans.level,
      cover_image_uri: custom_plans.cover_image_uri,
      weekly_days: custom_plans.weekly_days,
      duration_weeks: custom_plans.duration_weeks,
    })
    .from(custom_plans)
    .where(eq(custom_plans.id, customPlanId));

  if (!plan) return null;

  const [lastLog] = await database
    .select({
      week_number: session_logs.week_number,
      day_number: session_logs.day_number,
    })
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, userId),
        eq(session_logs.custom_plan_id, customPlanId),
        ne(session_logs.sync_status, "deleted")
      )
    )
    .orderBy(desc(session_logs.completed_at))
    .limit(1);

  const { targetWeek, targetDay, isCompleted } = resolveTarget(
    lastLog,
    plan.weekly_days,
    plan.duration_weeks
  );

  const summary = buildSummary(
    assignment,
    plan,
    customPlanId,
    true,
    isCompleted
  );
  if (isCompleted) return summary;

  const [day] = await database
    .select({
      id: custom_plan_week_days.id,
      day_number: custom_plan_week_days.day_number,
      week_number: custom_plan_weeks.week_number,
      session_id: custom_plan_week_days.session_id,
    })
    .from(custom_plan_week_days)
    .innerJoin(
      custom_plan_weeks,
      eq(custom_plan_week_days.week_id, custom_plan_weeks.id)
    )
    .where(
      and(
        eq(custom_plan_weeks.plan_id, customPlanId),
        eq(custom_plan_weeks.week_number, targetWeek),
        eq(custom_plan_week_days.day_number, targetDay),
        ne(custom_plan_week_days.sync_status, "deleted")
      )
    );

  if (!day) return summary; // el plan no tiene ese día definido

  // La sesión del día puede ser del gym (sessions) o custom (custom_sessions).
  let session = null;
  if (day.session_id) {
    const [gymSession] = await database
      .select({
        id: sessions.id,
        name: sessions.name,
        description: sessions.description,
        level: sessions.level,
        cover_image_uri: sessions.cover_image_uri,
      })
      .from(sessions)
      .where(eq(sessions.id, day.session_id));

    if (gymSession) {
      session = gymSession;
    } else {
      const [customSession] = await database
        .select({
          id: custom_sessions.id,
          name: custom_sessions.name,
          description: custom_sessions.description,
          level: custom_sessions.level,
          cover_image_uri: custom_sessions.cover_image_uri,
        })
        .from(custom_sessions)
        .where(eq(custom_sessions.id, day.session_id));
      session = customSession ?? null;
    }
  }

  const [{ value: exerciseCount }] = await database
    .select({ value: count() })
    .from(custom_plan_week_day_exercises)
    .where(
      and(
        eq(custom_plan_week_day_exercises.week_day_id, day.id),
        ne(custom_plan_week_day_exercises.sync_status, "deleted")
      )
    );

  summary.currentDay = {
    id: day.id,
    week_number: day.week_number,
    day_number: day.day_number,
    exercise_count: exerciseCount ?? 0,
    session,
  };

  return summary;
};

export const fetchActivePlanSummary = async (userId) => {
  // Asignación activa (puede apuntar a un plan del gym o a uno custom)
  const [assignment] = await database
    .select({
      assignment_id: plan_assignments.id,
      plan_id: plan_assignments.plan_id,
      custom_plan_id: plan_assignments.custom_plan_id,
      start_date: plan_assignments.start_date,
      end_date: plan_assignments.end_date,
      status: plan_assignments.status,
    })
    .from(plan_assignments)
    .where(
      and(
        eq(plan_assignments.user_id, userId),
        eq(plan_assignments.status, "active")
      )
    );

  if (!assignment) return null;

  return assignment.custom_plan_id
    ? fetchCustomPlanSummary(userId, assignment)
    : fetchGymPlanSummary(userId, assignment);
};

export const useActivePlanSummary = () => {
  const { userId } = useAuth();

  return useQuery({
    // Comparte prefijo con ["plan_assignments"]: assign/drop/follow lo invalidan.
    // OJO: al registrar un session_log hay que invalidar esta key a mano
    // para que el día avance (el log no toca plan_assignments).
    queryKey: ["plan_assignments", "active", "summary", userId],
    enabled: !!userId,
    queryFn: () => fetchActivePlanSummary(userId),
  });
};
