import { useEffect } from "react";

import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asc, eq, inArray, sql } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { database } from "../../database";
import {
  custom_sessions,
  custom_session_exercises,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
  custom_exercises,
  exercises_base,
} from "../../database/schemas";
import { supabase } from "../../database/supabase";
import { checkNetInfoAndSync } from "../../database/sync";

export const useCustomSessionForm = ({ id = null, onSuccess } = {}) => {
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
          await database.transaction(async (tx) => {
            const now = new Date().toISOString();

            await tx
              .update(custom_sessions)
              .set({
                name: value.name.trim(),
                description: value.description?.trim() || null,
                level: value.level || null,
                cover_image_uri: value.cover_image_uri || null,
                updated_at: now,
                sync_status: "pending",
              })
              .where(eq(custom_sessions.id, id));

            const existingSEs = await tx
              .select({
                id: custom_session_exercises.id,
                exercise_id: custom_session_exercises.exercise_id,
              })
              .from(custom_session_exercises)
              .where(eq(custom_session_exercises.session_id, id));

            const existingMap = new Map(
              existingSEs.map((se) => [se.exercise_id, se.id])
            );
            const newExerciseIds = new Set(
              value.exercises.map((ex) => ex.exercise_id)
            );

            const removedSEIds = existingSEs
              .filter((se) => !newExerciseIds.has(se.exercise_id))
              .map((se) => se.id);

            const newSEs = value.exercises.map((ex, idx) => ({
              id: existingMap.get(ex.exercise_id) ?? Crypto.randomUUID(),
              exercise_id: ex.exercise_id,
              exercise_source: ex.exercise_source ?? "base",
              position: idx,
              isNew: !existingMap.has(ex.exercise_id),
            }));

            const addedSEs = newSEs.filter((se) => se.isNew);

            if (removedSEIds.length) {
              const planExRows = await tx
                .select({ id: custom_plan_week_day_exercises.id })
                .from(custom_plan_week_day_exercises)
                .where(
                  inArray(
                    custom_plan_week_day_exercises.session_exercise_id,
                    removedSEIds
                  )
                );
              const planExIds = planExRows.map((r) => r.id);
              if (planExIds.length) {
                await tx
                  .delete(custom_plan_week_day_exercise_sets)
                  .where(
                    inArray(
                      custom_plan_week_day_exercise_sets.exercise_id,
                      planExIds
                    )
                  );
                await tx
                  .delete(custom_plan_week_day_exercises)
                  .where(inArray(custom_plan_week_day_exercises.id, planExIds));
              }
              await tx
                .delete(custom_session_exercises)
                .where(inArray(custom_session_exercises.id, removedSEIds));
            }

            for (const se of newSEs) {
              if (se.isNew) {
                await tx.insert(custom_session_exercises).values({
                  id: se.id,
                  user_id: userId,
                  session_id: id,
                  exercise_id: se.exercise_id,
                  position: se.position,
                  exercise_source: se.exercise_source ?? "base",
                });
              } else {
                await tx
                  .update(custom_session_exercises)
                  .set({ position: se.position })
                  .where(eq(custom_session_exercises.id, se.id));
              }
            }

            if (addedSEs.length) {
              const affectedDays = await tx
                .select({ id: custom_plan_week_days.id })
                .from(custom_plan_week_days)
                .where(eq(custom_plan_week_days.session_id, id));

              if (affectedDays.length) {
                const newPlanExRows = affectedDays.flatMap((day) =>
                  addedSEs.map((se) => ({
                    id: Crypto.randomUUID(),
                    user_id: userId,
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
                await tx
                  .insert(custom_plan_week_day_exercises)
                  .values(newPlanExRows);
              }
            }
          });

          queryClient.invalidateQueries({ queryKey: ["custom_sessions"] });
          queryClient.invalidateQueries({ queryKey: ["custom_session", id] });
        } else {
          const sessionId = Crypto.randomUUID();

          await database.insert(custom_sessions).values({
            id: sessionId,
            user_id: userId,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            level: value.level || null,
            cover_image_uri: value.cover_image_uri || null,
          });

          for (const [idx, ex] of value.exercises.entries()) {
            await database.insert(custom_session_exercises).values({
              id: Crypto.randomUUID(),
              user_id: userId,
              session_id: sessionId,
              exercise_id: ex.exercise_id,
              position: idx,
              exercise_source: ex.exercise_source ?? "base",
            });
          }

          queryClient.invalidateQueries({ queryKey: ["custom_sessions"] });
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
        console.error("Error al guardar sesión custom:", error);
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
    queryKey: ["custom_session_edit", id],
    enabled: !!id,
    queryFn: async () => {
      const [session] = await database
        .select()
        .from(custom_sessions)
        .where(eq(custom_sessions.id, id));

      if (!session) return null;

      // El display (nombre/músculo/imagen) puede venir de exercises_base o de
      // custom_exercises según exercise_source. Los ids son UUID únicos entre tablas,
      // así que resolvemos con coalesce sobre ambos leftJoin sin ramificar.
      const exercises = await database
        .select({
          id: custom_session_exercises.id,
          exercise_id: custom_session_exercises.exercise_id,
          exercise_source: custom_session_exercises.exercise_source,
          name: sql`coalesce(${exercises_base.name}, ${custom_exercises.name})`,
          muscle_group: sql`coalesce(${exercises_base.muscle_group}, ${custom_exercises.muscle_group})`,
          image_uri: sql`coalesce(${exercises_base.image_uri}, ${custom_exercises.image_uri})`,
        })
        .from(custom_session_exercises)
        .leftJoin(
          exercises_base,
          eq(custom_session_exercises.exercise_id, exercises_base.id)
        )
        .leftJoin(
          custom_exercises,
          eq(custom_session_exercises.exercise_id, custom_exercises.id)
        )
        .where(eq(custom_session_exercises.session_id, id))
        .orderBy(asc(custom_session_exercises.position));

      return {
        name: session.name ?? "",
        description: session.description ?? "",
        level: session.level ?? "",
        cover_image_uri: session.cover_image_uri ?? "",
        exercises: exercises.map((ex) => ({
          id: ex.id,
          exercise_id: ex.exercise_id,
          exercise_source: ex.exercise_source ?? "base",
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
