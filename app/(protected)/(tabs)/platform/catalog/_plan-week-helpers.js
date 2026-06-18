// Helpers puros de estructura de semanas/días para el builder de planes web.
// Reimplementados acá (en vez de importar use-training-plan-form.js) porque ese módulo
// arrastra expo-sqlite/drizzle en sus imports de tope, y el panel web no tiene SQLite.
// La forma del árbol es idéntica a la del builder mobile. Ver [[project_default_catalog]].

let _seq = 0;
// IDs efímeros solo de UI (React keys). El RPC genera los IDs reales en el server.
const uid = () => `tmp-${Date.now()}-${_seq++}`;

export const makeEmptyDay = (dayNumber) => ({
  id: uid(),
  day_number: dayNumber,
  session_id: null,
  session_name: null,
  exercises: [],
});

export const makeEmptyWeek = (weekNumber, weeklyDays) => ({
  id: uid(),
  week_number: weekNumber,
  days: Array.from({ length: weeklyDays }, (_, i) => makeEmptyDay(i + 1)),
});

export const buildEmptyWeeks = (durationWeeks, weeklyDays) =>
  Array.from({ length: durationWeeks }, (_, i) =>
    makeEmptyWeek(i + 1, weeklyDays)
  );

export const resizeWeeksByDuration = (
  currentWeeks,
  newDuration,
  weeklyDays
) => {
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

export const resizeWeeksByWeeklyDays = (currentWeeks, newWeeklyDays) =>
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

// Default de prescripción al asignar una sesión a un día: cada ejercicio de la sesión
// arranca con 3 series de 8-12 reps. Espeja el default del builder mobile.
export const makePrescription = (sessionExercise, position) => ({
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

export const makeEmptySet = () => ({
  reps_min: 8,
  reps_max: 12,
  weight_kg: null,
  duration_seconds: null,
  rest_seconds: 90,
});

// Reconstruye los días de cada semana a longitud weekly_days, ubicando los días
// guardados por su day_number y rellenando los faltantes (los días sin sesión no se
// persisten, así que vuelven vacíos). Se usa al hidratar un plan para edición.
export const padLoadedWeeks = (weeks, weeklyDays) =>
  (weeks ?? []).map((w) => {
    const byNum = {};
    for (const d of w.days ?? []) byNum[d.day_number] = { id: uid(), ...d };
    const days = Array.from(
      { length: weeklyDays },
      (_, i) => byNum[i + 1] ?? makeEmptyDay(i + 1)
    );
    return { id: uid(), week_number: w.week_number, days };
  });
