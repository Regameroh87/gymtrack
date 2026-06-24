// CRUD del CATÁLOGO central (super_admin). A diferencia del contenido de gym, el
// catálogo no pasa por el sync single-gym de SQLite: el super_admin lo gestiona
// DIRECTO contra Supabase (filas is_catalog=true, gym_id=null). La RLS lo habilita
// vía la policy *_super_admin_all. Los clientes lo reciben read-only por su pase de
// pull de catálogo. Ver [[project_default_catalog]].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

import { supabase } from "../../database/supabase";

const CATALOG_EXERCISES_KEY = ["catalog_admin", "exercises"];

// Lista de ejercicios de catálogo (lectura directa de Supabase).
export const useCatalogExercisesAdmin = () =>
  useQuery({
    queryKey: CATALOG_EXERCISES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises_base")
        .select(
          "id, name, category, muscle_group, instructions, youtube_video_url, image_uri, video_uri, is_unilateral, updated_at"
        )
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

// Alta/edición de un ejercicio de catálogo. Sin id → insert; con id → update.
export const useSaveCatalogExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }) => {
      const now = new Date().toISOString();
      const row = {
        name: values.name.trim(),
        category: values.category,
        muscle_group: values.muscle_group,
        instructions: values.instructions?.trim() || "",
        youtube_video_url: values.youtube_video_url?.trim() || "",
        image_uri: values.image_uri || null,
        video_uri: values.video_uri || null,
        is_unilateral: !!values.is_unilateral,
        is_catalog: true,
        gym_id: null,
        updated_at: now,
      };

      if (id) {
        const { error } = await supabase
          .from("exercises_base")
          .update(row)
          .eq("id", id)
          .eq("is_catalog", true);
        if (error) throw error;
        return id;
      }

      const newId = Crypto.randomUUID();
      const { error } = await supabase
        .from("exercises_base")
        .insert({ ...row, id: newId, created_at: now });
      if (error) throw error;
      return newId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_EXERCISES_KEY });
    },
  });
};

// Borrado de un ejercicio de catálogo. El webhook sync-cloudinary destruye su media
// (image_uri/video_uri) en el DELETE: el public_id es exclusivo de esta fila y el
// contenido custom referencia al catálogo por id, no por public_id.
export const useDeleteCatalogExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("exercises_base")
        .delete()
        .eq("id", id)
        .eq("is_catalog", true);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_EXERCISES_KEY });
    },
  });
};
