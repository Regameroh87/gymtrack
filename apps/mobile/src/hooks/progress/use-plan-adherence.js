// Librerías externas
import { useQuery } from "@tanstack/react-query";
import { and, count, eq, ne } from "drizzle-orm";

// Base de datos
import { database } from "../../database";
import { session_logs } from "../../database/schemas";

// Hooks
import { useAuth } from "../../auth/lib/getSession";
import { fetchActivePlanSummary } from "../plans/use-active-plan-summary";

// Adherencia al plan activo: entrenamientos registrados de ese plan vs. el total
// programado (días/semana × semanas). Reutiliza fetchActivePlanSummary para no
// duplicar la lógica de resolución del plan/día activo. Para planes indefinidos
// (duration_weeks = 0) no hay total fijo: scheduled queda en null.
export const fetchPlanAdherence = async (userId) => {
  const summary = await fetchActivePlanSummary(userId);
  if (!summary) return { hasPlan: false };

  const { plan, isCustom, isCompleted } = summary;
  const planColumn = isCustom
    ? session_logs.custom_plan_id
    : session_logs.plan_id;

  const [{ value: completed }] = await database
    .select({ value: count() })
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, userId),
        eq(planColumn, plan.id),
        ne(session_logs.sync_status, "deleted")
      )
    );

  const weeklyDays = plan.weekly_days ?? 0;
  const durationWeeks = plan.duration_weeks ?? 0;
  const scheduled = durationWeeks > 0 ? weeklyDays * durationWeeks : null;

  return {
    hasPlan: true,
    planName: plan.name,
    isCustom,
    isCompleted,
    completed: completed ?? 0,
    scheduled,
    weeklyDays,
    durationWeeks,
    currentWeek: summary.currentDay?.week_number ?? null,
    currentDay: summary.currentDay?.day_number ?? null,
  };
};

export const usePlanAdherence = () => {
  const { userId } = useAuth();

  return useQuery({
    // Comparte prefijo con ["plan_assignments"] para invalidarse al asignar/dejar
    // un plan o al registrar un log (igual que use-active-plan-summary).
    queryKey: ["plan_assignments", "adherence", userId],
    enabled: !!userId,
    queryFn: () => fetchPlanAdherence(userId),
  });
};
