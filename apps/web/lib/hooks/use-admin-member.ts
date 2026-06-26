// Mutaciones de un socio del gym (admin). Port a Next de apps/mobile
// src/hooks/users/use-update-member.js: edición de perfil, alta/baja (is_active) y
// borrado vía edge function `eliminar-socio`. Todo supabase directo (no offline).
// La lectura de la ficha usa los hooks web-safe de core: useMemberDetail /
// useMemberSubscriptions.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type MemberProfileUpdate = {
  name: string | null;
  last_name: string | null;
  phone: string | null;
  document_number: string | null;
  address: string | null;
  gender: string | null;
};

// Normaliza igual que crear-socio: name/last_name/address en minúsculas.
export const normLower = (s: string | null | undefined) =>
  s ? s.trim().toLowerCase() : null;

export function useUpdateMember(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: MemberProfileUpdate) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("profiles")
        .update(fields)
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_detail", memberId] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}

export function useToggleMemberActive(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member_detail", memberId] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}

// Eliminación permanente del socio del gym (solo owner/super_admin vía RLS de la
// edge function). targetUserId es el auth user id (profiles.user_id).
export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gymId,
      targetUserId,
    }: {
      gymId: string;
      targetUserId: string;
    }) => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.functions.invoke("eliminar-socio", {
        body: { gym_id: gymId, target_user_id: targetUserId },
      });
      if (error) {
        let msg = "Error al eliminar el socio.";
        const ctx = (error as { context?: { json: () => Promise<unknown> } })
          .context;
        if (ctx) {
          try {
            const body = (await ctx.json()) as { error?: string };
            if (body?.error) msg = body.error;
          } catch {
            // sin cuerpo parseable
          }
        }
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}
