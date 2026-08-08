// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

// DB / hooks
import { periodAt } from "@gymtrack/core/billing-period";
import { supabase } from "../../database/supabase";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

// Mutaciones de inscripciones a actividades (membresías con pago básico manual),
// member-agnósticas: el socio se pasa por llamada. Las usa Contabilidad (gym-wide)
// y cualquier vista de lectura por-socio. La escritura la habilita la rama
// is_admin_of de la RLS (solo admin/owner). Cada mutación invalida el listado
// gym-wide y, si se conoce el socio, también su vista por-socio.
export const useActivitySubscriptionMutations = () => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = (memberId) => {
    queryClient.invalidateQueries({ queryKey: ["gym_subscriptions", gymId] });
    // Cada cobro queda registrado en subscription_payments y alimenta el % de
    // ingresos de los coaches: refrescar también esas vistas. Prefijo (sin
    // gymId) para cubrir además el historial por-suscripción del modal.
    queryClient.invalidateQueries({ queryKey: ["subscription_payments"] });
    queryClient.invalidateQueries({
      queryKey: ["coach_payment_summary", gymId],
    });
    if (memberId) {
      queryClient.invalidateQueries({
        queryKey: ["member_subscriptions", memberId],
      });
    }
  };

  // Inscribe a un socio a un pase. Si ya tenía una inscripción activa de ESA
  // actividad (otra frecuencia), la cierra primero (cerrar-luego-insertar) para
  // respetar el único-activo por actividad. NO cobra: la membresía nace debiendo
  // su primer ciclo.
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
    mutationFn: async ({ memberId, activityId, activityPlanId, price }) => {
      const today = todayDate();

      const { error: closeErr } = await supabase
        .from("activity_subscriptions")
        .update({ status: "cancelled", end_date: today })
        .eq("user_id", memberId)
        .eq("activity_id", activityId)
        .eq("status", "active");
      if (closeErr) throw closeErr;

      const id = Crypto.randomUUID();
      const normalizedPrice =
        price == null || price === "" ? null : Number(price);
      const { error: insErr } = await supabase
        .from("activity_subscriptions")
        .insert({
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
  // vencimiento en la misma transacción, así caja y "al día" no divergen.
  //
  // No recibe qué ciclos sino CUÁNTOS, y arrancan siempre en el vencimiento
  // actual. Es a propósito: la deuda se deriva de due_date, así que saltear uno
  // no lo deja impago, lo hace desaparecer. Antes acá se mandaba un period_start
  // arbitrario desde un carrusel de meses, que era exactamente ese agujero.
  const registerPayment = useMutation({
    mutationFn: async ({ id, months, price, paymentMethod }) => {
      const { data, error } = await supabase.rpc(
        "register_subscription_payment",
        {
          p_subscription_id: id,
          p_months: months,
          p_amount: price == null || price === "" ? null : Number(price),
          p_payment_method: paymentMethod ?? null,
        }
      );
      if (error) throw error;
      return data; // ids de los cobros
    },
    onSuccess: (_ids, vars) => invalidate(vars.memberId),
  });

  // Anula un cobro (insert-only: la fila nunca se edita ni se borra). El RPC
  // valida permiso payments.void o ventana de gracia del mismo día para quien
  // registró el pago, y revierte el vencimiento de la suscripción.
  const voidPayment = useMutation({
    mutationFn: async ({ paymentId, reason }) => {
      const { error } = await supabase.rpc("void_subscription_payment", {
        p_payment_id: paymentId,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => invalidate(vars.memberId),
  });

  // Da de baja una inscripción (no la borra: conserva el historial).
  const cancel = useMutation({
    mutationFn: async ({ id }) => {
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
