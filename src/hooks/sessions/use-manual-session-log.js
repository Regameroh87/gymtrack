// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// Base de datos
import { database } from "../../database";
import { session_logs, session_set_logs } from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

// Registra manualmente un entrenamiento ya realizado. A diferencia de
// useSaveSessionLog (sesión guiada por un plan activo), acá el log no pertenece
// a un plan: plan_id / week_number / day_number quedan en null y el usuario
// elige la fecha (completed_at).
export const useCreateManualLog = () => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      completedAt,
      durationSeconds,
      exercises,
    }) => {
      const logId = Crypto.randomUUID();

      await database.insert(session_logs).values({
        id: logId,
        gym_id: GYM_ID,
        user_id: userId,
        session_id: sessionId ?? null,
        plan_id: null,
        week_number: null,
        day_number: null,
        duration_seconds: durationSeconds ?? null,
        completed_at: completedAt,
        sync_status: "pending",
      });

      // Numera las series por ejercicio descartando las que no tienen reps.
      const setRows = [];
      for (const exercise of exercises) {
        let setNumber = 0;
        for (const set of exercise.sets) {
          const reps = parseInt(set.reps, 10);
          if (!reps || reps < 1) continue;
          setNumber += 1;
          setRows.push({
            id: Crypto.randomUUID(),
            session_log_id: logId,
            exercise_id: exercise.exercise_id,
            set_number: setNumber,
            reps,
            weight_kg: parseFloat(set.weight) || null,
            notes: set.notes?.trim() || null,
            sync_status: "pending",
          });
        }
      }

      if (setRows.length > 0) {
        await database.insert(session_set_logs).values(setRows);
      }

      return logId;
    },
    onSuccess: () => {
      // Refresca el historial y el resumen del plan activo (el día que toca
      // se calcula a partir de los session_logs).
      queryClient.invalidateQueries({ queryKey: ["session_logs"] });
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
    },
  });
};

// Elimina un registro de entrenamiento. La cabecera se marca como "deleted"
// para que el sync borre la fila remota; las series locales se eliminan en
// duro porque el borrado remoto se resuelve por cascada (FK onDelete: cascade).
export const useDeleteSessionLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId) => {
      await database
        .update(session_logs)
        .set({ sync_status: "deleted", updated_at: new Date().toISOString() })
        .where(eq(session_logs.id, logId));

      await database
        .delete(session_set_logs)
        .where(eq(session_set_logs.session_log_id, logId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session_logs"] });
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
    },
  });
};
