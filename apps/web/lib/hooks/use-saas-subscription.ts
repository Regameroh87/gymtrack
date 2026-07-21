import { useQuery } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type SaasSubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export type GymSaasSubscription = {
  id: string;
  gym_id: string;
  status: SaasSubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  plan: {
    name: string;
    trial_days: number;
    price: number | null;
    currency: string;
  } | null;
};

export function useGymSaasSubscription(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ["gym_saas_subscription", gymId],
    enabled: !!gymId,
    staleTime: 60_000,
    queryFn: async (): Promise<GymSaasSubscription | null> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("gym_saas_subscriptions")
        .select(
          "id, gym_id, status, trial_ends_at, current_period_end, canceled_at, plan:saas_plans(name, trial_days, price, currency)",
        )
        .eq("gym_id", gymId!)
        .maybeSingle();
      if (error) throw error;
      return data as GymSaasSubscription | null;
    },
  });
}

/** true = el gym puede escribir datos; false = modo lectura (suscripción vencida o pendiente) */
export function useIsGymWritable(gymId: string | null | undefined): boolean {
  const { data } = useGymSaasSubscription(gymId);
  if (!data) return true; // sin fila → gym pre-existente, acceso total
  return data.status === "trialing" || data.status === "active";
}

export type SubscriptionBannerKind =
  | "trial_ending_soon"
  | "trial_expired"
  | "payment_failed"
  | "canceled"
  | "none";

/** Devuelve el tipo de banner a mostrar y cuántos días quedan de trial. */
export function useSubscriptionBanner(gymId: string | null | undefined): {
  kind: SubscriptionBannerKind;
  daysLeft: number | null;
} {
  const { data } = useGymSaasSubscription(gymId);

  if (!data) return { kind: "none", daysLeft: null };

  const { status, trial_ends_at } = data;

  if (status === "trialing" && trial_ends_at) {
    const ms = new Date(trial_ends_at).getTime() - Date.now();
    const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return { kind: "trial_ending_soon", daysLeft };
  }

  if (status === "expired" || status === "pending") {
    return { kind: "trial_expired", daysLeft: 0 };
  }

  if (status === "past_due") {
    return { kind: "payment_failed", daysLeft: null };
  }

  if (status === "canceled") {
    return { kind: "canceled", daysLeft: null };
  }

  return { kind: "none", daysLeft: null };
}
