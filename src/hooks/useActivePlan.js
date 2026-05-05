// Librerías externas
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

// Base de datos
import { database } from "../database";
import { routines, training_plan_days, training_plans } from "../database/schemas";
import { supabase } from "../database/supabase";

const ACTIVE_PLAN_KEY = "active_plan_id";

export const useActivePlan = () => {
  // Lee el plan activo: primero desde AsyncStorage, luego hidrata con datos locales
  return useQuery({
    queryKey: ["active_plan"],
    queryFn: async () => {
      const planId = await AsyncStorage.getItem(ACTIVE_PLAN_KEY);
      if (!planId) return null;

      const [plan] = await database
        .select()
        .from(training_plans)
        .where(eq(training_plans.id, planId));

      if (!plan) return null;

      const days = await database
        .select({
          id: training_plan_days.id,
          day_number: training_plan_days.day_number,
          routine_id: training_plan_days.routine_id,
          routine_name: routines.name,
          routine_objective: routines.objective,
        })
        .from(training_plan_days)
        .innerJoin(routines, eq(training_plan_days.routine_id, routines.id))
        .where(eq(training_plan_days.plan_id, planId))
        .orderBy(asc(training_plan_days.day_number));

      return { plan, days };
    },
  });
};

export const setActivePlan = async ({ planId, userId, queryClient }) => {
  await AsyncStorage.setItem(ACTIVE_PLAN_KEY, planId);

  // Intentar persistir en Supabase si hay conexión
  try {
    await supabase
      .from("profiles")
      .update({ active_plan_id: planId })
      .eq("id", userId);
  } catch (_) {
    // Falla silenciosa — AsyncStorage es la fuente local de verdad
  }

  queryClient.invalidateQueries({ queryKey: ["active_plan"] });
};

export const clearActivePlan = async ({ userId, queryClient }) => {
  await AsyncStorage.removeItem(ACTIVE_PLAN_KEY);
  try {
    await supabase
      .from("profiles")
      .update({ active_plan_id: null })
      .eq("id", userId);
  } catch (_) {}
  queryClient.invalidateQueries({ queryKey: ["active_plan"] });
};
