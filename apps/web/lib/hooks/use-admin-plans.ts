// CRUD de PLANES de entrenamiento del gym activo (admin). Tablas training_plans →
// plan_weeks → plan_week_days → plan_week_day_exercises → plan_week_day_exercise_sets,
// con gym_id=<gym activo> e is_catalog=false. Escribe DIRECTO a Supabase (sin RPC),
// replicando en TS el rebuild de árbol de `save_catalog_plan`. El borrado y el
// recompute de publish (solo degrada) espejan apps/mobile use-training-plan-form +
// plan-publish. Port a Next de apps/mobile admin/plans/builder + [id].

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { BuilderWeek } from "@/lib/catalog-plan-helpers";

export type AdminPlanMeta = {
  name: string;
  description: string;
  objective: string;
  level: string;
  target_gender: string;
  weekly_days: number;
  duration_weeks: number;
  cover_image_uri: string | null;
};

export type AdminPlanDetail = AdminPlanMeta & {
  id: string;
  is_published: boolean;
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

// ── Sesiones del gym (picker de día) ──
export function useAdminSessionsList(gymId: string | null) {
  return useQuery({
    queryKey: ["admin_plan_sessions_list", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, name")
        .eq("gym_id", gymId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

type SessionExerciseDb = {
  id: string;
  exercise_id: string;
  position: number;
  exercises_base: {
    name: string | null;
    muscle_group: string | null;
    image_uri: string | null;
  } | null;
};

// Ejercicios de una sesión (para hidratar la prescripción al asignarla a un día).
export async function fetchAdminSessionExercises(sessionId: string) {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      "id, exercise_id, position, exercises_base(name, muscle_group, image_uri)"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as SessionExerciseDb[]).map((se) => ({
    id: se.id,
    exercise_id: se.exercise_id,
    name: se.exercises_base?.name ?? "",
    muscle_group: se.exercises_base?.muscle_group ?? "",
    image_uri: se.exercises_base?.image_uri ?? null,
  }));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Árbol completo del plan del gym, normalizado a la forma del builder.
export async function fetchAdminPlanDetail(
  planId: string | null | undefined
): Promise<AdminPlanDetail | null> {
  if (!planId) return null;
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase
    .from("training_plans")
    .select(
      `id, name, description, objective, level, target_gender, weekly_days,
       duration_weeks, cover_image_uri, is_published,
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
    .eq("is_catalog", false)
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
    is_published: !!d.is_published,
    weeks,
  } as AdminPlanDetail;
}

export function useAdminPlanDetail(planId: string | null) {
  return useQuery({
    queryKey: ["admin_plan", planId],
    enabled: !!planId,
    queryFn: () => fetchAdminPlanDetail(planId),
  });
}

// Completitud del árbol en memoria (espeja isPlanComplete): cada semana debe tener
// >= weekly_days días con sesión, y cada uno de esos días >= 1 ejercicio.
export function isWeeksComplete(
  weeks: BuilderWeek[],
  weeklyDays: number,
  durationWeeks: number
): boolean {
  const expectedWeeks = durationWeeks === 0 ? 1 : durationWeeks;
  if (weeks.length < expectedWeeks) return false;
  for (const w of weeks) {
    const daysWithSession = w.days.filter((d) => !!d.session_id);
    if (daysWithSession.length < weeklyDays) return false;
    for (const d of daysWithSession) {
      if (!d.exercises || d.exercises.length === 0) return false;
    }
  }
  return true;
}

// Borra el árbol de semanas de un plan. Las FK son ON DELETE CASCADE
// (plan_weeks → plan_week_days → plan_week_day_exercises → sets), así que borrar
// plan_weeks por plan_id arrastra todo el subárbol.
async function deletePlanTree(planId: string) {
  const supabase = getBrowserSupabase();
  const { error } = await supabase
    .from("plan_weeks")
    .delete()
    .eq("plan_id", planId);
  if (error) throw error;
}

// Inserta el árbol de semanas desde el estado del builder (bulk por tabla, en orden FK).
async function insertPlanTree(planId: string, weeks: BuilderWeek[], now: string) {
  const supabase = getBrowserSupabase();
  const weekRows: any[] = [];
  const dayRows: any[] = [];
  const exRows: any[] = [];
  const setRows: any[] = [];

  for (const week of weeks) {
    const weekId = crypto.randomUUID();
    weekRows.push({
      id: weekId,
      plan_id: planId,
      week_number: week.week_number,
      created_at: now,
      updated_at: now,
    });
    for (const day of week.days) {
      if (!day.session_id) continue;
      const dayId = crypto.randomUUID();
      dayRows.push({
        id: dayId,
        week_id: weekId,
        day_number: day.day_number,
        session_id: day.session_id,
        created_at: now,
        updated_at: now,
      });
      (day.exercises ?? []).forEach((ex, idx) => {
        const exId = crypto.randomUUID();
        const configs = ex.set_configs ?? [];
        const restSeconds = configs[0]?.rest_seconds ?? ex.rest_seconds ?? 90;
        exRows.push({
          id: exId,
          week_day_id: dayId,
          session_exercise_id: ex.session_exercise_id,
          position: ex.position ?? idx,
          prescription_mode: ex.prescription_mode ?? "reps",
          rest_seconds: restSeconds,
          intensity_mode: ex.intensity_mode ?? "none",
          tempo: ex.tempo || null,
          notes: ex.notes || null,
          created_at: now,
          updated_at: now,
        });
        configs.forEach((cfg, s) => {
          setRows.push({
            id: crypto.randomUUID(),
            exercise_id: exId,
            set_number: s + 1,
            reps_min: cfg.reps_min ?? null,
            reps_max: cfg.reps_max ?? null,
            weight_kg: cfg.weight_kg ?? null,
            duration_seconds: cfg.duration_seconds ?? null,
            rir: ex.rir ?? null,
            rpe: ex.rpe ?? null,
            created_at: now,
            updated_at: now,
          });
        });
      });
    }
  }

  if (weekRows.length) {
    const { error } = await supabase.from("plan_weeks").insert(weekRows);
    if (error) throw error;
  }
  if (dayRows.length) {
    const { error } = await supabase.from("plan_week_days").insert(dayRows);
    if (error) throw error;
  }
  if (exRows.length) {
    const { error } = await supabase
      .from("plan_week_day_exercises")
      .insert(exRows);
    if (error) throw error;
  }
  if (setRows.length) {
    const { error } = await supabase
      .from("plan_week_day_exercise_sets")
      .insert(setRows);
    if (error) throw error;
  }
}

export type SavePlanValues = AdminPlanMeta & { weeks: BuilderWeek[] };

export function useSaveAdminPlan(gymId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: SavePlanValues;
    }) => {
      const supabase = getBrowserSupabase();
      const now = new Date().toISOString();
      const complete = isWeeksComplete(
        values.weeks,
        values.weekly_days,
        values.duration_weeks
      );
      const header = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        objective: values.objective || null,
        level: values.level || null,
        target_gender: values.target_gender || "ambos",
        weekly_days: values.weekly_days,
        duration_weeks: values.duration_weeks,
        cover_image_uri: values.cover_image_uri || null,
        updated_at: now,
      };

      let planId = id ?? null;

      if (planId) {
        // Recompute solo degrada: si estaba publicado y ahora quedó incompleto → borrador.
        const { data: cur } = await supabase
          .from("training_plans")
          .select("is_published")
          .eq("id", planId)
          .maybeSingle();
        const wasPublished = !!(cur as { is_published?: boolean } | null)
          ?.is_published;
        const { error } = await supabase
          .from("training_plans")
          .update({ ...header, is_published: wasPublished && complete })
          .eq("id", planId);
        if (error) throw error;
        await deletePlanTree(planId);
      } else {
        planId = crypto.randomUUID();
        const { error } = await supabase.from("training_plans").insert({
          ...header,
          id: planId,
          gym_id: gymId,
          is_catalog: false,
          is_published: false, // alta siempre como borrador (espeja mobile)
          created_at: now,
        });
        if (error) throw error;
      }

      await insertPlanTree(planId, values.weeks, now);
      return planId;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_plans_web"] });
      if (vars.id)
        queryClient.invalidateQueries({ queryKey: ["admin_plan", vars.id] });
    },
  });
}

// Publicar / despublicar (el caller valida completitud antes de publicar).
export function useToggleAdminPlanPublish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("training_plans")
        .update({ is_published: publish, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["admin_plans_web"] });
      queryClient.invalidateQueries({ queryKey: ["admin_plan", id] });
    },
  });
}

// Borrado del plan. La FK de plan_weeks/plan_assignments a training_plans es CASCADE
// y session_logs.plan_id es SET NULL, así que basta con borrar el training_plans.
export function useDeleteAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("training_plans")
        .delete()
        .eq("id", planId);
      if (error) throw error;
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_plans_web"] });
      queryClient.invalidateQueries({
        queryKey: ["admin_plan_assignments_active"],
      });
    },
  });
}
