// Helpers puros de estructura de semanas/días para el builder de planes web.
// Port a TS de apps/mobile platform/catalog/_plan-week-helpers.js. Reimplementados
// (en vez de useTrainingPlanForm) porque ese módulo arrastra expo-sqlite/drizzle y el
// panel web no tiene SQLite. La forma del árbol es idéntica a la del builder mobile.
// Ver [[project_default_catalog]].

export type SetConfig = {
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
};

export type BuilderExercise = {
  id?: string;
  session_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_muscle_group: string;
  exercise_image_uri: string | null;
  position: number;
  prescription_mode: string;
  intensity_mode: string;
  rest_seconds?: number;
  rir: number | null;
  rpe: number | null;
  tempo: string;
  notes: string;
  set_configs: SetConfig[];
};

export type BuilderDay = {
  id: string;
  day_number: number;
  session_id: string | null;
  session_name: string | null;
  exercises: BuilderExercise[];
};

export type BuilderWeek = {
  id: string;
  week_number: number;
  days: BuilderDay[];
};

type SessionExerciseLike = {
  id: string;
  exercise_id: string;
  name: string;
  muscle_group?: string | null;
  image_uri?: string | null;
};

let _seq = 0;
// IDs efímeros solo de UI (React keys). El RPC genera los IDs reales en el server.
const uid = () => `tmp-${Date.now()}-${_seq++}`;

export const makeEmptyDay = (dayNumber: number): BuilderDay => ({
  id: uid(),
  day_number: dayNumber,
  session_id: null,
  session_name: null,
  exercises: [],
});

export const makeEmptyWeek = (
  weekNumber: number,
  weeklyDays: number
): BuilderWeek => ({
  id: uid(),
  week_number: weekNumber,
  days: Array.from({ length: weeklyDays }, (_, i) => makeEmptyDay(i + 1)),
});

export const buildEmptyWeeks = (
  durationWeeks: number,
  weeklyDays: number
): BuilderWeek[] =>
  Array.from({ length: durationWeeks }, (_, i) =>
    makeEmptyWeek(i + 1, weeklyDays)
  );

export const resizeWeeksByDuration = (
  currentWeeks: BuilderWeek[],
  newDuration: number,
  weeklyDays: number
): BuilderWeek[] => {
  if (newDuration === currentWeeks.length) return currentWeeks;
  if (newDuration > currentWeeks.length) {
    const extras = Array.from(
      { length: newDuration - currentWeeks.length },
      (_, i) => makeEmptyWeek(currentWeeks.length + i + 1, weeklyDays)
    );
    return [...currentWeeks, ...extras];
  }
  return currentWeeks.slice(0, newDuration);
};

export const resizeWeeksByWeeklyDays = (
  currentWeeks: BuilderWeek[],
  newWeeklyDays: number
): BuilderWeek[] =>
  currentWeeks.map((week) => {
    if (week.days.length === newWeeklyDays) return week;
    if (newWeeklyDays > week.days.length) {
      const extras = Array.from(
        { length: newWeeklyDays - week.days.length },
        (_, i) => makeEmptyDay(week.days.length + i + 1)
      );
      return { ...week, days: [...week.days, ...extras] };
    }
    return { ...week, days: week.days.slice(0, newWeeklyDays) };
  });

// Default de prescripción al asignar una sesión a un día: cada ejercicio arranca con
// 3 series de 8-12 reps. Espeja el default del builder mobile.
export const makePrescription = (
  sessionExercise: SessionExerciseLike,
  position: number
): BuilderExercise => ({
  id: uid(),
  session_exercise_id: sessionExercise.id,
  exercise_id: sessionExercise.exercise_id,
  exercise_name: sessionExercise.name,
  exercise_muscle_group: sessionExercise.muscle_group ?? "",
  exercise_image_uri: sessionExercise.image_uri ?? null,
  position,
  prescription_mode: "reps",
  intensity_mode: "none",
  rir: null,
  rpe: null,
  tempo: "",
  notes: "",
  set_configs: Array.from({ length: 3 }, () => ({
    reps_min: 8,
    reps_max: 12,
    weight_kg: null,
    duration_seconds: null,
    rest_seconds: 90,
  })),
});

export const makeEmptySet = (): SetConfig => ({
  reps_min: 8,
  reps_max: 12,
  weight_kg: null,
  duration_seconds: null,
  rest_seconds: 90,
});

// Reconstruye los días de cada semana a longitud weekly_days, ubicando los días
// guardados por su day_number y rellenando los faltantes. Se usa al hidratar para edición.
export const padLoadedWeeks = (
  weeks: { week_number: number; days: Omit<BuilderDay, "id">[] }[] | null,
  weeklyDays: number
): BuilderWeek[] =>
  (weeks ?? []).map((w) => {
    const byNum: Record<number, BuilderDay> = {};
    for (const d of w.days ?? [])
      byNum[d.day_number] = { id: uid(), ...d } as BuilderDay;
    const days = Array.from(
      { length: weeklyDays },
      (_, i) => byNum[i + 1] ?? makeEmptyDay(i + 1)
    );
    return { id: uid(), week_number: w.week_number, days };
  });
