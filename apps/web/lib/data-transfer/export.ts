// Export de los datos del gym activo a un workbook Excel. Corre 100% en el
// browser con el cliente supabase del usuario: la RLS acota todo al gym y a los
// permisos reales del caller. Los fetch espejan los selects de los hooks del
// panel (use-admin-*, use-gym-members, use-gym-payments) pero sin React Query.

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { fetchAdminPlanDetail } from "@/lib/hooks/use-admin-plans";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  PLAN_LEVELS,
  PLAN_OBJECTIVES,
} from "@/lib/catalog-options";
import { PROFILE_GENDERS } from "@/lib/gender-options";
import { ROLE_LABELS } from "@gymtrack/core/roles";
import type { SheetData } from "./xlsx";
import {
  SHEET,
  LEEME_AOA,
  SOCIOS_COLUMNS,
  EQUIPMENT_COLUMNS,
  EXERCISES_COLUMNS,
  SESSIONS_COLUMNS,
  SESSION_EXERCISES_COLUMNS,
  PLANS_COLUMNS,
  PLAN_DETAIL_COLUMNS,
  SUBSCRIPTIONS_COLUMNS,
  MEMBER_PAYMENTS_COLUMNS,
  COACH_PAYMENTS_COLUMNS,
  WORKOUT_LOGS_COLUMNS,
  WORKOUT_SETS_COLUMNS,
  type Column,
  headersOf,
  toSheetRow,
  boolLabel,
  optionLabel,
  EQUIPMENT_SEPARATOR,
} from "./sheets";

// Los registros de entrenamiento NO forman parte del export admin (exportar los
// entrenamientos de todo el gym es demasiado): cada socio exporta los suyos
// desde Progreso, vía buildMemberWorkoutSheets.
export type ExportGroup = "socios" | "catalogo" | "facturacion";

