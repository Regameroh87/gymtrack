// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";

// DB / hooks
import { supabase } from "../../database/supabase";
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

// Registro manual de pagos a coaches (coach_payments). Cada pago guarda el
// snapshot del desglose calculado al momento de pagar (las tarifas pueden
// cambiar después) y el total efectivamente pagado, que puede ser parcial.
// La escritura la habilita la rama is_admin_of de la RLS.
export const useCoachPaymentMutations = () => {
  const queryClient = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { gymId } = useActiveGym();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["coach_payments", gymId] });
    queryClient.invalidateQueries({ queryKey: ["coach_payment_summary", gymId] });
  };

  const register = useMutation({
    mutationFn: async ({
      coachId,
      periodStart,
      periodEnd,
      fixedAmount,
      revenueShareAmount,
      classesCount,
      classesAmount,
      totalAmount,
      notes,
    }) => {
      const { data, error } = await supabase
        .from("coach_payments")
        .insert({
          gym_id: gymId,
          coach_id: coachId,
          period_start: periodStart,
          period_end: periodEnd,
          fixed_amount: Number(fixedAmount) || 0,
          revenue_share_amount: Number(revenueShareAmount) || 0,
          classes_count: Number(classesCount) || 0,
          classes_amount: Number(classesAmount) || 0,
          total_amount: Number(totalAmount) || 0,
          notes: (notes || "").trim() || null,
          registered_by: staffProfileId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("coach_payments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { register, remove };
};
