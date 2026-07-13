import * as Crypto from "expo-crypto";

import { database } from "../database";
import { custom_sessions, custom_session_exercises } from "../database/schemas";

// Crea una copia de una sesión gym como custom_session, incluyendo los ejercicios
// ya presentes en el día del plan más uno nuevo. Devuelve el ID de la sesión creada.
export async function forkSession(
  userId,
  sessionName,
  currentExercises,
  newExercise
) {
  const customSessionId = Crypto.randomUUID();
  const now = new Date().toISOString();

  await database.transaction(async (tx) => {
    await tx.insert(custom_sessions).values({
      id: customSessionId,
      user_id: userId,
      name: sessionName,
      sync_status: "pending",
      created_at: now,
      updated_at: now,
    });

    const allExercises = [...currentExercises, newExercise];
    for (const [idx, ex] of allExercises.entries()) {
      await tx.insert(custom_session_exercises).values({
        id: Crypto.randomUUID(),
        user_id: userId,
        session_id: customSessionId,
        exercise_id: ex.exercise_id,
        position: idx,
        exercise_source: ex.exercise_source ?? "base",
        sync_status: "pending",
        created_at: now,
        updated_at: now,
      });
    }
  });

  return customSessionId;
}
