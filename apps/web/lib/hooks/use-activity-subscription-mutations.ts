"use client";

// Mutaciones de inscripciones a actividades (membresías con pago manual). Port web
// de apps/mobile/src/hooks/activities/use-activity-subscription-mutations.js: misma
// lógica (cerrar-luego-insertar, registrar pago mueve el vencimiento, baja conserva
// historial), con crypto.randomUUID() nativo y el browser client de Supabase.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveGym } from "@/components/auth/active-gym-provider";

const todayDate = () => new Date().toISOString().split("T")[0];

// Suma un mes a una fecha ISO (YYYY-MM-DD); por defecto a partir de hoy.
export const addOneMonth = (fromISO: string = todayDate()) => {
  const d = new Date(`${fromISO}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

export const useActivitySubscriptionMutations = () => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = (memberId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ["gym_subscriptions", gymId] });
    // Cada cobro queda en subscription_payments y alimenta el % de ingresos
    // de los coaches: refrescar también esas vistas.
    queryClient.invalidateQueries({ queryKey: ["subscription_payments", gymId] });
    queryClient.invalidateQueries({ queryKey: ["coach_payment_summary", gymId] });
    if (memberId) {
      queryClient.invalidateQueries({ queryKey: ["member_subscriptions", memberId] });
    }
  };

  // Inscribe a un socio a un pase (cierra la inscripción activa previa de esa
  // actividad). Primer mes pagado → vence el mes que viene.
  const assign = useMutation({
    mutationFn: async ({
      memberId,
      activityId,
      activityPlanId,
      price,
      dueDate,
    }: {
      memberId: string;
      activityId: string;
      activityPlanId: string;
      price: number | string | null;
      dueDate?: string;
    }) => {
      const supabase = getBrowserSupabase();
      const today = todayDate();

      const { error: closeErr } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: today })
        .eq("user_id", memberId)
        .eq("activity_id", activityId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      const id = crypto.randomUUID();
      const normalizedPrice = price == null || price === "" ? null : Number(price);
      const { error: insErr } = await supabase.from("activity_subscriptions").insert({
        id,
        user_id: memberId,
        gym_id: gymId,
        activity_id: activityId,
        activity_plan_id: activityPlanId,
        price: normalizedPrice,
        status: "active",
        start_date: today,
        last_payment_date: today,
        due_date: dueDate === undefined ? addOneMonth(today) : dueDate,
        assigned_by: staffProfileId,
      });
      if (insErr) throw insErr;

      // El alta asume el primer mes pagado: registrar ese cobro en caja
      // (subscription_payments) para que ingresos y % de coaches cierren.
      const { error: payErr } = await supabase.from("subscription_payments").insert({
        gym_id: gymId,
        subscription_id: id,
        activity_id: activityId,
        user_id: memberId,
        amount: normalizedPrice ?? 0,
        registered_by: staffProfileId,
      });
      if (payErr) throw payErr;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  // Registra un pago vía RPC atómico: inserta el cobro en subscription_payments
  // Y mueve el vencimiento en la misma transacción (caja y "al día" no divergen).
  const registerPayment = useMutation({
    mutationFn: async ({
      id,
      price,
      nextDueDate,
    }: {
      id: string;
      price?: number | string | null;
      memberId?: string | null;
      nextDueDate?: string;
    }) => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.rpc("register_subscription_payment", {
        p_subscription_id: id,
        p_amount: price == null || price === "" ? null : Number(price),
        p_next_due_date: nextDueDate ?? addOneMonth(),
      });
      if (error) throw error;
      return data as string; // id del cobro
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  // Da de baja una inscripción (conserva el historial).
  const cancel = useMutation({
    mutationFn: async ({ id }: { id: string; memberId?: string | null }) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: todayDate() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_id, vars) => invalidate(vars.memberId),
  });

  return { assign, registerPayment, cancel };
};
