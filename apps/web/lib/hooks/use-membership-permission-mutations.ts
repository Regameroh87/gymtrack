"use client";

// Otorgar/revocar permisos puntuales (membership_permissions). Solo el owner
// del gym puede llamarlas (RLS: membership_permissions_owner_write/_delete);
// un admin no puede auto-otorgarse payments.void.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/auth-provider";

export const useMembershipPermissionMutations = (membershipId: string | null) => {
  const queryClient = useQueryClient();
  const { userId: ownerProfileId } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["membership_permissions", membershipId] });
  };

  const grant = useMutation({
    mutationFn: async (permission: string) => {
      if (!membershipId) throw new Error("Falta la membresía del socio.");
      const supabase = getBrowserSupabase();
      const { error } = await supabase.from("membership_permissions").insert({
        membership_id: membershipId,
        permission,
        granted_by: ownerProfileId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: async (permission: string) => {
      if (!membershipId) throw new Error("Falta la membresía del socio.");
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("membership_permissions")
        .delete()
        .eq("membership_id", membershipId)
        .eq("permission", permission);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { grant, revoke };
};
