// CRUD de EJERCICIOS del gym activo (admin del gym). Escribe a exercises_base con
// gym_id=<gym activo> e is_catalog=false (contenido propio del gym, no catálogo).
// Maneja también los links exercise_equipment. Port a Next de la lógica de datos de
// apps/mobile admin/exercises/builder.jsx + [id].jsx, pero con columnas de Postgres
// (is_unilateral boolean, sin created_by). Ver [[project_default_catalog]].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type AdminExerciseEquipment = {
  id: string;
  name: string | null;
  image_uri: string | null;
};

export type AdminExercise = {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  instructions: string | null;
  youtube_video_url: string | null;
  image_uri: string | null;
  video_uri: string | null;
  is_unilateral: boolean | null;
  equipments: AdminExerciseEquipment[];
};

export type AdminExerciseValues = {
  name: string;
  category: string;
  muscle_group: string;
  instructions: string;
  youtube_video_url: string;
  image_uri: string | null;
  video_uri: string | null;
  is_unilateral: boolean;
  equipments: AdminExerciseEquipment[];
};

// Equipos del gym activo (para el picker del form).
export function useGymEquipment(gymId: string | null) {
  return useQuery({
    queryKey: ["admin_equipment_picker", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, image_uri")
        .eq("gym_id", gymId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminExerciseEquipment[];
    },
  });
}

// Un ejercicio del gym + sus equipos vinculados (para editar).
export function useAdminExercise(id: string | null) {
  return useQuery({
    queryKey: ["admin_exercise", id],
    enabled: !!id,
    queryFn: async (): Promise<AdminExercise | null> => {
      const supabase = getBrowserSupabase();
      const { data: base, error } = await supabase
        .from("exercises_base")
        .select(
          "id, name, category, muscle_group, instructions, youtube_video_url, image_uri, video_uri, is_unilateral"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!base) return null;

      // Links de equipo en dos pasos (sin depender del embed FK de PostgREST).
      const { data: links, error: linkErr } = await supabase
        .from("exercise_equipment")
        .select("equipment_id")
        .eq("exercise_id", id);
      if (linkErr) throw linkErr;

      const equipmentIds = [
        ...new Set(
          ((links ?? []) as { equipment_id: string | null }[])
            .map((r) => r.equipment_id)
            .filter((v): v is string => !!v)
        ),
      ];

      let equipments: AdminExerciseEquipment[] = [];
      if (equipmentIds.length) {
        const { data: eq, error: eqErr } = await supabase
          .from("equipment")
          .select("id, name, image_uri")
          .in("id", equipmentIds);
        if (eqErr) throw eqErr;
        equipments = (eq ?? []) as AdminExerciseEquipment[];
      }

      return { ...(base as Omit<AdminExercise, "equipments">), equipments };
    },
  });
}

// Alta/edición. Sin id → insert; con id → update. Sincroniza los links de equipo.
export function useSaveAdminExercise(gymId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: AdminExerciseValues;
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
        updated_at: now,
      };

      const exerciseId = id ?? crypto.randomUUID();

      if (id) {
        const { error } = await supabase
          .from("exercises_base")
          .update(row)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises_base").insert({
          ...row,
          id: exerciseId,
          gym_id: gymId,
          is_catalog: false,
          created_at: now,
        });
        if (error) throw error;
      }

      // Re-sincronizar los links de equipo: borrar y reinsertar los únicos.
      const { error: delErr } = await supabase
        .from("exercise_equipment")
        .delete()
        .eq("exercise_id", exerciseId);
      if (delErr) throw delErr;

      const unique = (values.equipments ?? []).filter(
        (item, index, self) => self.findIndex((e) => e.id === item.id) === index
      );
      if (unique.length) {
        const { error: insErr } = await supabase
          .from("exercise_equipment")
          .insert(
            unique.map((eq) => ({
              id: crypto.randomUUID(),
              exercise_id: exerciseId,
              equipment_id: eq.id,
              created_at: now,
              updated_at: now,
            }))
          );
        if (insErr) throw insErr;
      }

      return exerciseId;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_exercises_web"] });
      if (vars.id)
        queryClient.invalidateQueries({ queryKey: ["admin_exercise", vars.id] });
    },
  });
}
