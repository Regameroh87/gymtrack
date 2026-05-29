// React
import { useEffect } from "react";

// Librerías externas
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asc, eq, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../../database";
import {
  exercises_base,
  plan_week_day_exercise_sets,
  plan_week_day_exercises,
  plan_week_days,
  session_exercises,
  sessions,
} from "../../database/schemas";
import { supabase } from "../../database/supabase";
import { checkNetInfoAndSync } from "../../database/sync";

// Constantes
const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;


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
          await database.transaction(async (tx) => {
            const now = new Date().toISOString();

            await tx
              .update(sessions)
              .set({
                name: value.name.trim(),
                description: value.description?.trim() || null,
                level: value.level || null,
                cover_image_uri: value.cover_image_uri || null,
                updated_at: now,
                sync_status: "pending",
              })
              .where(eq(sessions.id, id));

            // Preservar IDs existentes para no romper FKs en plan_week_day_exercises
            const existingSEs = await tx
              .select({ id: session_exercises.id, exercise_id: session_exercises.exercise_id })
              .from(session_exercises)
              .where(eq(session_exercises.session_id, id));

            const existingMap = new Map(existingSEs.map((se) => [se.exercise_id, se.id]));
            const newExerciseIds = new Set(value.exercises.map((ex) => ex.exercise_id));

            const removedSEIds = existingSEs
              .filter((se) => !newExerciseIds.has(se.exercise_id))
              .map((se) => se.id);

            const newSEs = value.exercises.map((ex, idx) => ({
              id: existingMap.get(ex.exercise_id) ?? Crypto.randomUUID(),
              exercise_id: ex.exercise_id,
              position: idx,
              isNew: !existingMap.has(ex.exercise_id),
            }));

            const addedSEs = newSEs.filter((se) => se.isNew);

            // Borrar ejercicios removidos: cascada a plan_week_day_exercises y sus sets
            if (removedSEIds.length) {
              const planExRows = await tx
                .select({ id: plan_week_day_exercises.id })
                .from(plan_week_day_exercises)
                .where(inArray(plan_week_day_exercises.session_exercise_id, removedSEIds));
              const planExIds = planExRows.map((r) => r.id);
              if (planExIds.length) {
                await tx
                  .delete(plan_week_day_exercise_sets)
                  .where(inArray(plan_week_day_exercise_sets.exercise_id, planExIds));
                await tx
                  .delete(plan_week_day_exercises)
                  .where(inArray(plan_week_day_exercises.id, planExIds));
              }
              await tx
                .delete(session_exercises)
                .where(inArray(session_exercises.id, removedSEIds));
            }

            // Upsert: actualizar posición de existentes, insertar nuevos
            for (const se of newSEs) {
              if (se.isNew) {
                await tx.insert(session_exercises).values({
                  id: se.id,
                  session_id: id,
                  exercise_id: se.exercise_id,
                  position: se.position,
                });
              } else {
                await tx
                  .update(session_exercises)
                  .set({ position: se.position })
                  .where(eq(session_exercises.id, se.id));
              }
            }

            // Sincronizar ejercicios nuevos a todos los plan_week_days que usan esta sesión
            if (addedSEs.length) {
              const affectedDays = await tx
                .select({ id: plan_week_days.id })
                .from(plan_week_days)
                .where(eq(plan_week_days.session_id, id));

              if (affectedDays.length) {
                const newPlanExRows = affectedDays.flatMap((day) =>
                  addedSEs.map((se) => ({
                    id: Crypto.randomUUID(),
                    week_day_id: day.id,
                    session_exercise_id: se.id,
                    position: se.position,
                    prescription_mode: "reps",
                    rest_seconds: 90,
                    intensity_mode: "none",
                    tempo: null,
                    notes: null,
                    created_at: now,
                    updated_at: now,
                    sync_status: "pending",
                  }))
                );
                await tx.insert(plan_week_day_exercises).values(newPlanExRows);
              }
            }
          });

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
