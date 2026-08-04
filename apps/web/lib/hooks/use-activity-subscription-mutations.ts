"use client";

// Mutaciones de inscripciones a actividades (membresías con pago manual). Port web
// de apps/mobile/src/hooks/activities/use-activity-subscription-mutations.js: misma
// lógica (cerrar-luego-insertar, registrar pago mueve el vencimiento, baja conserva
// historial), con crypto.randomUUID() nativo y el browser client de Supabase.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { periodAt } from "@gymtrack/core";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveGym } from "@/components/auth/active-gym-provider";

const todayDate = () => new Date().toISOString().split("T")[0];

export const useActivitySubscriptionMutations = () => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = (memberId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: ["gym_subscriptions", gymId] });
    // Cada cobro queda en subscription_payments y alimenta el % de ingresos
    // de los coaches: refrescar también esas vistas. Prefijo (sin gymId) para
    // cubrir además el historial por-suscripción del modal de detalle.
    queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });
    queryClient.invalidateQueries({ queryKey: ["gym_payments", gymId] });
    queryClient.invalidateQueries({ queryKey: ["coach_payment_summary", gymId] });
    queryClient.invalidateQueries({ queryKey: ["activity_income_summary", gymId] });
    if (memberId) {
      queryClient.invalidateQueries({ queryKey: ["member_subscriptions", memberId] });
    }
  };

  // Inscribe a un socio a un pase (cierra la inscripción activa previa de esa
  // actividad). NO cobra: la membresía nace debiendo su primer ciclo.
  //
  // El ciclo arranca HOY y dura un mes — del 12/8 al 12/9 para un alta del 12/8.
  // start_date es además el ancla de todos los ciclos siguientes, así que este
  // insert es lo que fija el día de cobro del socio para siempre.
  //
  // El alta no cobra a propósito: antes daba por pagado el primer mes e insertaba
  // el cobro a mano en subscription_payments, o sea que metía en caja plata que
  // podía no haber entrado y sin método de pago. Ahora nace debiendo y el cobro
  // es un paso explícito, por el mismo RPC que todos los demás.
  const assign = useMutation({
    mutationFn: async ({
      memberId,
      activityId,
      activityPlanId,
      price,
    }: {
      memberId: string;
      activityId: string;
      activityPlanId: string;
      price: number | string | null;
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
        // El ancla: de acá salen todos los ciclos de esta suscripción.
        start_date: today,
        // Todavía no pagó nada: lo escribe el RPC cuando se cobre de verdad.
        last_payment_date: null,
        // Debe desde hoy, que es el arranque de su primer ciclo (k=0).
        due_date: today,
        assigned_by: staffProfileId,
      });
      if (insErr) throw insErr;

      // El ciclo que queda debiendo, para que el paso de cobro lo pueda nombrar
      // sin volver a la base.
      return { id, period: periodAt(today, 0) };
    },
    onSuccess: (_res, vars) => invalidate(vars.memberId),
  });

  // Cobra uno o varios ciclos vía RPC atómico: inserta los cobros en
  // subscription_payments (con el período que cubre cada uno) Y mueve el
  // vencimiento en la misma transacción, así caja y "al día" no divergen. Si
  // falla el tercero de tres, no queda plata cobrada con la deuda a medio saldar.
  //
  // No recibe qué ciclos sino cuántos, y arrancan siempre en el vencimiento
  // actual. Es a propósito: la deuda se deriva de due_date, así que saltear uno
  // no lo deja impago, lo hace desaparecer.
  const registerPayment = useMutation({
    mutationFn: async ({
      id,
      months,
      price,
      paymentMethod,
    }: {
      id: string;
      months: number;
      price?: number | string | null;
      memberId?: string | null;
      paymentMethod: string;
    }) => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.rpc("register_subscription_payment", {
        p_subscription_id: id,
        p_months: months,
        p_amount: price == null || price === "" ? null : Number(price),
        p_payment_method: paymentMethod,
      });
      if (error) throw error;
      return data as string[]; // ids de los cobros
    },
    onSuccess: (_ids, vars) => invalidate(vars.memberId),
  });

  // Anula un cobro (insert-only: la fila nunca se edita ni se borra). El RPC
  // valida permiso payments.void o ventana de gracia del mismo día para quien
  // registró el pago, y revierte el vencimiento de la suscripción.
  const voidPayment = useMutation({
    mutationFn: async ({
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
      memberId?: string | null;
    }) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.rpc("void_subscription_payment", {
        p_payment_id: paymentId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => invalidate(vars.memberId),
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

  return { assign, registerPayment, voidPayment, cancel };
};
