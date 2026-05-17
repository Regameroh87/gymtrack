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

// Constantes
const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

const str = (v) => (v === null || v === undefined ? "" : String(v));

export const useSessionForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      level: "",
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
              level: value.level || null,
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
            });
          }

          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          queryClient.invalidateQueries({ queryKey: ["session", id] });
        } else {
          // ── CREACIÓN ──
          const sessionId = Crypto.randomUUID();

          await database.insert(sessions).values({
            id: sessionId,
            gym_id: GYM_ID,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            level: value.level || null,
            cover_image_uri: value.cover_image_uri || null,
            created_by: userId,
          });

          for (const [idx, ex] of value.exercises.entries()) {
            await database.insert(session_exercises).values({
              id: Crypto.randomUUID(),
              session_id: sessionId,
              exercise_id: ex.exercise_id,
              position: idx,
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
    queryKey: ["session-edit", id],
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
        level: session.level ?? "",
        cover_image_uri: session.cover_image_uri ?? "",
        exercises: exercises.map((ex) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          image_uri: ex.image_uri,
        })),
      };
    },
  });

  useEffect(() => {
    if (!editData) return;
    form.reset({ ...editData, exercises: editData.exercises ?? [] });
  }, [editData, form]);

  return { form, isLoading: !!id && isLoading };
};
