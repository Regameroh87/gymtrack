// React
import { useEffect } from "react";

// Librerías externas
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, asc } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../database";
import {
  routines,
  routine_exercises,
  exercises_base,
} from "../database/schemas";
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

const str = (v) => (v === null || v === undefined ? "" : String(v));

export const useRoutineForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      objective: "",
      level: "",
      estimated_duration_min: "",
      cover_image_uri: "",
      status: "borrador",
      exercises: [],
    },
    onSubmit: async ({ value }) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        if (id) {
          // ── EDICIÓN ──
          await database
            .update(routines)
            .set({
              name: value.name.trim(),
              description: value.description?.trim() || null,
              objective: value.objective || null,
              level: value.level || null,
              estimated_duration_min: parseIntOrNull(
                value.estimated_duration_min
              ),
              cover_image_uri: value.cover_image_uri || null,
              status: value.status,
              updated_at: new Date().toISOString(),
              sync_status: "pending",
            })
            .where(eq(routines.id, id));

          await database
            .delete(routine_exercises)
            .where(eq(routine_exercises.routine_id, id));

          for (const [idx, ex] of value.exercises.entries()) {
            await database.insert(routine_exercises).values({
              id: Crypto.randomUUID(),
              routine_id: id,
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
            });
          }

          queryClient.invalidateQueries({ queryKey: ["routines"] });
          queryClient.invalidateQueries({ queryKey: ["routine", id] });
        } else {
          // ── CREACIÓN ──
          const routineId = Crypto.randomUUID();

          await database.insert(routines).values({
            id: routineId,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            objective: value.objective || null,
            level: value.level || null,
            estimated_duration_min: parseIntOrNull(
              value.estimated_duration_min
            ),
            cover_image_uri: value.cover_image_uri || null,
            status: value.status,
            created_by: userId,
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
            });
          }

          queryClient.invalidateQueries({ queryKey: ["routines"] });
          form.reset();
        }

        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: id ? "¡Rutina actualizada!" : "¡Rutina guardada!",
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

  const { data: editData, isLoading } = useQuery({
    queryKey: ["routine", id],
    enabled: !!id,
    queryFn: async () => {
      const [routine] = await database
        .select()
        .from(routines)
        .where(eq(routines.id, id));

      if (!routine) return null;

      const exercises = await database
        .select({
          id: routine_exercises.id,
          exercise_id: routine_exercises.exercise_id,
          sets: routine_exercises.sets,
          prescription_mode: routine_exercises.prescription_mode,
          reps_min: routine_exercises.reps_min,
          reps_max: routine_exercises.reps_max,
          duration_seconds: routine_exercises.duration_seconds,
          weight_kg: routine_exercises.weight_kg,
          rest_seconds: routine_exercises.rest_seconds,
          intensity_mode: routine_exercises.intensity_mode,
          rir: routine_exercises.rir,
          rpe: routine_exercises.rpe,
          tempo: routine_exercises.tempo,
          notes: routine_exercises.notes,
          name: exercises_base.name,
          muscle_group: exercises_base.muscle_group,
          image_uri: exercises_base.image_uri,
        })
        .from(routine_exercises)
        .innerJoin(
          exercises_base,
          eq(routine_exercises.exercise_id, exercises_base.id)
        )
        .where(eq(routine_exercises.routine_id, id))
        .orderBy(asc(routine_exercises.position));

      return {
        name: routine.name ?? "",
        description: routine.description ?? "",
        objective: routine.objective ?? "",
        level: routine.level ?? "",
        estimated_duration_min: str(routine.estimated_duration_min),
        cover_image_uri: routine.cover_image_uri ?? "",
        status: routine.status ?? "borrador",
        exercises: exercises.map((ex) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          image_uri: ex.image_uri,
          sets: str(ex.sets),
          prescription_mode: ex.prescription_mode ?? "reps",
          reps_min: str(ex.reps_min),
          reps_max: str(ex.reps_max),
          duration_seconds: str(ex.duration_seconds),
          weight_kg: str(ex.weight_kg),
          rest_seconds: str(ex.rest_seconds),
          intensity_mode: ex.intensity_mode ?? "none",
          rir: str(ex.rir),
          rpe: str(ex.rpe),
          tempo: ex.tempo ?? "",
          notes: ex.notes ?? "",
        })),
      };
    },
  });

  useEffect(() => {
    if (!editData) return;
    form.setFieldValue("name", editData.name, { touch: false });
    form.setFieldValue("description", editData.description, { touch: false });
    form.setFieldValue("objective", editData.objective, { touch: false });
    form.setFieldValue("level", editData.level, { touch: false });
    form.setFieldValue(
      "estimated_duration_min",
      editData.estimated_duration_min,
      { touch: false }
    );
    form.setFieldValue("cover_image_uri", editData.cover_image_uri, {
      touch: false,
    });
    form.setFieldValue("status", editData.status, { touch: false });
    form.setFieldValue("exercises", editData.exercises, { touch: false });
  }, [editData, form]);

  return { form, isLoading: !!id && isLoading };
};
