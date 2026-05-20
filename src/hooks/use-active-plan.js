// React / libs
import { useQuery } from "@tanstack/react-query";
import { eq, and, asc, inArray } from "drizzle-orm";

// DB
import { database } from "../database";
import {
  plan_assignments,
  training_plans,
  plan_weeks,
  plan_week_days,
  plan_week_day_exercises,
  plan_week_day_exercise_sets,
  session_exercises,
  exercises_base,
  sessions,
} from "../database/schemas";

// Hooks
import { useAuth } from "../auth/lib/getSession";

// Arma el plan activo del usuario con semanas/días/ejercicios/series anidados.
// Devuelve null si el usuario no tiene asignación activa.
export const fetchActivePlan = async (userId) => {
  // 1. Asignación activa + plan
  const [row] = await database
    .select({
      assignment_id: plan_assignments.id,
      plan_id: plan_assignments.plan_id,
      start_date: plan_assignments.start_date,
      end_date: plan_assignments.end_date,
      status: plan_assignments.status,
      plan_name: training_plans.name,
      plan_description: training_plans.description,
      plan_objective: training_plans.objective,
      plan_level: training_plans.level,
      plan_weekly_days: training_plans.weekly_days,
      plan_duration_weeks: training_plans.duration_weeks,
      plan_cover: training_plans.cover_image_uri,
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

  // 2. Semanas del plan
  const weeks = await database
    .select({
      id: plan_weeks.id,
      week_number: plan_weeks.week_number,
    })
    .from(plan_weeks)
    .where(eq(plan_weeks.plan_id, row.plan_id))
    .orderBy(asc(plan_weeks.week_number));

  const weekIds = weeks.map((w) => w.id);

  // 3. Días de esas semanas
  const days = weekIds.length
    ? await database
        .select({
          id: plan_week_days.id,
          week_id: plan_week_days.week_id,
          day_number: plan_week_days.day_number,
          session_id: plan_week_days.session_id,
          session_name: sessions.name,
          session_description: sessions.description,
          session_level: sessions.level,
          session_cover: sessions.cover_image_uri,
        })
        .from(plan_week_days)
        .leftJoin(sessions, eq(plan_week_days.session_id, sessions.id))
        .where(inArray(plan_week_days.week_id, weekIds))
        .orderBy(asc(plan_week_days.day_number))
    : [];

  const dayIds = days.map((d) => d.id);

  // 4. Ejercicios de esos días (con datos del ejercicio base)
  const exercises = dayIds.length
    ? await database
        .select({
          id: plan_week_day_exercises.id,
          week_day_id: plan_week_day_exercises.week_day_id,
          position: plan_week_day_exercises.position,
          prescription_mode: plan_week_day_exercises.prescription_mode,
          rest_seconds: plan_week_day_exercises.rest_seconds,
          intensity_mode: plan_week_day_exercises.intensity_mode,
          tempo: plan_week_day_exercises.tempo,
          notes: plan_week_day_exercises.notes,
          exercise_name: exercises_base.name,
          exercise_category: exercises_base.category,
          exercise_muscle_group: exercises_base.muscle_group,
          exercise_image: exercises_base.image_uri,
          exercise_video_url: exercises_base.youtube_video_url,
          exercise_instructions: exercises_base.instructions,
          exercise_is_unilateral: exercises_base.is_unilateral,
        })
        .from(plan_week_day_exercises)
        .innerJoin(
          session_exercises,
          eq(plan_week_day_exercises.session_exercise_id, session_exercises.id)
        )
        .innerJoin(
          exercises_base,
          eq(session_exercises.exercise_id, exercises_base.id)
        )
        .where(inArray(plan_week_day_exercises.week_day_id, dayIds))
        .orderBy(asc(plan_week_day_exercises.position))
    : [];

  const exerciseIds = exercises.map((e) => e.id);

  // 5. Series de esos ejercicios
  const sets = exerciseIds.length
    ? await database
        .select()
        .from(plan_week_day_exercise_sets)
        .where(inArray(plan_week_day_exercise_sets.exercise_id, exerciseIds))
        .orderBy(asc(plan_week_day_exercise_sets.set_number))
    : [];

  // 6. Anidar de abajo hacia arriba
  const setsByExercise = groupBy(sets, "exercise_id");

  const exercisesWithSets = exercises.map((e) => ({
    id: e.id,
    week_day_id: e.week_day_id,
    position: e.position,
    prescription_mode: e.prescription_mode,
    rest_seconds: e.rest_seconds,
    intensity_mode: e.intensity_mode,
    tempo: e.tempo,
    notes: e.notes,
    exercise: {
      name: e.exercise_name,
      category: e.exercise_category,
      muscle_group: e.exercise_muscle_group,
      image_uri: e.exercise_image,
      youtube_video_url: e.exercise_video_url,
      instructions: e.exercise_instructions,
      is_unilateral: e.exercise_is_unilateral,
    },
    sets: setsByExercise[e.id] ?? [],
  }));

  const exercisesByDay = groupBy(exercisesWithSets, "week_day_id");

  const daysWithExercises = days.map((d) => ({
    id: d.id,
    week_id: d.week_id,
    day_number: d.day_number,
    session: d.session_id
      ? {
          id: d.session_id,
          name: d.session_name,
          description: d.session_description,
          level: d.session_level,
          cover_image_uri: d.session_cover,
        }
      : null,
    exercises: exercisesByDay[d.id] ?? [],
  }));

  const daysByWeek = groupBy(daysWithExercises, "week_id");

  return {
    assignment: {
      id: row.assignment_id,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
    },
    plan: {
      id: row.plan_id,
      name: row.plan_name,
      description: row.plan_description,
      objective: row.plan_objective,
      level: row.plan_level,
      weekly_days: row.plan_weekly_days,
      duration_weeks: row.plan_duration_weeks,
      cover_image_uri: row.plan_cover,
    },
    weeks: weeks.map((w) => ({
      id: w.id,
      week_number: w.week_number,
      days: daysByWeek[w.id] ?? [],
    })),
  };
};

const groupBy = (rows, key) =>
  rows.reduce((acc, row) => {
    (acc[row[key]] ??= []).push(row);
    return acc;
  }, {});

export const useActivePlan = () => {
  const { userId } = useAuth();

  return useQuery({
    // Comparte prefijo con ["plan_assignments"]: assign/drop lo invalidan
    queryKey: ["plan_assignments", "active", userId],
    enabled: !!userId,
    queryFn: () => fetchActivePlan(userId),
  });
};