export const EXPORT_GROUPS: { value: ExportGroup; label: string; detail: string }[] = [
  { value: "socios", label: "Socios", detail: "Datos personales, actividades, pagos y estado de membresía" },
  { value: "catalogo", label: "Catálogo de entrenamiento", detail: "Máquinas, ejercicios, sesiones y planes" },
  { value: "facturacion", label: "Facturación", detail: "Inscripciones, pagos de socios y pagos a coaches" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const CHUNK = 200;

// .in() con listas largas: parte en tandas para no exceder límites de URL.
async function fetchIn(
  table: string,
  select: string,
  column: string,
  ids: string[]
): Promise<Row[]> {
  const supabase = getBrowserSupabase();
  const unique = [...new Set(ids)].filter(Boolean);
  const out: Row[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in(column, unique.slice(i, i + CHUNK));
    if (error) throw error;
    out.push(...((data ?? []) as Row[]));
  }
  return out;
}

const sheet = (name: string, columns: Column[], rows: Row[]): SheetData => ({
  name,
  headers: headersOf(columns),
  rows: rows.map((r) => toSheetRow(columns, r)),
});

const fullName = (p?: Row | null) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || null;

// Perfiles del gym (todas las membresías, activas e inactivas) + índices por
// profiles.id y por user_id. Base de Socios y de los nombres denormalizados.
async function fetchMembersIndex(gymId: string) {
  const supabase = getBrowserSupabase();
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id, role, status")
    .eq("gym_id", gymId);
  if (error) throw error;

  const profiles = await fetchIn(
    "profiles",
    "*",
    "user_id",
    (memberships ?? []).map((m: Row) => m.user_id)
  );

  const byUserId = new Map(profiles.map((p) => [p.user_id, p]));
  const byProfileId = new Map(profiles.map((p) => [p.id, p]));
  return { memberships: (memberships ?? []) as Row[], byUserId, byProfileId };
}

// Nombres de perfiles referenciados que pueden no ser socios actuales
// (registrado_por, coaches dados de baja, etc.).
async function resolveProfiles(
  byProfileId: Map<string, Row>,
  ids: (string | null | undefined)[]
) {
  const missing = [...new Set(ids.filter((id): id is string => !!id))].filter(
    (id) => !byProfileId.has(id)
  );
  if (missing.length) {
    const extra = await fetchIn("profiles", "*", "id", missing);
    for (const p of extra) byProfileId.set(p.id, p);
  }
}

// ── Socios ──

async function buildSociosSheets(gymId: string): Promise<SheetData[]> {
  const supabase = getBrowserSupabase();
  const { memberships, byUserId } = await fetchMembersIndex(gymId);

  // Resumen de inscripciones ACTIVAS por socio (actividad+pase, próximo
  // vencimiento, último pago). El detalle completo vive en Facturación.
  const { data: subscriptions, error: subErr } = await supabase
    .from("activity_subscriptions")
    .select("user_id, activity_id, activity_plan_id, due_date, last_payment_date")
    .eq("gym_id", gymId)
    .eq("status", "active");
  if (subErr) throw subErr;
  const subRows = (subscriptions ?? []) as Row[];

  const { data: activities, error: actErr } = await supabase
    .from("activities")
    .select("id, name")
    .eq("gym_id", gymId);
  if (actErr) throw actErr;
  const activityNameById = new Map((activities ?? []).map((a: Row) => [a.id, a.name]));

  const activityPlans = await fetchIn(
    "activity_plans",
    "id, label",
    "id",
    subRows.map((s) => s.activity_plan_id)
  );
  const planLabelById = new Map(activityPlans.map((p) => [p.id, p.label]));

  const subsByProfile = new Map<string, Row[]>();
  for (const s of subRows) {
    const list = subsByProfile.get(s.user_id) ?? [];
    list.push(s);
    subsByProfile.set(s.user_id, list);
  }
  const summarize = (profileId: string) => {
    const subs = subsByProfile.get(profileId) ?? [];
    const names = subs
      .map((s) => {
        const activity = activityNameById.get(s.activity_id) ?? "";
        const label = planLabelById.get(s.activity_plan_id);
        return label ? `${activity} (${label})` : activity;
      })
      .filter(Boolean);
    const dueDates = subs.map((s) => s.due_date).filter(Boolean).sort();
    const payDates = subs.map((s) => s.last_payment_date).filter(Boolean).sort();
    return {
      activities: names.join(", ") || null,
      due_date: dueDates[0] ?? null,
      last_payment_date: payDates[payDates.length - 1] ?? null,
    };
  };

  const rows = memberships
    .map((m) => {
      const p = byUserId.get(m.user_id);
      if (!p) return null;
      return {
        ...summarize(p.id),
        id: p.id,
        name: p.name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        document_number: p.document_number,
        address: p.address,
        gender: optionLabel(PROFILE_GENDERS, p.gender),
        role: (ROLE_LABELS as Record<string, string>)[m.role] ?? m.role,
        membership_status: m.status === "active" ? "Activa" : "Inactiva",
        is_active: boolLabel(p.is_active),
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => String(a.last_name ?? "").localeCompare(String(b.last_name ?? "")));

  return [sheet(SHEET.socios, SOCIOS_COLUMNS, rows)];
}

// ── Catálogo (máquinas, ejercicios, sesiones, planes) ──

async function buildCatalogoSheets(gymId: string): Promise<SheetData[]> {
  const supabase = getBrowserSupabase();

  const { data: equipment, error: eqErr } = await supabase
    .from("equipment")
    .select("id, name, image_uri")
    .eq("gym_id", gymId)
    .order("name");
  if (eqErr) throw eqErr;
  const equipmentNameById = new Map(
    (equipment ?? []).map((e: Row) => [e.id, e.name])
  );

  const { data: exercises, error: exErr } = await supabase
    .from("exercises_base")
    .select(
      "id, name, category, muscle_group, instructions, youtube_video_url, image_uri, video_uri, is_unilateral"
    )
    .eq("gym_id", gymId)
    .order("name");
  if (exErr) throw exErr;

  const links = await fetchIn(
    "exercise_equipment",
    "exercise_id, equipment_id",
    "exercise_id",
    (exercises ?? []).map((e: Row) => e.id)
  );
  const equipmentByExercise = new Map<string, string[]>();
  for (const link of links) {
    const name = equipmentNameById.get(link.equipment_id);
    if (!name) continue;
    const list = equipmentByExercise.get(link.exercise_id) ?? [];
    list.push(name);
    equipmentByExercise.set(link.exercise_id, list);
  }

  const exerciseRows = (exercises ?? []).map((e: Row) => ({
    ...e,
    category: optionLabel(EXERCISE_CATEGORIES, e.category),
    muscle_group: optionLabel(MUSCLE_GROUPS, e.muscle_group),
    equipment_names: (equipmentByExercise.get(e.id) ?? []).join(EQUIPMENT_SEPARATOR),
    is_unilateral: boolLabel(e.is_unilateral),
  }));

  const { data: sessions, error: sesErr } = await supabase
    .from("sessions")
    .select("id, name, description, level, cover_image_uri")
    .eq("gym_id", gymId)
    .order("name");
  if (sesErr) throw sesErr;
  const sessionNameById = new Map((sessions ?? []).map((s: Row) => [s.id, s.name]));
  const exerciseNameById = new Map((exercises ?? []).map((e: Row) => [e.id, e.name]));

  const sessionExercises = await fetchIn(
    "session_exercises",
    "id, session_id, exercise_id, position",
    "session_id",
    (sessions ?? []).map((s: Row) => s.id)
  );
  const sessionExerciseRows = sessionExercises
    .sort((a, b) =>
      a.session_id === b.session_id
        ? a.position - b.position
        : String(sessionNameById.get(a.session_id)).localeCompare(
            String(sessionNameById.get(b.session_id))
          )
    )
    .map((se) => ({
      ...se,
      session_name: sessionNameById.get(se.session_id) ?? null,
      exercise_name: exerciseNameById.get(se.exercise_id) ?? null,
    }));

  const { data: plans, error: plErr } = await supabase
    .from("training_plans")
    .select(
      "id, name, description, objective, level, target_gender, weekly_days, duration_weeks, is_published"
    )
    .eq("gym_id", gymId)
    .order("name");
  if (plErr) throw plErr;

  const planRows = (plans ?? []).map((p: Row) => ({
    ...p,
    objective: optionLabel(PLAN_OBJECTIVES, p.objective),
    level: optionLabel(PLAN_LEVELS, p.level),
    is_published: boolLabel(p.is_published),
  }));

  // Árbol aplanado: una fila por serie prescripta, vía el fetcher del builder.
  const planDetailRows: Row[] = [];
  for (const plan of (plans ?? []) as Row[]) {
    const detail = await fetchAdminPlanDetail(plan.id);
    if (!detail) continue;
    for (const week of detail.weeks) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          ex.set_configs.forEach((set, i) => {
            planDetailRows.push({
              plan_id: plan.id,
              plan_name: plan.name,
              week: week.week_number,
              day: day.day_number,
              session_name: day.session_name,
              exercise_name: ex.exercise_name,
              position: ex.position,
              set_number: i + 1,
              reps_min: set.reps_min,
              reps_max: set.reps_max,
              weight_kg: set.weight_kg,
              duration_seconds: set.duration_seconds,
              rest_seconds: set.rest_seconds,
              rir: ex.rir,
              rpe: ex.rpe,
              tempo: ex.tempo || null,
              notes: ex.notes || null,
            });
          });
        }
      }
    }
  }

  return [
    sheet(SHEET.equipment, EQUIPMENT_COLUMNS, equipment ?? []),
    sheet(SHEET.exercises, EXERCISES_COLUMNS, exerciseRows),
    sheet(SHEET.sessions, SESSIONS_COLUMNS, sessions ?? []),
    sheet(SHEET.sessionExercises, SESSION_EXERCISES_COLUMNS, sessionExerciseRows),
    sheet(SHEET.plans, PLANS_COLUMNS, planRows),
    sheet(SHEET.planDetail, PLAN_DETAIL_COLUMNS, planDetailRows),
  ];
}

// ── Facturación (inscripciones y pagos) ──

async function buildFacturacionSheets(gymId: string): Promise<SheetData[]> {
  const supabase = getBrowserSupabase();
  const { byProfileId } = await fetchMembersIndex(gymId);

  const { data: activities, error: actErr } = await supabase
    .from("activities")
    .select("id, name")
    .eq("gym_id", gymId);
  if (actErr) throw actErr;
  const activityNameById = new Map((activities ?? []).map((a: Row) => [a.id, a.name]));

  const { data: subscriptions, error: subErr } = await supabase
    .from("activity_subscriptions")
    .select("*")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });
  if (subErr) throw subErr;

  const activityPlans = await fetchIn(
    "activity_plans",
    "id, label",
    "id",
    (subscriptions ?? []).map((s: Row) => s.activity_plan_id)
  );
  const planLabelById = new Map(activityPlans.map((p) => [p.id, p.label]));

  await resolveProfiles(
    byProfileId,
    (subscriptions ?? []).map((s: Row) => s.user_id)
  );

  const SUB_STATUS: Record<string, string> = {
    active: "Activa",
    paused: "Pausada",
    cancelled: "Cancelada",
  };

  const subscriptionRows = ((subscriptions ?? []) as Row[]).map((s) => {
    const p = byProfileId.get(s.user_id);
    return {
      member_name: fullName(p),
      email: p?.email ?? null,
      activity_name: activityNameById.get(s.activity_id) ?? null,
      plan_label: planLabelById.get(s.activity_plan_id) ?? null,
      price: s.price,
      status: SUB_STATUS[s.status] ?? s.status,
      start_date: s.start_date,
      due_date: s.due_date,
      last_payment_date: s.last_payment_date,
      end_date: s.end_date,
    };
  });

  const { data: payments, error: payErr } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("gym_id", gymId)
    .order("paid_at", { ascending: false });
  if (payErr) throw payErr;

  await resolveProfiles(
    byProfileId,
    ((payments ?? []) as Row[]).flatMap((p) => [p.user_id, p.registered_by])
  );

  const paymentRows = ((payments ?? []) as Row[]).map((p) => ({
    paid_at: p.paid_at,
    member_name: fullName(byProfileId.get(p.user_id)),
    activity_name: activityNameById.get(p.activity_id) ?? null,
    amount: p.amount,
    registered_by_name: fullName(byProfileId.get(p.registered_by)),
    voided: boolLabel(!!p.voided_at),
  }));

  const { data: coachPayments, error: cpErr } = await supabase
    .from("coach_payments")
    .select("*")
    .eq("gym_id", gymId)
    .order("period_start", { ascending: false });
  if (cpErr) throw cpErr;

  await resolveProfiles(
    byProfileId,
    ((coachPayments ?? []) as Row[]).map((p) => p.coach_id)
  );

  const coachPaymentRows = ((coachPayments ?? []) as Row[]).map((p) => ({
    ...p,
    coach_name: fullName(byProfileId.get(p.coach_id)),
  }));

  return [
    sheet(SHEET.subscriptions, SUBSCRIPTIONS_COLUMNS, subscriptionRows),
    sheet(SHEET.memberPayments, MEMBER_PAYMENTS_COLUMNS, paymentRows),
    sheet(SHEET.coachPayments, COACH_PAYMENTS_COLUMNS, coachPaymentRows),
  ];
}

