import { useQuery } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

import { database } from "../../database";
import { custom_session_exercises, exercises_base } from "../../database/schemas";

export const fetchCustomSessionExercises = (sessionId) =>
  database
    .select({
      id: custom_session_exercises.id,
      exercise_id: custom_session_exercises.exercise_id,
      position: custom_session_exercises.position,
      name: exercises_base.name,
      muscle_group: exercises_base.muscle_group,
      image_uri: exercises_base.image_uri,
    })
    .from(custom_session_exercises)
    .leftJoin(
      exercises_base,
      eq(custom_session_exercises.exercise_id, exercises_base.id)
    )
    .where(eq(custom_session_exercises.session_id, sessionId))
    .orderBy(asc(custom_session_exercises.position));

export const useCustomSessionExercises = (sessionId) =>
  useQuery({
    queryKey: ["custom_session_exercises", sessionId],
    queryFn: () => fetchCustomSessionExercises(sessionId),
    enabled: !!sessionId,
  });
