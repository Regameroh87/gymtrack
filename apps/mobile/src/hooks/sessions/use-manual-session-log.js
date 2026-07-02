// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// Base de datos
import { database } from "../../database";
import { session_logs, session_set_logs } from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";
import { writeWorkout } from "../../lib/health";

// Hooks
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

// Registra manualmente un entrenamiento ya realizado. A diferencia de
// useSaveSessionLog (sesión guiada por un plan activo), acá el log no pertenece
// a un plan: plan_id / week_number / day_number quedan en null y el usuario
// elige la fecha (completed_at).
export const useCreateManualLog = () => {
  const { userId } = useAuth();
  const { gymId } = useActiveGym();
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
        gym_id: gymId,
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
    onSuccess: (_data, variables) => {
      // Refresca el historial y el resumen del plan activo (el día que toca
      // se calcula a partir de los session_logs).
      queryClient.invalidateQueries({ queryKey: ["session_logs"] });
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      // Sube el log al toque si hay conexión; si no, queda pending para el próximo sync.
      checkNetInfoAndSync().catch((e) => console.error("Sync failed", e));
      // Registro en Apple Salud / Health Connect, best-effort: writeWorkout
      // nunca lanza y queda solo on-device (no requiere consentimiento de subida).
      const end = new Date(variables?.completedAt ?? Date.now());
      const start = new Date(
        end.getTime() - (variables?.durationSeconds ?? 0) * 1000
      );
      writeWorkout({ start, end });
    },
  });
};

// Elimina un registro de entrenamiento mediante soft-delete (tombstone): tanto la
// cabecera como sus series se marcan "deleted" con deleted_at seteado. El sync sube
// la marca al servidor (no un DELETE físico) para que el borrado sea durable entre
// dispositivos y no reaparezca por una copia "pending" en otro device. Ver el flujo
// de tombstones en src/database/sync.js (pullTableChanges / pushSessionLogsChanges).
export const useDeleteSessionLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId) => {
      const now = new Date().toISOString();

      await database
        .update(session_logs)
        .set({ sync_status: "deleted", deleted_at: now, updated_at: now })
        .where(eq(session_logs.id, logId));

      // Soft-delete de las series: ya no hay cascade físico que las baje del server
      // (el padre se conserva como tombstone), así que cada serie propaga su marca.
      await database
        .update(session_set_logs)
        .set({ sync_status: "deleted", deleted_at: now, updated_at: now })
        .where(eq(session_set_logs.session_log_id, logId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session_logs"] });
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      checkNetInfoAndSync().catch((e) => console.error("Sync failed", e));
    },
  });
};
