import { useEffect, useMemo, useRef, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { asc, eq, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { database } from "../database";
import {
  custom_plans,
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
  custom_sessions,
  custom_session_exercises,
  exercises_base,
} from "../database/schemas";
import { supabase } from "../database/supabase";
import { checkNetInfoAndSync } from "../database/sync";

// Re-export helpers shared with FormTrainingPlan
export { buildEmptyWeeks, resizeWeeksByDuration, resizeWeeksByWeeklyDays } from "./useTrainingPlanForm";

const DRAFT_KEY = "custom_training_plan_form_draft";
const DEFAULT_DURATION_WEEKS = 0;
const DEFAULT_WEEKLY_DAYS = 3;

const makeEmptyDay = (dayNumber) => ({
  id: Crypto.randomUUID(),
  day_number: dayNumber,
  session_id: null,
  session_name: null,
  exercises: [],
});

const makeEmptyWeek = (weekNumber, weeklyDays) => ({
  id: Crypto.randomUUID(),
  week_number: weekNumber,
  days: Array.from({ length: weeklyDays }, (_, i) => makeEmptyDay(i + 1)),
});

const buildEmptyWeeksLocal = (durationWeeks, weeklyDays) =>
  Array.from({ length: durationWeeks }, (_, i) =>
    makeEmptyWeek(i + 1, weeklyDays)
  );

const persistCustomWeeks = async (planId, userId, weeks, now, db = database) => {
  const weeksRows = [];
  const daysRows = [];
  const exercisesRows = [];
  const setsRows = [];

  for (const week of weeks) {
    weeksRows.push({
      id: week.id,
      user_id: userId,
      plan_id: planId,
      week_number: week.week_number,
      created_at: now,
      updated_at: now,
      sync_status: "pending",
    });

    for (const day of week.days) {
      if (!day.session_id) continue;

      daysRows.push({
        id: day.id,
        user_id: userId,
        week_id: week.id,
        day_number: day.day_number,
        session_id: day.session_id,
        created_at: now,
        updated_at: now,
        sync_status: "pending",
      });

      for (const ex of day.exercises) {
        const configs = ex.set_configs ?? [];
        const restSeconds = configs[0]?.rest_seconds ?? ex.rest_seconds ?? 90;

        exercisesRows.push({
          id: ex.id,
          user_id: userId,
          week_day_id: day.id,
          session_exercise_id: ex.session_exercise_id,
          position: ex.position,
          prescription_mode: ex.prescription_mode,
          rest_seconds: restSeconds,
          intensity_mode: ex.intensity_mode,
          tempo: ex.tempo || null,
          notes: ex.notes || null,
          created_at: now,
          updated_at: now,
          sync_status: "pending",
        });

        for (let s = 0; s < configs.length; s++) {
          const cfg = configs[s];
          setsRows.push({
            id: cfg.id ?? Crypto.randomUUID(),
            user_id: userId,
            exercise_id: ex.id,
            set_number: s + 1,
            reps_min: cfg.reps_min ?? null,
            reps_max: cfg.reps_max ?? null,
            weight_kg: cfg.weight_kg ?? null,
            duration_seconds: cfg.duration_seconds ?? null,
            rir: ex.rir ?? null,
            rpe: ex.rpe ?? null,
            created_at: now,
            updated_at: now,
            sync_status: "pending",
          });
        }
      }
    }
  }

  if (weeksRows.length) await db.insert(custom_plan_weeks).values(weeksRows);
  if (daysRows.length) await db.insert(custom_plan_week_days).values(daysRows);
  if (exercisesRows.length) await db.insert(custom_plan_week_day_exercises).values(exercisesRows);
  if (setsRows.length) await db.insert(custom_plan_week_day_exercise_sets).values(setsRows);
};

export const useCustomTrainingPlanForm = ({ id = null, onSuccess } = {}) => {
  const queryClient = useQueryClient();
  const saveTimerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const defaultValues = useMemo(
    () => ({
      name: "",
      description: "",
      objective: "",
      level: "",
      duration_weeks: DEFAULT_DURATION_WEEKS,
      cover_image_uri: "",
      weekly_days: DEFAULT_WEEKLY_DAYS,
      weeks: buildEmptyWeeksLocal(
        DEFAULT_DURATION_WEEKS === 0 ? 1 : DEFAULT_DURATION_WEEKS,
        DEFAULT_WEEKLY_DAYS
      ),
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
        await database.transaction(async (tx) => {
          await tx
            .update(custom_plans)
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
            .where(eq(custom_plans.id, id));

          const oldWeekRows = await tx
            .select({ id: custom_plan_weeks.id })
            .from(custom_plan_weeks)
            .where(eq(custom_plan_weeks.plan_id, id));
          const oldWeekIds = oldWeekRows.map((w) => w.id);

          if (oldWeekIds.length) {
            const oldDayRows = await tx
              .select({ id: custom_plan_week_days.id })
              .from(custom_plan_week_days)
              .where(inArray(custom_plan_week_days.week_id, oldWeekIds));
            const oldDayIds = oldDayRows.map((d) => d.id);

            if (oldDayIds.length) {
              const oldExRows = await tx
                .select({ id: custom_plan_week_day_exercises.id })
                .from(custom_plan_week_day_exercises)
                .where(inArray(custom_plan_week_day_exercises.week_day_id, oldDayIds));
              const oldExIds = oldExRows.map((e) => e.id);

              if (oldExIds.length) {
                await tx
                  .delete(custom_plan_week_day_exercise_sets)
                  .where(inArray(custom_plan_week_day_exercise_sets.exercise_id, oldExIds));
              }
              await tx
                .delete(custom_plan_week_day_exercises)
                .where(inArray(custom_plan_week_day_exercises.week_day_id, oldDayIds));
            }
            await tx
              .delete(custom_plan_week_days)
              .where(inArray(custom_plan_week_days.week_id, oldWeekIds));
          }
          await tx.delete(custom_plan_weeks).where(eq(custom_plan_weeks.plan_id, id));
          await persistCustomWeeks(id, userId, value.weeks, now, tx);
        });
      } else {
        const planId = Crypto.randomUUID();

        await database.transaction(async (tx) => {
          await tx.insert(custom_plans).values({
            id: planId,
            user_id: userId,
            name: value.name.trim(),
            description: value.description?.trim() || null,
            objective: value.objective || null,
            level: value.level || null,
            duration_weeks: value.duration_weeks,
            cover_image_uri: value.cover_image_uri || null,
            weekly_days: value.weekly_days,
            created_at: now,
            updated_at: now,
            sync_status: "pending",
          });

          await persistCustomWeeks(planId, userId, value.weeks, now, tx);
        });

        await AsyncStorage.removeItem(DRAFT_KEY);
      }

      queryClient.invalidateQueries({ queryKey: ["custom_plans"] });

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
    let cancelled = false;
    if (id) {
      setIsLoading(true);

      (async () => {
        try {
          const [planRow] = await database
            .select()
            .from(custom_plans)
            .where(eq(custom_plans.id, id));

          if (cancelled) return;
          if (!planRow) {
            setIsLoading(false);
            return;
          }

          const weeksRows = await database
            .select()
            .from(custom_plan_weeks)
            .where(eq(custom_plan_weeks.plan_id, id))
            .orderBy(asc(custom_plan_weeks.week_number));

          if (cancelled) return;

          const weekIds = weeksRows.map((w) => w.id);

          let daysRows = [];
          if (weekIds.length) {
            daysRows = await database
              .select({
                id: custom_plan_week_days.id,
                week_id: custom_plan_week_days.week_id,
                day_number: custom_plan_week_days.day_number,
                session_id: custom_plan_week_days.session_id,
                session_name: custom_sessions.name,
              })
              .from(custom_plan_week_days)
              .leftJoin(custom_sessions, eq(custom_plan_week_days.session_id, custom_sessions.id))
              .where(inArray(custom_plan_week_days.week_id, weekIds))
              .orderBy(asc(custom_plan_week_days.day_number));
          }

          if (cancelled) return;

          const dayIds = daysRows.map((d) => d.id);

          let exRows = [];
          if (dayIds.length) {
            exRows = await database
              .select({
                id: custom_plan_week_day_exercises.id,
                week_day_id: custom_plan_week_day_exercises.week_day_id,
                session_exercise_id: custom_plan_week_day_exercises.session_exercise_id,
                exercise_id: custom_session_exercises.exercise_id,
                exercise_name: exercises_base.name,
                exercise_muscle_group: exercises_base.muscle_group,
                position: custom_plan_week_day_exercises.position,
                prescription_mode: custom_plan_week_day_exercises.prescription_mode,
                rest_seconds: custom_plan_week_day_exercises.rest_seconds,
                intensity_mode: custom_plan_week_day_exercises.intensity_mode,
                tempo: custom_plan_week_day_exercises.tempo,
                notes: custom_plan_week_day_exercises.notes,
              })
              .from(custom_plan_week_day_exercises)
              .leftJoin(
                custom_session_exercises,
                eq(custom_plan_week_day_exercises.session_exercise_id, custom_session_exercises.id)
              )
              .leftJoin(
                exercises_base,
                eq(custom_session_exercises.exercise_id, exercises_base.id)
              )
              .where(inArray(custom_plan_week_day_exercises.week_day_id, dayIds))
              .orderBy(asc(custom_plan_week_day_exercises.position));
          }

          if (cancelled) return;

          const exIds = exRows.map((e) => e.id);

          let setRows = [];
          if (exIds.length) {
            setRows = await database
              .select()
              .from(custom_plan_week_day_exercise_sets)
              .where(inArray(custom_plan_week_day_exercise_sets.exercise_id, exIds))
              .orderBy(asc(custom_plan_week_day_exercise_sets.set_number));
          }

          if (cancelled) return;

          const setsByExId = {};
          for (const s of setRows) {
            if (!setsByExId[s.exercise_id]) setsByExId[s.exercise_id] = [];
            setsByExId[s.exercise_id].push(s);
          }

          const exByDayId = {};
          for (const ex of exRows) {
            if (!exByDayId[ex.week_day_id]) exByDayId[ex.week_day_id] = [];
            const rawSets = setsByExId[ex.id] ?? [];
            const firstSet = rawSets[0];
            exByDayId[ex.week_day_id].push({
              id: ex.id,
              session_exercise_id: ex.session_exercise_id,
              exercise_id: ex.exercise_id ?? "",
              exercise_name: ex.exercise_name ?? "",
              exercise_muscle_group: ex.exercise_muscle_group ?? "",
              position: ex.position,
              prescription_mode: ex.prescription_mode ?? "reps",
              intensity_mode: ex.intensity_mode ?? "none",
              rir: firstSet?.rir ?? null,
              rpe: firstSet?.rpe ?? null,
              tempo: ex.tempo ?? "",
              notes: ex.notes ?? "",
              set_configs: rawSets.length
                ? rawSets.map((s) => ({
                    id: s.id,
                    reps_min: s.reps_min,
                    reps_max: s.reps_max,
                    duration_seconds: s.duration_seconds,
                    weight_kg: s.weight_kg,
                    rest_seconds: ex.rest_seconds ?? 90,
                  }))
                : [
                    {
                      reps_min: 8,
                      reps_max: 12,
                      duration_seconds: null,
                      weight_kg: null,
                      rest_seconds: 90,
                    },
                  ],
            });
          }

          const daysByWeekId = {};
          for (const d of daysRows) {
            if (!daysByWeekId[d.week_id]) daysByWeekId[d.week_id] = [];
            daysByWeekId[d.week_id].push({
              id: d.id,
              day_number: d.day_number,
              session_id: d.session_id,
              session_name: d.session_name ?? null,
              exercises: exByDayId[d.id] ?? [],
            });
          }

          let weeks = weeksRows.map((w) => {
            const assignedDays = daysByWeekId[w.id] ?? [];
            const assignedByNum = {};
            for (const d of assignedDays) assignedByNum[d.day_number] = d;

            const days = Array.from(
              { length: planRow.weekly_days },
              (_, i) => assignedByNum[i + 1] ?? makeEmptyDay(i + 1)
            );

            return { id: w.id, week_number: w.week_number, days };
          });

          if (planRow.duration_weeks === 0 && weeks.length === 0) {
            weeks = buildEmptyWeeksLocal(1, planRow.weekly_days);
          }

          form.reset(
            {
              name: planRow.name ?? "",
              description: planRow.description ?? "",
              objective: planRow.objective ?? "",
              level: planRow.level ?? "",
              duration_weeks: planRow.duration_weeks,
              cover_image_uri: planRow.cover_image_uri ?? "",
              weekly_days: planRow.weekly_days,
              weeks,
            },
            { keepDefaultValues: true }
          );

          setIsLoading(false);
        } catch (e) {
          if (!cancelled) {
            console.error("Error hydrating custom plan form:", e);
            setIsLoading(false);
          }
        }
      })();
    } else {
      AsyncStorage.getItem(DRAFT_KEY).then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (
              parsed.duration_weeks === 0 &&
              (!parsed.weeks || parsed.weeks.length === 0)
            ) {
              parsed.weeks = buildEmptyWeeksLocal(
                1,
                parsed.weekly_days ?? DEFAULT_WEEKLY_DAYS
              );
            }
            form.reset(parsed, { keepDefaultValues: true });
          } catch {}
        }
        setIsLoading(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [id, form]);

  const values = useStore(form.store, (state) => state.values);

  useEffect(() => {
    if (isLoading || id) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [values, isLoading, id]);

  return { form, isLoading };
};
