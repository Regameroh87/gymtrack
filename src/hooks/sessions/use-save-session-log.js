import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { database } from "../../database";
import { session_logs, session_set_logs } from "../../database/schemas";
import { useAuth } from "../../auth/lib/getSession";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

export const useSaveSessionLog = () => {
  const { userId } = useAuth();
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
        gym_id: GYM_ID,
        user_id: userId,
        session_id: currentDay.session?.id ?? null,
        plan_id: summary.plan.id,
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "¡Sesión guardada!",
        text2: "Tu entrenamiento quedó registrado.",
        position: "bottom",
      });
    },
  });
};
