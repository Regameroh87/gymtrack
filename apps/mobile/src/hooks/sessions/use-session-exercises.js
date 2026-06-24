// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, asc, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { exercises_base, session_exercises } from "../../database/schemas";

export const fetchSessionExercises = (sessionId) =>
  database
    .select({
      id: session_exercises.id,
      exercise_id: session_exercises.exercise_id,
      position: session_exercises.position,
      name: exercises_base.name,
      muscle_group: exercises_base.muscle_group,
      image_uri: exercises_base.image_uri,
    })
    .from(session_exercises)
    .innerJoin(
      exercises_base,
      eq(session_exercises.exercise_id, exercises_base.id)
    )
    .where(
      and(
        eq(session_exercises.session_id, sessionId),
        ne(session_exercises.sync_status, "deleted")
      )
    )
    .orderBy(asc(session_exercises.position));

export const useSessionExercises = (sessionId) =>
  useQuery({
    queryKey: ["session_exercises", sessionId],
    queryFn: () => fetchSessionExercises(sessionId),
    enabled: !!sessionId,
  });