// ── Registros de entrenamiento del socio logueado ──
// Se usa desde la sección Progreso del member: exporta SOLO los entrenamientos
// propios (profileId = profiles.id del socio; la RLS de session_logs ya limita
// a las filas propias, el filtro explícito lo hace evidente).

export async function buildMemberWorkoutSheets(
  gymId: string,
  profileId: string
): Promise<SheetData[]> {
  const supabase = getBrowserSupabase();
  const byProfileId = new Map<string, Row>();

  const { data: logs, error: logErr } = await supabase
    .from("session_logs")
    .select("*")
    .eq("gym_id", gymId)
    .eq("user_id", profileId)
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });
  if (logErr) throw logErr;

  const logRows = (logs ?? []) as Row[];
  await resolveProfiles(byProfileId, logRows.map((l) => l.user_id));

  const sessionNames = await fetchIn(
    "sessions",
    "id, name",
    "id",
    logRows.map((l) => l.session_id)
  );
  const sessionNameById = new Map(sessionNames.map((s) => [s.id, s.name]));

  const planNames = await fetchIn(
    "training_plans",
    "id, name",
    "id",
    logRows.map((l) => l.plan_id)
  );
  const planNameById = new Map(planNames.map((p) => [p.id, p.name]));

  const workoutRows = logRows.map((l) => ({
    id: l.id,
    member_name: fullName(byProfileId.get(l.user_id)),
    session_name: sessionNameById.get(l.session_id) ?? null,
    plan_name: planNameById.get(l.plan_id) ?? null,
    week_number: l.week_number,
    day_number: l.day_number,
    duration_seconds: l.duration_seconds,
    completed_at: l.completed_at,
  }));

  const sets = await fetchIn(
    "session_set_logs",
    "*",
    "session_log_id",
    logRows.map((l) => l.id)
  );
  const liveSets = sets.filter((s) => !s.deleted_at);

  const exerciseNames = await fetchIn(
    "exercises_base",
    "id, name",
    "id",
    liveSets.map((s) => s.exercise_id)
  );
  const exerciseNameById = new Map(exerciseNames.map((e) => [e.id, e.name]));

  const setRows = liveSets
    .sort((a, b) =>
      a.session_log_id === b.session_log_id
        ? a.set_number - b.set_number
        : String(a.session_log_id).localeCompare(String(b.session_log_id))
    )
    .map((s) => ({
      session_log_id: s.session_log_id,
      exercise_name: exerciseNameById.get(s.exercise_id) ?? null,
      set_number: s.set_number,
      reps: s.reps,
      weight_kg: s.weight_kg,
      rest_seconds: s.rest_seconds,
      rir: s.rir,
      rpe: s.rpe,
      notes: s.notes,
    }));

  return [
    sheet(SHEET.workoutLogs, WORKOUT_LOGS_COLUMNS, workoutRows),
    sheet(SHEET.workoutSets, WORKOUT_SETS_COLUMNS, setRows),
  ];
}

