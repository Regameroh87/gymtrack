// React
import { useEffect, useMemo, useRef, useState } from "react";

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
import { training_plans } from "../database/schemas";
import { supabase } from "../database/supabase";
import { checkNetInfoAndSync } from "../database/sync";

const DRAFT_KEY = "training_plan_form_draft";

const DEFAULT_DURATION_WEEKS = 8;
const DEFAULT_WEEKLY_DAYS = 3;

const makeEmptyDay = (dayNumber) => ({
  id: Crypto.randomUUID(),
  day_number: dayNumber,
  session_id: null,
  session_name: null,
});

const makeEmptyWeek = (weekNumber, weeklyDays) => ({
  id: Crypto.randomUUID(),
  week_number: weekNumber,
  days: Array.from({ length: weeklyDays }, (_, i) => makeEmptyDay(i + 1)),
});

export const buildEmptyWeeks = (durationWeeks, weeklyDays) =>
  Array.from({ length: durationWeeks }, (_, i) =>
    makeEmptyWeek(i + 1, weeklyDays)
  );

export const resizeWeeksByDuration = (
  currentWeeks,
  newDuration,
  weeklyDays
) => {
  if (newDuration === currentWeeks.length) return currentWeeks;
  if (newDuration > currentWeeks.length) {
    const extras = Array.from(
      { length: newDuration - currentWeeks.length },
      (_, i) => makeEmptyWeek(currentWeeks.length + i + 1, weeklyDays)
    );
    return [...currentWeeks, ...extras];
  }
  return currentWeeks.slice(0, newDuration);
};

export const resizeWeeksByWeeklyDays = (currentWeeks, newWeeklyDays) =>
  currentWeeks.map((week) => {
    if (week.days.length === newWeeklyDays) return week;
    if (newWeeklyDays > week.days.length) {
      const extras = Array.from(
        { length: newWeeklyDays - week.days.length },
        (_, i) => makeEmptyDay(week.days.length + i + 1)
      );
      return { ...week, days: [...week.days, ...extras] };
    }
    return { ...week, days: week.days.slice(0, newWeeklyDays) };
  });

export const useTrainingPlanForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();
  const saveTimerRef = useRef(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(!!id);

  const defaultValues = useMemo(
    () => ({
      name: "",
      description: "",
      objective: "",
      level: "",
      duration_weeks: DEFAULT_DURATION_WEEKS,
      cover_image_uri: "",
      weekly_days: DEFAULT_WEEKLY_DAYS,
      weeks: buildEmptyWeeks(DEFAULT_DURATION_WEEKS, DEFAULT_WEEKLY_DAYS),
    }),
    []
  );

  const form = useForm({
    defaultValues,
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

        // TODO: persistir value.weeks → training_plan_days + training_plan_day_exercises
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

        // TODO: persistir value.weeks → training_plan_days + training_plan_day_exercises

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
