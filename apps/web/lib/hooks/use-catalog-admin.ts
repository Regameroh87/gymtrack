// CRUD del CATÁLOGO central de EJERCICIOS (super_admin). Escribe DIRECTO a Supabase
// (filas is_catalog=true, gym_id=null); la RLS lo habilita por la policy
// *_super_admin_all. Los gimnasios con default_catalog lo reciben read-only.
// Port a Next de apps/mobile src/hooks/catalog/use-catalog-admin.js (supabase del
// navegador en vez del cliente mobile). Ver [[project_default_catalog]].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type CatalogExercise = {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  instructions: string | null;
  youtube_video_url: string | null;
  image_uri: string | null;
  video_uri: string | null;
  is_unilateral: boolean | null;
  updated_at: string | null;
};

export type CatalogExerciseValues = {
  name: string;
  category: string;
  muscle_group: string;
  instructions: string;
  youtube_video_url: string;
  image_uri: string | null;
  video_uri: string | null;
  is_unilateral: boolean;
};

const CATALOG_EXERCISES_KEY = ["catalog_admin", "exercises"] as const;

// Lista de ejercicios del catálogo (lectura directa de Supabase).
export function useCatalogExercisesAdmin() {
  return useQuery({
    queryKey: CATALOG_EXERCISES_KEY,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("exercises_base")
        .select(
          "id, name, category, muscle_group, instructions, youtube_video_url, image_uri, video_uri, is_unilateral, updated_at"
        )
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogExercise[];
    },
  });
}

// Alta/edición de un ejercicio del catálogo. Sin id → insert; con id → update.
export function useSaveCatalogExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: CatalogExerciseValues;
    }) => {
      const supabase = getBrowserSupabase();
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

      const newId = crypto.randomUUID();
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
}

// Borrado de un ejercicio del catálogo. El webhook sync-cloudinary destruye su media
// (image_uri/video_uri) en el DELETE.
export function useDeleteCatalogExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getBrowserSupabase();
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
}
