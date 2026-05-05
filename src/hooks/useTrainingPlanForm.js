// React
import { useEffect } from "react";

// Librerías externas
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../database";
import { routines, training_plan_days, training_plans } from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";
import { supabase } from "../database/supabase";

export const useTrainingPlanForm = ({ id = null, kind, ownerUserId = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      objective: "",
      level: "",
      cover_image_uri: "",
      status: "active",
      // [{ id, routine_id, routine_name, routine_objective }]
      days: [],
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
            .update(training_plans)
            .set({
              name: value.name.trim(),
              description: value.description?.trim() || null,
              objective: value.objective || null,
              level: value.level || null,
              cover_image_uri: value.cover_image_uri || null,
              status: value.status,
              updated_at: new Date().toISOString(),
              sync_status: "pending",
            })
            .where(eq(training_plans.id, id));

          await database
            .delete(training_plan_days)
            .where(eq(training_plan_days.plan_id, id));

          for (const [idx, day] of value.days.entries()) {
            await database.insert(training_plan_days).values({
              id: Crypto.randomUUID(),
              plan_id: id,
              day_number: idx + 1,
              routine_id: day.routine_id,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["training_plans"] });
          queryClient.invalidateQueries({ queryKey: ["training_plan", id] });
        } else {
          // ── CREACIÓN ──
          const planId = Crypto.randomUUID();

          await database.insert(training_plans).values({
            id: planId,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            objective: value.objective || null,
            level: value.level || null,
            cover_image_uri: value.cover_image_uri || null,
            kind: kind ?? "template",
            owner_user_id: ownerUserId,
            created_by: userId,
            status: value.status,
          });

          for (const [idx, day] of value.days.entries()) {
            await database.insert(training_plan_days).values({
              id: Crypto.randomUUID(),
              plan_id: planId,
              day_number: idx + 1,
              routine_id: day.routine_id,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["training_plans"] });
          form.reset();
        }

        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: id ? "¡Plan actualizado!" : "¡Plan guardado!",
          text2: `"${value.name}" fue guardado correctamente.`,
          position: "bottom",
        });

        if (onSuccess) onSuccess();
      } catch (error) {
        console.error("Error al guardar plan:", error);
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
    queryKey: ["training_plan", id],
    enabled: !!id,
    queryFn: async () => {
      const [plan] = await database
        .select()
        .from(training_plans)
        .where(eq(training_plans.id, id));

      if (!plan) return null;

      const days = await database
        .select({
          id: training_plan_days.id,
          routine_id: training_plan_days.routine_id,
          routine_name: routines.name,
          routine_objective: routines.objective,
        })
        .from(training_plan_days)
        .innerJoin(routines, eq(training_plan_days.routine_id, routines.id))
        .where(eq(training_plan_days.plan_id, id))
        .orderBy(asc(training_plan_days.day_number));

      return {
        name: plan.name ?? "",
        description: plan.description ?? "",
        objective: plan.objective ?? "",
        level: plan.level ?? "",
        cover_image_uri: plan.cover_image_uri ?? "",
        status: plan.status ?? "active",
        days,
      };
    },
  });

  useEffect(() => {
    if (!editData) return;
    form.setFieldValue("name", editData.name, { touch: false });
    form.setFieldValue("description", editData.description, { touch: false });
    form.setFieldValue("objective", editData.objective, { touch: false });
    form.setFieldValue("level", editData.level, { touch: false });
    form.setFieldValue("cover_image_uri", editData.cover_image_uri, { touch: false });
    form.setFieldValue("status", editData.status, { touch: false });
    form.setFieldValue("days", editData.days, { touch: false });
  }, [editData, form]);

  return { form, isLoading: !!id && isLoading };
};
