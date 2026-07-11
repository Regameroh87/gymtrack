// React / libs
import { useQuery } from "@tanstack/react-query";

// DB
import { supabase } from "../../supabase.js";

// Historial de cobros de UNA suscripción, para el modal de detalle del socio en
// Contabilidad. Cada fila trae el monto, cuándo se cobró (paid_at) y qué mes
// cubre (period_start/period_end). El staff accede por la rama is_staff_of de la
// RLS de subscription_payments. Ordena por mes cubierto desc (filas viejas sin
// período van al final) y desempata por fecha de cobro.
export const useSubscriptionPayments = (subscriptionId) => {
  return useQuery({
    queryKey: ["subscription_payments", "sub", subscriptionId],
    enabled: !!subscriptionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("period_start", { ascending: false, nullsFirst: false })
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};
