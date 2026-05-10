// React
import { useEffect, useRef, useState } from "react";

// Librerías externas
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../database";
import { training_plan_days, training_plans } from "../database/schemas";
import { supabase } from "../database/supabase";
import { checkNetInfoAndSync } from "../database/sync";

const DRAFT_KEY = "training_plan_form_draft";

const makeEmptySlot = () => ({
  id: Crypto.randomUUID(),
  session_id: null,
  session_name: null,
});

export const useTrainingPlanForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();
  const saveTimerRef = useRef(null);
  // Edit mode skips draft entirely; new plan waits for AsyncStorage check
  const [isDraftLoaded, setIsDraftLoaded] = useState(!!id);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      objective: "",
      level: "",
      duration_weeks: 8,
      cover_image_uri: "",
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
            description: value.description?.trim() || null,
            objective: value.objective || null,
            level: value.level || null,
            duration_weeks: value.duration_weeks,
            cover_image_uri: value.cover_image_uri || null,
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
          description: value.description?.trim() || null,
          objective: value.objective || null,
          level: value.level || null,
          duration_weeks: value.duration_weeks,
          cover_image_uri: value.cover_image_uri || null,
          weekly_days: value.weekly_days,
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

        await AsyncStorage.removeItem(DRAFT_KEY);
      }

      queryClient.invalidateQueries({ queryKey: ["training_plans"] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: id ? "¡Plan actualizado!" : "¡Plan guardado!",
        text2: `"${value.name}" fue guardado correctamente.`,
        position: "bottom",
      });

      checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

      if (onSuccess) onSuccess();
    },
  });

  // Load draft on mount (new plans only)
  useEffect(() => {
    if (id) return;
    AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
      if (raw) {
        try {
          form.reset(JSON.parse(raw));
        } catch {}
      }
      setIsDraftLoaded(true);
    });
  }, []);

  // Save draft on value changes, debounced (new plans only)
  const values = useStore(form.store, (state) => state.values);
  useEffect(() => {
    if (!isDraftLoaded || id) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [values, isDraftLoaded]);

  return { form, isLoading: !isDraftLoaded };
};