// ── Entry point ──

export type ExportFailure = { group: ExportGroup; message: string };
export type ExportBuild = { sheets: SheetData[]; failures: ExportFailure[] };

// Cada grupo se arma por separado: si uno falla (RLS, red, esquema), los demás
// igual se exportan y el error del grupo se reporta con su mensaje real.
// La hoja Leeme va al final para que el archivo abra en los datos.
export async function buildExportSheets(
  gymId: string,
  groups: ExportGroup[]
): Promise<ExportBuild> {
  const builders: [ExportGroup, (id: string) => Promise<SheetData[]>][] = [
    ["socios", buildSociosSheets],
    ["catalogo", buildCatalogoSheets],
    ["facturacion", buildFacturacionSheets],
  ];

  const sheets: SheetData[] = [];
  const failures: ExportFailure[] = [];
  for (const [group, build] of builders) {
    if (!groups.includes(group)) continue;
    try {
      sheets.push(...(await build(gymId)));
    } catch (err) {
      failures.push({ group, message: (err as Error).message });
    }
  }
  sheets.push({ name: SHEET.leeme, headers: [], rows: [], aoa: LEEME_AOA });
  return { sheets, failures };
}

export const exportFilename = () =>
  `gymtrack-datos-${new Date().toISOString().slice(0, 10)}.xlsx`;

export const memberWorkoutFilename = () =>
  `gymtrack-mis-entrenamientos-${new Date().toISOString().slice(0, 10)}.xlsx`;
