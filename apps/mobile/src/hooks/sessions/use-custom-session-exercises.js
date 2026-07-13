import { useQuery } from "@tanstack/react-query";
import { asc, eq, sql } from "drizzle-orm";

import { database } from "../../database";
import {
  custom_session_exercises,
  custom_exercises,
  exercises_base,
} from "../../database/schemas";

// El display se resuelve con coalesce sobre exercises_base y custom_exercises según
// exercise_source (ids UUID únicos entre tablas). Sin esto, una sesión con ejercicios
// propios se copiaría al día del plan sin nombre/imagen.
export const fetchCustomSessionExercises = (sessionId) =>
  database
    .select({
      id: custom_session_exercises.id,
      exercise_id: custom_session_exercises.exercise_id,
      exercise_source: custom_session_exercises.exercise_source,
      position: custom_session_exercises.position,
      name: sql`coalesce(${exercises_base.name}, ${custom_exercises.name})`,
      muscle_group: sql`coalesce(${exercises_base.muscle_group}, ${custom_exercises.muscle_group})`,
      image_uri: sql`coalesce(${exercises_base.image_uri}, ${custom_exercises.image_uri})`,
    })
    .from(custom_session_exercises)
    .leftJoin(
      exercises_base,
      eq(custom_session_exercises.exercise_id, exercises_base.id)
    )
    .leftJoin(
      custom_exercises,
      eq(custom_session_exercises.exercise_id, custom_exercises.id)
    )
    .where(eq(custom_session_exercises.session_id, sessionId))
    .orderBy(asc(custom_session_exercises.position));

export const useCustomSessionExercises = (sessionId) =>
  useQuery({
    queryKey: ["custom_session_exercises", sessionId],
    queryFn: () => fetchCustomSessionExercises(sessionId),
    enabled: !!sessionId,
  });
