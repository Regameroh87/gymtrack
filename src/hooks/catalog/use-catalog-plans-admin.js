// CRUD del CATÁLOGO de PLANES (super_admin). Escribe DIRECTO a Supabase vía el RPC
// save_catalog_plan, que arma el árbol completo (training_plans → plan_weeks →
// plan_week_days → plan_week_day_exercises → plan_week_day_exercise_sets) en una sola
// transacción. La forma del payload espeja la de persistWeeks (mobile). Ver
// [[project_default_catalog]].
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../../database/supabase";

export const CATALOG_PLANS_KEY = ["catalog_admin", "plans"];

// Lista de planes de catálogo.
export const useCatalogPlansAdmin = () =>
  useQuery({
    queryKey: CATALOG_PLANS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select(
          "id, name, objective, level, target_gender, weekly_days, duration_weeks, cover_image_uri, updated_at"
        )
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

// Árbol completo de un plan de catálogo, normalizado a la forma del builder
// (weeks → days → exercises → set_configs). Las relaciones embebidas no garantizan
// orden, así que ordenamos en cliente.
export const fetchCatalogPlanDetail = async (planId) => {
  if (!planId) return null;
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

  const weeks = (data.plan_weeks ?? [])
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => ({
      week_number: w.week_number,
      days: (w.plan_week_days ?? [])
        .sort((a, b) => a.day_number - b.day_number)
        .map((d) => ({
          day_number: d.day_number,
          session_id: d.session_id,
          session_name: d.sessions?.name ?? null,
          exercises: (d.plan_week_day_exercises ?? [])
            .sort((a, b) => a.position - b.position)
            .map((ex) => {
              const sets = (ex.plan_week_day_exercise_sets ?? []).sort(
                (a, b) => a.set_number - b.set_number
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
                  ? sets.map((s) => ({
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
    id: data.id,
    name: data.name ?? "",
    description: data.description ?? "",
    objective: data.objective ?? "",
    level: data.level ?? "",
    target_gender: data.target_gender ?? "ambos",
    weekly_days: data.weekly_days,
    duration_weeks: data.duration_weeks,
    cover_image_uri: data.cover_image_uri ?? "",
    weeks,
  };
};

export const useCatalogPlanDetail = (planId) =>
  useQuery({
    queryKey: ["catalog_admin", "plan", planId],
    enabled: !!planId,
    queryFn: () => fetchCatalogPlanDetail(planId),
  });

// Transforma la forma del builder (set_configs, rir/rpe a nivel ejercicio) al payload
// jerárquico que espera el RPC. Espeja persistWeeks: rest_seconds sale de configs[0],
// rir/rpe del ejercicio se aplican a cada serie.
const toPayload = (values) => ({
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
      .filter((d) => d.session_id)
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

export const useSaveCatalogPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }) => {
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
};

export const useDeleteCatalogPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("delete_catalog_plan", {
        p_plan_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATALOG_PLANS_KEY });
    },
  });
};
