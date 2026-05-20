// React / libs
import { useQuery } from "@tanstack/react-query";
import { asc, eq, inArray } from "drizzle-orm";

// DB
import { database } from "../database";
import {
  plan_week_day_exercises,
  plan_week_day_exercise_sets,
  session_exercises,
  exercises_base,
} from "../database/schemas";

// Trae los ejercicios prescritos de un día del plan (plan_week_day) con sus
// series anidadas. weekDayId proviene de currentDay.id de useActivePlanSummary.
// Cada ejercicio sale con los campos que espera SessionExerciseRow
// (exercise_name, exercise_muscle, image_uri, video_uri, youtube_video_url)
// más la prescripción (prescription_mode, rest_seconds, sets...).
export const fetchPlanDayExercises = async (weekDayId) => {
  if (!weekDayId) return [];

  // 1. Ejercicios del día + datos del ejercicio base
  const exercises = await database
    .select({
      id: plan_week_day_exercises.id,
      position: plan_week_day_exercises.position,
      prescription_mode: plan_week_day_exercises.prescription_mode,
      rest_seconds: plan_week_day_exercises.rest_seconds,
      intensity_mode: plan_week_day_exercises.intensity_mode,
      tempo: plan_week_day_exercises.tempo,
      notes: plan_week_day_exercises.notes,
      exercise_name: exercises_base.name,
      exercise_muscle: exercises_base.muscle_group,
      exercise_instructions: exercises_base.instructions,
      image_uri: exercises_base.image_uri,
      video_uri: exercises_base.video_uri,
      youtube_video_url: exercises_base.youtube_video_url,
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
    .where(eq(plan_week_day_exercises.week_day_id, weekDayId))
    .orderBy(asc(plan_week_day_exercises.position));

  if (!exercises.length) return [];

  const exerciseIds = exercises.map((e) => e.id);

  // 2. Series de esos ejercicios (una sola query con inArray)
  const sets = await database
    .select()
    .from(plan_week_day_exercise_sets)
    .where(inArray(plan_week_day_exercise_sets.exercise_id, exerciseIds))
    .orderBy(asc(plan_week_day_exercise_sets.set_number));

  const setsByExercise = sets.reduce((acc, s) => {
    (acc[s.exercise_id] ??= []).push(s);
    return acc;
  }, {});

  return exercises.map((e) => ({
    ...e,
    sets: setsByExercise[e.id] ?? [],
  }));
};

export const usePlanDayExercises = (weekDayId) => {
  return useQuery({
    queryKey: ["plan_week_days", weekDayId ?? null, "exercises"],
    enabled: !!weekDayId,
    queryFn: () => fetchPlanDayExercises(weekDayId),
  });
};
