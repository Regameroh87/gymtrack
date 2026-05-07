// Librerías externas
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../database";
import { training_plan_days, training_plans } from "../database/schemas";
import { supabase } from "../supabase/client";

const makeEmptySlot = () => ({
  id: Crypto.randomUUID(),
  session_id: null,
  session_name: null,
});

export const useTrainingPlanForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      objective: "",
      weekly_days: 3,
      days: [makeEmptySlot(), makeEmptySlot(), makeEmptySlot()],
    },
    onSubmit: async ({ value }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const now = new Date().toISOString();

      if (id) {
        await database
          .update(training_plans)
          .set({
            name: value.name.trim(),
            objective: value.objective || null,
            weekly_days: value.weekly_days,
            updated_at: now,
            sync_status: "pending",
          })
          .where(eq(training_plans.id, id));

        await database
          .delete(training_plan_days)
          .where(eq(training_plan_days.plan_id, id));

        const editedDayRows = value.days.map((slot, idx) => ({
          id: slot.id,
          plan_id: id,
          day_number: idx + 1,
          session_id: slot.session_id,
          created_at: now,
          updated_at: now,
          sync_status: "pending",
        }));
        await database.insert(training_plan_days).values(editedDayRows);
      } else {
        const planId = Crypto.randomUUID();

        await database.insert(training_plans).values({
          id: planId,
          name: value.name.trim(),
          objective: value.objective || null,
          weekly_days: value.weekly_days,
          kind: "template",
          status: "draft",
          created_by: userId,
          created_at: now,
          updated_at: now,
          sync_status: "pending",
        });

        const dayRows = value.days.map((slot, idx) => ({
          id: slot.id,
          plan_id: planId,
          day_number: idx + 1,
          session_id: slot.session_id,
          created_at: now,
          updated_at: now,
          sync_status: "pending",
        }));

        await database.insert(training_plan_days).values(dayRows);
      }

      queryClient.invalidateQueries({ queryKey: ["training_plans"] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: id ? "¡Plan actualizado!" : "¡Plan guardado!",
        text2: `"${value.name}" fue guardado correctamente.`,
        position: "bottom",
      });

      if (onSuccess) onSuccess();
    },
  });

  return { form, isLoading: false };
};
