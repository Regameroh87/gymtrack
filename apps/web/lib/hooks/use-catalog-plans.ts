// CRUD del CATÁLOGO de PLANES (super_admin). Port a Next de core
// hooks/catalog/use-catalog-plans-admin.js: escribe directo a Supabase vía el RPC
// save_catalog_plan (arma el árbol training_plans → plan_weeks → plan_week_days →
// plan_week_day_exercises → sets en una txn). Ver [[project_default_catalog]].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { BuilderWeek } from "@/lib/catalog-plan-helpers";

export type CatalogPlan = {
  id: string;
  name: string;
  objective: string | null;
  level: string | null;
  target_gender: string | null;
  weekly_days: number;
  duration_weeks: number;
  cover_image_uri: string | null;
  updated_at: string | null;
};

export type ArchivedCatalogPlan = CatalogPlan & {
  active_followers: number | null;
};

export type PlanMeta = {
  name: string;
  description: string;
  objective: string;
  level: string;
  target_gender: string;
  weekly_days: number;
  duration_weeks: number;
  cover_image_uri: string | null;
};

export type PlanDetail = PlanMeta & {
  id: string;
  weeks: {
    week_number: number;
    days: {
      day_number: number;
      session_id: string | null;
      session_name: string | null;
      exercises: {
        session_exercise_id: string;
        exercise_id: string;
        exercise_name: string;
        exercise_muscle_group: string;
        exercise_image_uri: string | null;
        position: number;
        prescription_mode: string;
        rest_seconds: number;
        intensity_mode: string;
        tempo: string;
        notes: string;
        rir: number | null;
        rpe: number | null;
        set_configs: {
          reps_min: number | null;
          reps_max: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          rest_seconds: number;
        }[];
      }[];
    }[];
  }[];
};

export const CATALOG_PLANS_KEY = ["catalog_admin", "plans"] as const;
export const ARCHIVED_PLANS_KEY = ["catalog_admin", "plans_archived"] as const;

