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
  sessions,
  session_exercises,
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
            .update(sessions)
            .set({
              name: value.name.trim(),
              description: value.description?.trim() || null,
              objective: value.objective || null,
              level: value.level || null,
              estimated_duration_min: parseIntOrNull(
                value.estimated_duration_min
              ),
              cover_image_uri: value.cover_image_uri || null,
              updated_at: new Date().toISOString(),
              sync_status: "pending",
            })
            .where(eq(sessions.id, id));

          await database
            .delete(session_exercises)
            .where(eq(session_exercises.session_id, id));

          for (const [idx, ex] of value.exercises.entries()) {
            await database.insert(session_exercises).values({
              id: Crypto.randomUUID(),
              session_id: id,
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

          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({ queryKey: ["session", id] });
        } else {
          // ── CREACIÓN ──
          const sessionId = Crypto.randomUUID();

          await database.insert(sessions).values({
            id: sessionId,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            objective: value.objective || null,
            level: value.level || null,
            estimated_duration_min: parseIntOrNull(
              value.estimated_duration_min
            ),
            cover_image_uri: value.cover_image_uri || null,
            created_by: userId,
          });

          for (const [idx, ex] of value.exercises.entries()) {
            await database.insert(session_exercises).values({
              id: Crypto.randomUUID(),
              session_id: sessionId,
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

          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          form.reset();
        }

        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: id ? "¡Sesión actualizada!" : "¡Sesión guardada!",
          text2: `"${value.name}" fue guardada correctamente.`,
          position: "bottom",
        });

        if (onSuccess) onSuccess();
      } catch (error) {
        console.error("Error al guardar sesión:", error);
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
    queryKey: ["session", id],
    enabled: !!id,
    queryFn: async () => {
      const [session] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.id, id));

      if (!session) return null;

      const exercises = await database
        .select({
          id: session_exercises.id,
          exercise_id: session_exercises.exercise_id,
          sets: session_exercises.sets,
          prescription_mode: session_exercises.prescription_mode,
          reps_min: session_exercises.reps_min,
          reps_max: session_exercises.reps_max,
          duration_seconds: session_exercises.duration_seconds,
          weight_kg: session_exercises.weight_kg,
          rest_seconds: session_exercises.rest_seconds,
          intensity_mode: session_exercises.intensity_mode,
          rir: session_exercises.rir,
          rpe: session_exercises.rpe,
          tempo: session_exercises.tempo,
          notes: session_exercises.notes,
          name: exercises_base.name,
          muscle_group: exercises_base.muscle_group,
          image_uri: exercises_base.image_uri,
        })
        .from(session_exercises)
        .innerJoin(
          exercises_base,
          eq(session_exercises.exercise_id, exercises_base.id)
        )
        .where(eq(session_exercises.session_id, id))
        .orderBy(asc(session_exercises.position));

      return {
        name: session.name ?? "",
        description: session.description ?? "",
        objective: session.objective ?? "",
        level: session.level ?? "",
        estimated_duration_min: str(session.estimated_duration_min),
        cover_image_uri: session.cover_image_uri ?? "",
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
    form.setFieldValue("exercises", editData.exercises, { touch: false });
  }, [editData, form]);

  return { form, isLoading: !!id && isLoading };
};
