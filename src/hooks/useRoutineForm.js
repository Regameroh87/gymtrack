// Librerías externas
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../database";
import { routines, routine_exercises } from "../database/schemas";
import { supabase } from "../database/supabase";
import { checkNetInfoAndSync } from "../database/sync";

const parseIntOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};

const parseFloatOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export const useRoutineForm = ({ onSuccess, initialValues = {} } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      objective: initialValues.objective ?? "",
      level: initialValues.level ?? "",
      estimated_duration_min: initialValues.estimated_duration_min ?? "",
      cover_image_uri: initialValues.cover_image_uri ?? "",
      status: initialValues.status ?? "borrador",
      exercises: initialValues.exercises ?? [],
    },
    onSubmit: async ({ value }) => {
      try {
        const routineId = Crypto.randomUUID();
        const now = new Date().toISOString();

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        await database.insert(routines).values({
          id: routineId,
          name: value.name.trim(),
          description: value.description?.trim() || null,
          objective: value.objective || null,
          level: value.level || null,
          estimated_duration_min: parseIntOrNull(value.estimated_duration_min),
          cover_image_uri: value.cover_image_uri || null,
          status: value.status,
          created_by: userId,
          created_at: now,
          updated_at: now,
          sync_status: "pending",
        });

        for (const [idx, ex] of value.exercises.entries()) {
          await database.insert(routine_exercises).values({
            id: Crypto.randomUUID(),
            routine_id: routineId,
            exercise_id: ex.exercise_id,
            position: idx,
            sets: parseIntOrNull(ex.sets) ?? 3,
            prescription_mode: ex.prescription_mode,
            reps_min: parseIntOrNull(ex.reps_min),
            reps_max: parseIntOrNull(ex.reps_max),
            duration_seconds: parseIntOrNull(ex.duration_seconds),
            weight_kg: parseFloatOrNull(ex.weight_kg),
            rest_seconds: parseIntOrNull(ex.rest_seconds),
            intensity_mode: ex.intensity_mode,
            rir: parseIntOrNull(ex.rir),
            rpe: parseFloatOrNull(ex.rpe),
            tempo: ex.tempo?.trim() || null,
            notes: ex.notes?.trim() || null,
            created_at: now,
            updated_at: now,
            sync_status: "pending",
          });
        }

        queryClient.invalidateQueries({ queryKey: ["routines"] });

        checkNetInfoAndSync(["routines", "routine_exercises"]).catch((err) =>
          console.error("Sync failed", err)
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Rutina guardada!",
          text2: `"${value.name}" fue guardada como ${value.status}.`,
          position: "bottom",
        });

        if (onSuccess) onSuccess();
      } catch (error) {
        console.error("Error al guardar rutina:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error al guardar",
          text2: error.message,
          position: "bottom",
        });
        throw error;
      }
    },
  });

  return form;
};
