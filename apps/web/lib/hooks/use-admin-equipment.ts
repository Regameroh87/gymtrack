// CRUD de EQUIPOS (máquinas) del gym activo. Tabla `equipment` (gym_id, name,
// image_uri). Port a Next de apps/mobile admin/equipments/add + edit/[id].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type AdminEquipment = {
  id: string;
  name: string;
  image_uri: string | null;
};

export type AdminEquipmentValues = {
  name: string;
  image_uri: string | null;
};

export function useAdminEquipmentItem(id: string | null) {
  return useQuery({
    queryKey: ["admin_equipment", id],
    enabled: !!id,
    queryFn: async (): Promise<AdminEquipment | null> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, image_uri")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as AdminEquipment) ?? null;
    },
  });
}

export function useSaveAdminEquipment(gymId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: AdminEquipmentValues;
    }) => {
      const supabase = getBrowserSupabase();
      const now = new Date().toISOString();
      const row = {
        name: values.name.trim(),
        image_uri: values.image_uri || null,
        updated_at: now,
      };

      if (id) {
        const { error } = await supabase
          .from("equipment")
          .update(row)
          .eq("id", id);
        if (error) throw error;
        return id;
      }

      const newId = crypto.randomUUID();
      const { error } = await supabase.from("equipment").insert({
        ...row,
        id: newId,
        gym_id: gymId,
        created_at: now,
      });
      if (error) throw error;
      return newId;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_equipments_web"] });
      queryClient.invalidateQueries({ queryKey: ["admin_equipment_picker"] });
      if (vars.id)
        queryClient.invalidateQueries({ queryKey: ["admin_equipment", vars.id] });
    },
  });
}
