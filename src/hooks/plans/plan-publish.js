// Librerías externas
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq, inArray, ne } from "drizzle-orm";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../../database";
import {
  plan_week_day_exercises,
  plan_week_days,
  plan_weeks,
  training_plans,
} from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";

// ─── Helpers de lookup ────────────────────────────────────────────────────────

export const planIdsUsingSessions = async (sessionIds, db = database) => {
  if (!sessionIds.length) return [];
  const rows = await db
    .selectDistinct({ plan_id: plan_weeks.plan_id })
    .from(plan_week_days)
    .innerJoin(plan_weeks, eq(plan_week_days.week_id, plan_weeks.id))
    .where(
      and(
        inArray(plan_week_days.session_id, sessionIds),
        ne(plan_week_days.sync_status, "deleted")
      )
    );
  return rows.map((r) => r.plan_id);
};

export const planIdsUsingSessionExercises = async (seIds, db = database) => {
  if (!seIds.length) return [];
  const rows = await db
    .selectDistinct({ plan_id: plan_weeks.plan_id })
    .from(plan_week_day_exercises)
    .innerJoin(
      plan_week_days,
      eq(plan_week_day_exercises.week_day_id, plan_week_days.id)
    )
    .innerJoin(plan_weeks, eq(plan_week_days.week_id, plan_weeks.id))
    .where(
      and(
        inArray(plan_week_day_exercises.session_exercise_id, seIds),
        ne(plan_week_day_exercises.sync_status, "deleted")
      )
    );
  return rows.map((r) => r.plan_id);
};

// ─── Verificación de completitud ──────────────────────────────────────────────

export const isPlanComplete = async (planId, db = database) => {
  const [plan] = await db
    .select({ weekly_days: training_plans.weekly_days })
    .from(training_plans)
    .where(eq(training_plans.id, planId));

  if (!plan) return false;

  const weeks = await db
    .select({ id: plan_weeks.id })
    .from(plan_weeks)
    .where(
      and(
        eq(plan_weeks.plan_id, planId),
        ne(plan_weeks.sync_status, "deleted")
      )
    );

  if (!weeks.length) return false;

  for (const week of weeks) {
    // Días con sesión asignada en esta semana
    const days = await db
      .select({ id: plan_week_days.id, session_id: plan_week_days.session_id })
      .from(plan_week_days)
      .where(
        and(
          eq(plan_week_days.week_id, week.id),
          ne(plan_week_days.sync_status, "deleted")
        )
      );

    const daysWithSession = days.filter((d) => !!d.session_id);
    if (daysWithSession.length < plan.weekly_days) return false;

    // Cada día con sesión debe tener ≥1 ejercicio no-deleted
    for (const day of daysWithSession) {
      const exCount = await db
        .select({ id: plan_week_day_exercises.id })
        .from(plan_week_day_exercises)
        .where(
          and(
            eq(plan_week_day_exercises.week_day_id, day.id),
            ne(plan_week_day_exercises.sync_status, "deleted")
          )
        );
      if (!exCount.length) return false;
    }
  }

  return true;
};

// ─── Recompute (solo degrada) ─────────────────────────────────────────────────

export const recomputePlanPublishState = async (planIds, db = database) => {
  if (!planIds.length) return;

  // Solo nos interesan los planes publicados — si ya son borrador, no hay nada que degradar
  const published = await db
    .select({ id: training_plans.id })
    .from(training_plans)
    .where(
      and(
        inArray(training_plans.id, planIds),
        eq(training_plans.is_published, true)
      )
    );

  if (!published.length) return;

  const now = new Date().toISOString();
  for (const { id } of published) {
    const complete = await isPlanComplete(id, db);
    if (!complete) {
      await db
        .update(training_plans)
        .set({ is_published: false, sync_status: "pending", updated_at: now })
        .where(eq(training_plans.id, id));
    }
  }
};

// ─── Mutation de toggle ───────────────────────────────────────────────────────

export const useTogglePlanPublish = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, publish }) => {
      if (publish) {
        const complete = await isPlanComplete(id);
        if (!complete) {
          throw new Error("incomplete");
        }
      }

      await database
        .update(training_plans)
        .set({
          is_published: publish,
          sync_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .where(eq(training_plans.id, id));
    },
    onSuccess: (_, { id, publish }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: publish ? "Plan publicado" : "Plan despublicado",
        text2: publish
          ? "Ya es visible para los miembros del gym."
          : "Ya no aparece en el catálogo de miembros.",
        position: "bottom",
      });
      queryClient.invalidateQueries({ queryKey: ["training_plans"] });
      queryClient.invalidateQueries({ queryKey: ["training_plan", id] });
      checkNetInfoAndSync().catch((e) => console.error("Sync failed", e));
    },
    onError: (error) => {
      if (error.message === "incomplete") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Plan incompleto",
          text2: "Asigná una sesión con ejercicios a cada día antes de publicar.",
          position: "bottom",
        });
      }
    },
  });
};
