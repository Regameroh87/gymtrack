import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { database } from "../../database";
import { session_logs, session_set_logs } from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

export const useSaveSessionLog = () => {
  const { userId } = useAuth();
  const { gymId } = useActiveGym();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      summary,
      currentDay,
      session,
      completedSets,
      setData,
      elapsed,
    }) => {
      const logId = Crypto.randomUUID();

      await database.insert(session_logs).values({
        id: logId,
        gym_id: gymId,
        user_id: userId,
        // session_id referencia sessions (del gym). En planes custom la sesión
        // del día puede ser custom, así que lo dejamos null para no violar la FK:
        // el log igual queda identificado por custom_plan_id + week/day.
        session_id: summary.isCustom ? null : (currentDay.session?.id ?? null),
        plan_id: summary.isCustom ? null : summary.plan.id,
        custom_plan_id: summary.isCustom ? summary.plan.id : null,
        week_number: currentDay.week_number,
        day_number: currentDay.day_number,
        duration_seconds: elapsed,
        sync_status: "pending",
      });

      const setLogRows = [];
      const setCountByExercise = {};
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          const key = `${exercise.id}-${set.id}`;
          if (!completedSets.has(key)) continue;
          const data = setData[key] ?? {};
          const baseId = exercise.base_exercise_id;
          const reps =
            parseInt(data.reps, 10) || (set.reps_max ?? set.reps_min ?? 1);
          setCountByExercise[baseId] = (setCountByExercise[baseId] ?? 0) + 1;
          setLogRows.push({
            id: Crypto.randomUUID(),
            session_log_id: logId,
            exercise_id: baseId,
            set_number: setCountByExercise[baseId],
            reps,
            weight_kg: parseFloat(data.weight) || set.weight_kg || null,
            notes: data.notes?.trim() || null,
            sync_status: "pending",
          });
        }
      }

      if (setLogRows.length > 0) {
        await database.insert(session_set_logs).values(setLogRows);
      }

      return logId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session_logs", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["plan_assignments", "active", "summary", userId],
      });
      queryClient.invalidateQueries({ queryKey: ["active_session_draft"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "¡Sesión guardada!",
        text2: "Tu entrenamiento quedó registrado.",
        position: "bottom",
      });
      // Sube el log al toque si hay conexión (igual que el resto de los flujos de
      // escritura); si no, queda pending para el próximo sync.
      checkNetInfoAndSync().catch((e) => console.error("Sync failed", e));
    },
  });
};
