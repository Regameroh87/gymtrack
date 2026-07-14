// React / libs
import { useQuery } from "@tanstack/react-query";
import { and, asc, eq, inArray, ne } from "drizzle-orm";

// DB
import { database } from "../../database";
import {
  plan_week_day_exercises,
  plan_week_day_exercise_sets,
  session_exercises,
  exercises_base,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
  custom_session_exercises,
  custom_exercises,
} from "../../database/schemas";

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
      base_exercise_id: exercises_base.id,
      exercise_name: exercises_base.name,
      exercise_muscle: exercises_base.muscle_group,
      exercise_instructions: exercises_base.instructions,
      image_uri: exercises_base.image_uri,
      video_uri: exercises_base.video_uri,
      youtube_video_url: exercises_base.youtube_video_url,
      is_unilateral: exercises_base.is_unilateral,
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

// Variante custom: lee de las tablas custom_plan_week_day_*. El ejercicio base
// se resuelve vía custom_session_exercises (o session_exercises si la sesión
// del día es del gym), apuntando a exercises_base o a custom_exercises según
// exercise_source (ids UUID únicos entre tablas).
export const fetchCustomPlanDayExercises = async (weekDayId) => {
  if (!weekDayId) return [];

  // 1. Ejercicios prescritos del día (sin resolver el base todavía)
  const rows = await database
    .select({
      id: custom_plan_week_day_exercises.id,
      position: custom_plan_week_day_exercises.position,
      prescription_mode: custom_plan_week_day_exercises.prescription_mode,
      rest_seconds: custom_plan_week_day_exercises.rest_seconds,
      intensity_mode: custom_plan_week_day_exercises.intensity_mode,
      tempo: custom_plan_week_day_exercises.tempo,
      notes: custom_plan_week_day_exercises.notes,
      session_exercise_id: custom_plan_week_day_exercises.session_exercise_id,
    })
    .from(custom_plan_week_day_exercises)
    .where(
      and(
        eq(custom_plan_week_day_exercises.week_day_id, weekDayId),
        ne(custom_plan_week_day_exercises.sync_status, "deleted")
      )
    )
    .orderBy(asc(custom_plan_week_day_exercises.position));

  if (!rows.length) return [];

  // 2. Resolver el exercise_id base desde custom_session_exercises o
  //    session_exercises (según de dónde venga la sesión del día).
  const sessionExIds = rows.map((r) => r.session_exercise_id).filter(Boolean);
  const baseIdBySessionEx = {};

  if (sessionExIds.length) {
    const customSE = await database
      .select({
        id: custom_session_exercises.id,
        exercise_id: custom_session_exercises.exercise_id,
      })
      .from(custom_session_exercises)
      .where(inArray(custom_session_exercises.id, sessionExIds));
    customSE.forEach((r) => {
      baseIdBySessionEx[r.id] = r.exercise_id;
    });

    const gymSE = await database
      .select({
        id: session_exercises.id,
        exercise_id: session_exercises.exercise_id,
      })
      .from(session_exercises)
      .where(inArray(session_exercises.id, sessionExIds));
    gymSE.forEach((r) => {
      if (!baseIdBySessionEx[r.id]) baseIdBySessionEx[r.id] = r.exercise_id;
    });
  }

  // 3. Datos del ejercicio base: puede vivir en exercises_base o en custom_exercises
  // (ejercicio propio del usuario), según de dónde salió al armar la sesión/plan.
  const baseIds = [
    ...new Set(Object.values(baseIdBySessionEx).filter(Boolean)),
  ];
  const baseById = {};
  if (baseIds.length) {
    const baseRows = await database
      .select({
        id: exercises_base.id,
        name: exercises_base.name,
        muscle_group: exercises_base.muscle_group,
        instructions: exercises_base.instructions,
        image_uri: exercises_base.image_uri,
        video_uri: exercises_base.video_uri,
        youtube_video_url: exercises_base.youtube_video_url,
        is_unilateral: exercises_base.is_unilateral,
      })
      .from(exercises_base)
      .where(inArray(exercises_base.id, baseIds));
    baseRows.forEach((b) => {
      baseById[b.id] = b;
    });

    const customRows = await database
      .select({
        id: custom_exercises.id,
        name: custom_exercises.name,
        muscle_group: custom_exercises.muscle_group,
        instructions: custom_exercises.instructions,
        image_uri: custom_exercises.image_uri,
        video_uri: custom_exercises.video_uri,
        youtube_video_url: custom_exercises.youtube_video_url,
        is_unilateral: custom_exercises.is_unilateral,
      })
      .from(custom_exercises)
      .where(inArray(custom_exercises.id, baseIds));
    customRows.forEach((b) => {
      if (!baseById[b.id]) baseById[b.id] = b;
    });
  }

  // 4. Series
  const exIds = rows.map((r) => r.id);
  const sets = await database
    .select()
    .from(custom_plan_week_day_exercise_sets)
    .where(inArray(custom_plan_week_day_exercise_sets.exercise_id, exIds))
    .orderBy(asc(custom_plan_week_day_exercise_sets.set_number));

  const setsByExercise = sets.reduce((acc, s) => {
    (acc[s.exercise_id] ??= []).push(s);
    return acc;
  }, {});

  // 5. Normalizar a la forma que espera la pantalla de sesión
  return rows
    .map((r) => {
      const baseId = baseIdBySessionEx[r.session_exercise_id];
      const base = baseId ? baseById[baseId] : null;
      if (!base) return null; // ejercicio sin base resuelto: fuera de scope
      return {
        id: r.id,
        position: r.position,
        prescription_mode: r.prescription_mode,
        rest_seconds: r.rest_seconds,
        intensity_mode: r.intensity_mode,
        tempo: r.tempo,
        notes: r.notes,
        base_exercise_id: base.id,
        exercise_name: base.name,
        exercise_muscle: base.muscle_group,
        exercise_instructions: base.instructions,
        image_uri: base.image_uri,
        video_uri: base.video_uri,
        youtube_video_url: base.youtube_video_url,
        is_unilateral: base.is_unilateral,
        sets: setsByExercise[r.id] ?? [],
      };
    })
    .filter(Boolean);
};

export const usePlanDayExercises = (weekDayId, isCustom = false) => {
  return useQuery({
    queryKey: [
      "plan_week_days",
      weekDayId ?? null,
      "exercises",
      isCustom ? "custom" : "gym",
    ],
    enabled: !!weekDayId,
    queryFn: () =>
      isCustom
        ? fetchCustomPlanDayExercises(weekDayId)
        : fetchPlanDayExercises(weekDayId),
  });
};
