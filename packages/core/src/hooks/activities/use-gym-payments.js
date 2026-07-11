// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Todos los cobros (subscription_payments) del gym en un período, para la pestaña
// "Pagos recibidos" de Contabilidad. A diferencia de useSubscriptionPayments (un
// solo socio) o activity_income_summary (agregado por actividad), esta lista trae
// cada pago individual con su socio, actividad, pase y quién lo registró.
//
// A diferencia de activity_subscriptions (cuyo socio apunta a auth.users y se
// resuelve en dos pasos), subscription_payments.user_id y .registered_by tienen
// FK directo a profiles, así que se embeben con hint de constraint. El staff
// accede por la rama is_staff_of de la RLS de subscription_payments.
//
// El filtro por mes es server-side (paid_at); el resto (actividad, socio, quién
// registró) se resuelve en cliente sobre el set del mes, que es chico.
export const useGymPayments = (gymId, fromISO, toISO) => {
  return useQuery({
    queryKey: ["gym_payments", gymId, fromISO, toISO],
    enabled: !!gymId && !!fromISO && !!toISO,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select(
          "*, " +
            "activities!subscription_payments_activity_id_fkey(name, color), " +
            "subscription:activity_subscriptions!subscription_payments_subscription_id_fkey(activity_plans(label, frequency_per_week)), " +
            "member:profiles!subscription_payments_user_id_fkey(id, name, last_name, image_profile), " +
            "registrant:profiles!subscription_payments_registered_by_fkey(id, name, last_name)"
        )
        .eq("gym_id", gymId)
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO)
        .order("paid_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Aplanar el pase, que viene anidado dentro de la suscripción embebida.
      return (data ?? []).map((r) => ({
        ...r,
        activity_plans: r.subscription?.activity_plans ?? null,
      }));
    },
  });
};
