import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  mp_preapproval_id: string | null;
  /**
   * Cuándo MP confirmó 'authorized' el preapproval vigente. Es la señal de "ya
   * cargó la tarjeta"; mp_preapproval_id NO lo es, porque el checkout lo escribe
   * al crear el preapproval y un checkout abandonado lo deja seteado igual.
   */
  mp_authorized_at: string | null;
  cancel_at_period_end: boolean;
  cancel_requested_at: string | null;
  cancel_reason: string | null;
  access_until: string | null;
  plan_id: string | null;
  /**
   * Plan de un cambio pedido y todavía no autorizado en MercadoPago. Mientras
   * esté seteado, el que se cobra sigue siendo `plan`: la promoción la hace el
   * webhook con el 'authorized'.
   */
  pending_plan_id: string | null;
  plan: {
    name: string;
    trial_days: number;
    price: number | null;
    currency: string;
    max_members: number | null;
  } | null;
  pending_plan: { name: string } | null;
};

export type SaasPlanOption = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  trial_days: number;
  max_members: number | null;
  is_featured: boolean;
  badge_text: string | null;
  features: string[];
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
          "id, gym_id, status, trial_ends_at, current_period_end, canceled_at, mp_preapproval_id, mp_authorized_at, cancel_at_period_end, cancel_requested_at, cancel_reason, access_until, plan_id, pending_plan_id, plan:saas_plans!gym_saas_subscriptions_plan_id_fkey(name, trial_days, price, currency, max_members), pending_plan:saas_plans!gym_saas_subscriptions_pending_plan_id_fkey(name)",
        )
        .eq("gym_id", gymId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as GymSaasSubscription | null;
    },
  });
}

/**
 * Los planes que el owner puede contratar. RLS deja leer los is_active a
 * cualquiera, así que no hace falta nada especial.
 */
export function useSaasPlans() {
  return useQuery({
    queryKey: ["saas_plans_activos"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SaasPlanOption[]> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("saas_plans")
        .select(
          "id, name, description, price, currency, trial_days, max_members, is_featured, badge_text, features",
        )
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        price: p.price != null ? Number(p.price) : null,
        features: p.features ?? [],
      })) as SaasPlanOption[];
    },
  });
}

/**
 * Socios activos del gym contra el tope de su plan. `maxAllowed` en null =
 * ilimitado (plan sin tope, o gym sin fila de suscripción).
 *
 * Sale de la RPC gym_member_usage y no de contar en el cliente: la lista de
 * usuarios está paginada y filtrada, así que contarla ahí daría un número que
 * no es el que mira el trigger.
 */
export function useGymMemberUsage(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ["gym_member_usage", gymId],
    enabled: !!gymId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ used: number; maxAllowed: number | null }> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.rpc("gym_member_usage", {
        p_gym_id: gymId!,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { used: number; max_allowed: number | null }
        | undefined;
      return {
        used: row?.used ?? 0,
        maxAllowed: row?.max_allowed ?? null,
      };
    },
  });
}

/**
 * Baja programada todavía vigente: el owner canceló pero sigue teniendo acceso
 * hasta access_until. En DB el status sigue siendo active/trialing; esto es un
 * estado derivado que solo existe en la UI.
 */
export function hasPendingCancellation(
  sub: GymSaasSubscription | null | undefined,
): boolean {
  return (
    !!sub?.cancel_at_period_end &&
    !!sub.access_until &&
    new Date(sub.access_until) > new Date()
  );
}

/** ¿Se puede pedir la baja? Requiere una suscripción viva y sin baja ya pedida. */
export function canCancelSubscription(
  sub: GymSaasSubscription | null | undefined,
): boolean {
  if (!sub || sub.cancel_at_period_end) return false;
  if (sub.status === "active" || sub.status === "past_due") return true;
  // En trial solo tiene sentido si hay una autorización viva que cancelar en MP.
  // La señal es mp_authorized_at y NO mp_preapproval_id: el id lo escribe el
  // checkout al crear el preapproval, así que un checkout abandonado lo deja
  // seteado sin que exista ninguna autorización. Con el id, el botón aparecía
  // para un gym en trial sin tarjeta y le escribía una baja completa
  // (cancel_at_period_end, cancel_reason, banner 'cancel_scheduled') sobre una
  // suscripción que nunca cobró. Ese pending lo limpia el próximo checkout o el
  // reaper, no el owner.
  return sub.status === "trialing" && !!sub.mp_authorized_at;
}

/** true = el gym puede escribir datos; false = modo lectura (suscripción vencida o pendiente) */
export function useIsGymWritable(gymId: string | null | undefined): boolean {
  const { data } = useGymSaasSubscription(gymId);
  if (!data) return true; // sin fila → gym pre-existente, acceso total
  // Espeja el corte por fecha de is_saas_subscription_active: con la baja ya
  // vencida el status puede seguir en active/trialing hasta que corra el cron.
  if (
    data.cancel_at_period_end &&
    data.access_until &&
    new Date(data.access_until) <= new Date()
  ) {
    return false;
  }
  return data.status === "trialing" || data.status === "active";
}

export type SubscriptionBannerKind =
  | "cancel_scheduled"
  | "trial_ending_soon"
  | "trial_expired"
  | "payment_failed"
  | "canceled"
  | "none";

/** Devuelve el tipo de banner a mostrar y cuántos días quedan de trial. */
export function useSubscriptionBanner(gymId: string | null | undefined): {
  kind: SubscriptionBannerKind;
  daysLeft: number | null;
  until: string | null;
} {
  const { data } = useGymSaasSubscription(gymId);

  if (!data) return { kind: "none", daysLeft: null, until: null };

  const { status, trial_ends_at } = data;

  const daysUntil = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Va primero: durante una baja programada el status sigue siendo
  // active/trialing, así que si no, ganaría el banner de trial por vencer.
  if (hasPendingCancellation(data)) {
    return {
      kind: "cancel_scheduled",
      daysLeft: daysUntil(data.access_until!),
      until: data.access_until,
    };
  }

  if (status === "trialing" && trial_ends_at) {
    const daysLeft = daysUntil(trial_ends_at);
    if (daysLeft <= 3)
      return { kind: "trial_ending_soon", daysLeft, until: trial_ends_at };
  }

  // Baja ya vencida cuyo status todavía no normalizó el cron: el gate ya cortó,
  // así que corresponde el banner de cancelada y no el silencio de "active".
  if (data.cancel_at_period_end) {
    return { kind: "canceled", daysLeft: null, until: null };
  }

  if (status === "expired" || status === "pending") {
    return { kind: "trial_expired", daysLeft: 0, until: null };
  }

  if (status === "past_due") {
    return { kind: "payment_failed", daysLeft: null, until: null };
  }

  if (status === "canceled") {
    return { kind: "canceled", daysLeft: null, until: null };
  }

  return { kind: "none", daysLeft: null, until: null };
}

/** Pide la baja de la suscripción. El acceso sigue hasta access_until. */
export function useCancelSaasSubscription(gymId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { reason?: string; feedback?: string }) => {
      const res = await fetch("/api/saas/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gym_id: gymId, ...vars }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        access_until?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "No se pudo dar de baja la suscripción.");
      }
      return body as { access_until: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gym_saas_subscription", gymId],
      });
    },
  });
}