export function useCatalogPlansAdmin() {
  return useQuery({
    queryKey: CATALOG_PLANS_KEY,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("training_plans")
        .select(
          "id, name, objective, level, target_gender, weekly_days, duration_weeks, cover_image_uri, updated_at"
        )
        .eq("is_catalog", true)
        .is("archived_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CatalogPlan[];
    },
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Árbol completo de un plan, normalizado a la forma del builder. Las relaciones
// embebidas no garantizan orden, así que ordenamos en cliente.
export async function fetchCatalogPlanDetail(
  planId: string | null | undefined
): Promise<PlanDetail | null> {
  if (!planId) return null;
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("training_plans")
    .select(
      `id, name, description, objective, level, target_gender, weekly_days,
       duration_weeks, cover_image_uri,
       plan_weeks (
         id, week_number,
         plan_week_days (
           id, day_number, session_id,
           sessions ( name ),
           plan_week_day_exercises (
             id, session_exercise_id, position, prescription_mode, rest_seconds,
             intensity_mode, tempo, notes,
             session_exercises ( exercise_id, exercises_base ( name, muscle_group, image_uri ) ),
             plan_week_day_exercise_sets ( set_number, reps_min, reps_max, weight_kg, duration_seconds, rir, rpe )
           )
         )
       )`
    )
    .eq("id", planId)
    .eq("is_catalog", true)
    .single();
  if (error) throw error;
  if (!data) return null;
  const d = data as any;

  const weeks = (d.plan_weeks ?? [])
    .sort((a: any, b: any) => a.week_number - b.week_number)
    .map((w: any) => ({
      week_number: w.week_number,
      days: (w.plan_week_days ?? [])
        .sort((a: any, b: any) => a.day_number - b.day_number)
        .map((day: any) => ({
          day_number: day.day_number,
          session_id: day.session_id,
          session_name: day.sessions?.name ?? null,
          exercises: (day.plan_week_day_exercises ?? [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((ex: any) => {
              const sets = (ex.plan_week_day_exercise_sets ?? []).sort(
                (a: any, b: any) => a.set_number - b.set_number
              );
              const first = sets[0];
              return {
                session_exercise_id: ex.session_exercise_id,
                exercise_id: ex.session_exercises?.exercise_id ?? "",
                exercise_name: ex.session_exercises?.exercises_base?.name ?? "",
                exercise_muscle_group:
                  ex.session_exercises?.exercises_base?.muscle_group ?? "",
                exercise_image_uri:
                  ex.session_exercises?.exercises_base?.image_uri ?? null,
                position: ex.position,
                prescription_mode: ex.prescription_mode ?? "reps",
                rest_seconds: ex.rest_seconds ?? 90,
                intensity_mode: ex.intensity_mode ?? "none",
                tempo: ex.tempo ?? "",
                notes: ex.notes ?? "",
                rir: first?.rir ?? null,
                rpe: first?.rpe ?? null,
                set_configs: sets.length
                  ? sets.map((s: any) => ({
                      reps_min: s.reps_min,
                      reps_max: s.reps_max,
                      weight_kg: s.weight_kg,
                      duration_seconds: s.duration_seconds,
                      rest_seconds: ex.rest_seconds ?? 90,
                    }))
                  : [
                      {
                        reps_min: 8,
                        reps_max: 12,
                        weight_kg: null,
                        duration_seconds: null,
                        rest_seconds: 90,
                      },
                    ],
              };
            }),
        })),
    }));

  return {
    id: d.id,
    name: d.name ?? "",
    description: d.description ?? "",
    objective: d.objective ?? "",
    level: d.level ?? "",
    target_gender: d.target_gender ?? "ambos",
    weekly_days: d.weekly_days,
    duration_weeks: d.duration_weeks,
    cover_image_uri: d.cover_image_uri ?? "",
    weeks,
  } as PlanDetail;
}

export function useCatalogPlanDetail(planId: string | null) {
  return useQuery({
    queryKey: ["catalog_admin", "plan", planId],
    enabled: !!planId,
    queryFn: () => fetchCatalogPlanDetail(planId),
  });
}

type SaveValues = PlanMeta & { id?: string | null; weeks: BuilderWeek[] };

// Transforma la forma del builder (set_configs, rir/rpe a nivel ejercicio) al payload
// jerárquico que espera el RPC. Espeja persistWeeks.
const toPayload = (values: SaveValues) => ({
  id: values.id ?? null,
  name: values.name.trim(),
  description: values.description?.trim() || null,
  objective: values.objective || null,
  level: values.level || null,
  target_gender: values.target_gender || "ambos",
  weekly_days: values.weekly_days,
  duration_weeks: values.duration_weeks,
  cover_image_uri: values.cover_image_uri || null,
  weeks: (values.weeks ?? []).map((week) => ({
    week_number: week.week_number,
    days: (week.days ?? [])
      .filter((dd) => dd.session_id)
      .map((day) => ({
        day_number: day.day_number,
        session_id: day.session_id,
        exercises: (day.exercises ?? []).map((ex, idx) => {
          const configs = ex.set_configs ?? [];
          const restSeconds = configs[0]?.rest_seconds ?? ex.rest_seconds ?? 90;
          return {
            session_exercise_id: ex.session_exercise_id,
            position: ex.position ?? idx,
            prescription_mode: ex.prescription_mode ?? "reps",
            rest_seconds: restSeconds,
            intensity_mode: ex.intensity_mode ?? "none",
            tempo: ex.tempo || null,
            notes: ex.notes || null,
            sets: configs.map((cfg, s) => ({
              set_number: s + 1,
              reps_min: cfg.reps_min ?? null,
              reps_max: cfg.reps_max ?? null,
              weight_kg: cfg.weight_kg ?? null,
              duration_seconds: cfg.duration_seconds ?? null,
              rir: ex.rir ?? null,
              rpe: ex.rpe ?? null,
            })),
          };
        }),
      })),
  })),
});

export function useSaveCatalogPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: PlanMeta & { weeks: BuilderWeek[] };
    }) => {
      const supabase = getBrowserSupabase();
      const payload = toPayload({ ...values, id: id ?? null });
      const { data, error } = await supabase.rpc("save_catalog_plan", {
        payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: CATALOG_PLANS_KEY });
      if (vars?.id) {
        queryClient.invalidateQueries({
          queryKey: ["catalog_admin", "plan", vars.id],
        });
      }
    },
  });
}

// "Borrar" del catálogo = archivar (soft-delete).
export function useArchiveCatalogPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.rpc("archive_catalog_plan", {
        p_plan_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PLANS_KEY });
    },
  });
}

export function useArchivedCatalogPlans() {
  return useQuery({
    queryKey: ARCHIVED_PLANS_KEY,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase.rpc("list_archived_catalog_plans");
      if (error) throw error;
      return (data ?? []) as ArchivedCatalogPlan[];
    },
  });
}

export function useRestoreCatalogPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.rpc("restore_catalog_plan", {
        p_plan_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_PLANS_KEY });
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PLANS_KEY });
    },
  });
}

// Borrado físico (purga). El RPC rechaza si hay seguidores activos.
export function useDeleteCatalogPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.rpc("delete_catalog_plan", {
        p_plan_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARCHIVED_PLANS_KEY });
    },
  });
}
