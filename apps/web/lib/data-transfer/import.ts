// Import del workbook de Datos: parsear el .xlsx, validar cada fila, clasificar
// en crear/actualizar contra lo existente (bajo RLS) y aplicar en orden
// padre→hijo. Regla general: ID vacío = crear, ID existente = actualizar, nunca
// borrar. Las hojas solo-export se ignoran. Sin transacciones cross-tabla desde
// el cliente: ante un fallo se corta esa hoja y se reporta lo aplicado;
// reejecutar el mismo archivo es idempotente (lo creado pasa a ser update).

import { z } from "zod";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { normLower } from "@/lib/hooks/use-admin-member";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  PLAN_LEVELS,
  type Option,
} from "@/lib/catalog-options";
import { PROFILE_GENDERS } from "@/lib/gender-options";
import { ROLES, ROLE_LABELS } from "@gymtrack/core/roles";
import { readWorkbookFile, type ParsedRow } from "./xlsx";
import {
  SHEET,
  SOCIOS_COLUMNS,
  EQUIPMENT_COLUMNS,
  EXERCISES_COLUMNS,
  SESSIONS_COLUMNS,
  fromSheetRow,
  normText,
  asText,
  asBool,
  matchOption,
  splitEquipmentNames,
} from "./sheets";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export type RowError = { row: number; message: string };

export type SheetPlan<T> = {
  sheet: string;
  creates: T[];
  updates: T[];
  errors: RowError[];
};

type EquipmentWrite = { row: number; id: string; name: string };

type ExerciseWrite = {
  row: number;
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  equipment_ids: string[];
  is_unilateral: boolean;
  instructions: string;
  youtube_video_url: string;
};

type SessionWrite = {
  row: number;
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  // Ejercicios de la columna "Ejercicios" en orden. Vacía = no tocar los
  // vínculos; con nombres = agregar/reordenar (nunca quitar: los planes
  // referencian session_exercises existentes).
  exercise_ids: string[];
};

type SocioCreate = {
  row: number;
  email: string;
  name: string | null;
  last_name: string | null;
  phone: string | null;
  document_number: string | null;
  address: string | null;
  gender: string | null;
  role: string;
};

type SocioUpdate = {
  row: number;
  profile_id: string;
  user_id: string;
  fields: {
    name: string | null;
    last_name: string | null;
    phone: string | null;
    document_number: string | null;
    address: string | null;
    gender: string | null;
  };
  is_active: boolean | null;
  role: string | null;
  membership_status: string | null;
};

export type ImportPlan = {
  gymId: string;
  socios: SheetPlan<SocioCreate | SocioUpdate>;
  equipment: SheetPlan<EquipmentWrite>;
  exercises: SheetPlan<ExerciseWrite>;
  sessions: SheetPlan<SessionWrite>;
  // Hojas importables presentes en el archivo (para avisar si no se encontró ninguna).
  sheetsFound: string[];
};

export type SheetResult = {
  sheet: string;
  created: number;
  updated: number;
  errors: RowError[];
};

export type ImportResult = SheetResult[];

const CHUNK = 200;

const ROLE_OPTIONS: Option[] = [
  { label: ROLE_LABELS[ROLES.MEMBER], value: ROLES.MEMBER },
  { label: ROLE_LABELS[ROLES.COACH], value: ROLES.COACH },
  { label: ROLE_LABELS[ROLES.ADMIN], value: ROLES.ADMIN },
  { label: ROLE_LABELS[ROLES.OWNER], value: ROLES.OWNER },
];

const MEMBERSHIP_STATUS_OPTIONS: Option[] = [
  { label: "Activa", value: "active" },
  { label: "Inactiva", value: "inactive" },
];

const emailSchema = z.string().email();

// Busca una hoja por nombre normalizado (tolera mayúsculas/acentos/espacios).
function findSheet(
  workbook: Record<string, ParsedRow[]>,
  name: string
): ParsedRow[] | null {
  const target = normText(name).replace(/[\s_]+/g, "_");
  for (const [sheetName, rows] of Object.entries(workbook)) {
    if (normText(sheetName).replace(/[\s_]+/g, "_") === target) return rows;
  }
  return null;
}

async function fetchIdsIn(
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

const emptyPlan = <T>(sheet: string): SheetPlan<T> => ({
  sheet,
  creates: [],
  updates: [],
  errors: [],
});

// ── Armado del plan (parse + validación + diff) ──

export async function buildImportPlan(
  gymId: string,
  file: File
): Promise<ImportPlan> {
  const workbook = await readWorkbookFile(file);
  const supabase = getBrowserSupabase();

  const sociosRows = findSheet(workbook, SHEET.socios);
  const equipmentRows = findSheet(workbook, SHEET.equipment);
  const exerciseRows = findSheet(workbook, SHEET.exercises);
  const sessionRows = findSheet(workbook, SHEET.sessions);

  const sheetsFound: string[] = [];
  if (sociosRows) sheetsFound.push(SHEET.socios);
  if (equipmentRows) sheetsFound.push(SHEET.equipment);
  if (exerciseRows) sheetsFound.push(SHEET.exercises);
  if (sessionRows) sheetsFound.push(SHEET.sessions);

  const plan: ImportPlan = {
    gymId,
    socios: emptyPlan(SHEET.socios),
    equipment: emptyPlan(SHEET.equipment),
    exercises: emptyPlan(SHEET.exercises),
    sessions: emptyPlan(SHEET.sessions),
    sheetsFound,
  };
  if (!sheetsFound.length) return plan;

  // ── Estado existente del gym (RLS acota todo al gym activo) ──

  const { data: existingEquipment, error: eqErr } = await supabase
    .from("equipment")
    .select("id, name")
    .eq("gym_id", gymId);
  if (eqErr) throw eqErr;
  const equipmentIds = new Set((existingEquipment ?? []).map((e: Row) => e.id));
  // nombre normalizado → id, para resolver la columna Equipamiento de Ejercicios.
  const equipmentIdByName = new Map<string, string>();
  for (const e of (existingEquipment ?? []) as Row[]) {
    if (e.name) equipmentIdByName.set(normText(e.name), e.id);
  }

  const { data: existingExercises, error: exErr } = await supabase
    .from("exercises_base")
    .select("id, name")
    .eq("gym_id", gymId);
  if (exErr) throw exErr;
  const exerciseIds = new Set((existingExercises ?? []).map((e: Row) => e.id));
  // nombre normalizado → id, para resolver la columna Ejercicios de Sesiones.
  const exerciseIdByName = new Map<string, string>();
  for (const e of (existingExercises ?? []) as Row[]) {
    if (e.name) exerciseIdByName.set(normText(e.name), e.id);
  }

  const { data: existingSessions, error: sesErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("gym_id", gymId);
  if (sesErr) throw sesErr;
  const sessionIds = new Set((existingSessions ?? []).map((s: Row) => s.id));

  let profileById = new Map<string, Row>();
  if (sociosRows?.length) {
    const { data: memberships, error: memErr } = await supabase
      .from("memberships")
      .select("user_id, role, status")
      .eq("gym_id", gymId);
    if (memErr) throw memErr;
    const memberUserIds = (memberships ?? []).map((m: Row) => m.user_id);
    const profiles = await fetchIdsIn("profiles", "*", "user_id", memberUserIds);
    profileById = new Map(profiles.map((p) => [p.id, p]));
  }

  // Un mismo ID dos veces en el archivo rompería el upsert en bloque ("cannot
  // affect row a second time"): la segunda aparición se marca como error.
  const seenIds = new Map<string, Set<string>>();
  const isDuplicateId = (sheetName: string, id: string) => {
    let seen = seenIds.get(sheetName);
    if (!seen) seenIds.set(sheetName, (seen = new Set()));
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  };

  // ── Equipamiento ──

  for (const raw of equipmentRows ?? []) {
    const r = fromSheetRow(EQUIPMENT_COLUMNS, raw);
    const rowNum = raw.__row;
    const id = asText(r.id);
    const name = asText(r.name);
    if (!name) {
      plan.equipment.errors.push({ row: rowNum, message: "Falta el nombre." });
      continue;
    }
    if (id) {
      if (!equipmentIds.has(id)) {
        plan.equipment.errors.push({
          row: rowNum,
          message: `ID desconocido para este gimnasio: ${id}`,
        });
        continue;
      }
      if (isDuplicateId(SHEET.equipment, id)) {
        plan.equipment.errors.push({
          row: rowNum,
          message: `ID repetido en el archivo: ${id}`,
        });
        continue;
      }
      plan.equipment.updates.push({ row: rowNum, id, name });
      equipmentIdByName.set(normText(name), id);
    } else {
      const newId = crypto.randomUUID();
      plan.equipment.creates.push({ row: rowNum, id: newId, name });
      equipmentIdByName.set(normText(name), newId);
    }
  }

  // ── Ejercicios ──

  for (const raw of exerciseRows ?? []) {
    const r = fromSheetRow(EXERCISES_COLUMNS, raw);
    const rowNum = raw.__row;
    const id = asText(r.id);
    const name = asText(r.name);
    const category = matchOption(EXERCISE_CATEGORIES, r.category);
    const muscleGroup = matchOption(MUSCLE_GROUPS, r.muscle_group);

    const problems: string[] = [];
    if (!name) problems.push("falta el nombre");
    if (!category)
      problems.push(
        `categoría inválida "${asText(r.category) ?? ""}" (valores: ${EXERCISE_CATEGORIES.map((o) => o.label).join(", ")})`
      );
    if (!muscleGroup)
      problems.push(
        `grupo muscular inválido "${asText(r.muscle_group) ?? ""}" (valores: ${MUSCLE_GROUPS.map((o) => o.label).join(", ")})`
      );

    const equipmentIdsForRow: string[] = [];
    for (const eqName of splitEquipmentNames(r.equipment_names)) {
      const eqId = equipmentIdByName.get(normText(eqName));
      if (!eqId) problems.push(`equipamiento desconocido "${eqName}"`);
      else equipmentIdsForRow.push(eqId);
    }

    if (id && !exerciseIds.has(id)) {
      problems.push(`ID desconocido para este gimnasio: ${id}`);
    } else if (id && isDuplicateId(SHEET.exercises, id)) {
      problems.push(`ID repetido en el archivo: ${id}`);
    }

    if (problems.length) {
      plan.exercises.errors.push({
        row: rowNum,
        message: problems.join("; ") + ".",
      });
      continue;
    }

    const write: ExerciseWrite = {
      row: rowNum,
      id: id ?? crypto.randomUUID(),
      name: name as string,
      category: category as string,
      muscle_group: muscleGroup as string,
      equipment_ids: [...new Set(equipmentIdsForRow)],
      is_unilateral: asBool(r.is_unilateral) ?? false,
      instructions: asText(r.instructions) ?? "",
      youtube_video_url: asText(r.youtube_video_url) ?? "",
    };
    if (id) plan.exercises.updates.push(write);
    else plan.exercises.creates.push(write);
    // Disponible para la columna Ejercicios de Sesiones (incluye los nuevos).
    exerciseIdByName.set(normText(write.name), write.id);
  }

  // ── Sesiones ──

  for (const raw of sessionRows ?? []) {
    const r = fromSheetRow(SESSIONS_COLUMNS, raw);
    const rowNum = raw.__row;
    const id = asText(r.id);
    const name = asText(r.name);
    const levelInput = asText(r.level);
    const level = levelInput ? matchOption(PLAN_LEVELS, levelInput) : null;

    const problems: string[] = [];
    if (!name) problems.push("falta el nombre");
    if (levelInput && !level)
      problems.push(
        `nivel inválido "${levelInput}" (valores: ${PLAN_LEVELS.map((o) => o.label).join(", ")})`
      );
    if (id && !sessionIds.has(id))
      problems.push(`ID desconocido para este gimnasio: ${id}`);
    else if (id && isDuplicateId(SHEET.sessions, id))
      problems.push(`ID repetido en el archivo: ${id}`);

    // Columna Ejercicios: nombres → ids (existentes o creados en este archivo).
    const exerciseIdsForRow: string[] = [];
    for (const exName of splitEquipmentNames(r.exercise_names)) {
      const exId = exerciseIdByName.get(normText(exName));
      if (!exId) problems.push(`ejercicio desconocido "${exName}"`);
      else exerciseIdsForRow.push(exId);
    }

    if (problems.length) {
      plan.sessions.errors.push({ row: rowNum, message: problems.join("; ") + "." });
      continue;
    }

    const write: SessionWrite = {
      row: rowNum,
      id: id ?? crypto.randomUUID(),
      name: name as string,
      description: asText(r.description),
      level,
      exercise_ids: [...new Set(exerciseIdsForRow)],
    };
    if (id) plan.sessions.updates.push(write);
    else plan.sessions.creates.push(write);
  }

  // ── Socios ──

  for (const raw of sociosRows ?? []) {
    const r = fromSheetRow(SOCIOS_COLUMNS, raw);
    const rowNum = raw.__row;
    const id = asText(r.id);
    const email = asText(r.email);
    const genderInput = asText(r.gender);
    const gender = genderInput ? matchOption(PROFILE_GENDERS, genderInput) : null;
    const roleInput = asText(r.role);
    const role = roleInput ? matchOption(ROLE_OPTIONS, roleInput) : null;
    const statusInput = asText(r.membership_status);
    const status = statusInput
      ? matchOption(MEMBERSHIP_STATUS_OPTIONS, statusInput)
      : null;

    const problems: string[] = [];
    if (genderInput && !gender)
      problems.push(
        `género inválido "${genderInput}" (valores: ${PROFILE_GENDERS.map((o) => o.label).join(", ")})`
      );
    if (roleInput && !role)
      problems.push(
        `rol inválido "${roleInput}" (valores: ${ROLE_OPTIONS.map((o) => o.label).join(", ")})`
      );
    if (statusInput && !status)
      problems.push(`membresía inválida "${statusInput}" (valores: Activa, Inactiva)`);

    if (id) {
      const profile = profileById.get(id);
      if (!profile) problems.push(`ID desconocido para este gimnasio: ${id}`);
      else if (isDuplicateId(SHEET.socios, id))
        problems.push(`ID repetido en el archivo: ${id}`);
      if (problems.length) {
        plan.socios.errors.push({ row: rowNum, message: problems.join("; ") + "." });
        continue;
      }
      plan.socios.updates.push({
        row: rowNum,
        profile_id: id,
        user_id: profile!.user_id,
        fields: {
          name: normLower(asText(r.name)),
          last_name: normLower(asText(r.last_name)),
          phone: asText(r.phone),
          document_number: asText(r.document_number),
          address: normLower(asText(r.address)),
          gender,
        },
        is_active: asBool(r.is_active),
        role,
        membership_status: status,
      });
    } else {
      if (!email || !emailSchema.safeParse(email).success)
        problems.push(`email inválido o faltante "${email ?? ""}" (obligatorio para socios nuevos)`);
      if (problems.length) {
        plan.socios.errors.push({ row: rowNum, message: problems.join("; ") + "." });
        continue;
      }
      plan.socios.creates.push({
        row: rowNum,
        email: (email as string).toLowerCase(),
        name: asText(r.name),
        last_name: asText(r.last_name),
        phone: asText(r.phone),
        document_number: asText(r.document_number),
        address: asText(r.address),
        gender,
        role: role ?? ROLES.MEMBER,
      });
    }
  }

  return plan;
}

// ── Aplicación ──

async function insertChunks(table: string, rows: Row[]) {
  const supabase = getBrowserSupabase();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
  }
}

async function upsertChunks(table: string, rows: Row[]) {
  const supabase = getBrowserSupabase();
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
}

// Mensaje real del edge function (viene en el body del error de invoke).
async function invokeErrorMessage(error: unknown, fallback: string) {
  const ctx = (error as { context?: { json: () => Promise<unknown> } })?.context;
  if (ctx) {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // sin cuerpo parseable
    }
  }
  return (error as Error)?.message || fallback;
}

export async function applyImportPlan(plan: ImportPlan): Promise<ImportResult> {
  const supabase = getBrowserSupabase();
  const now = new Date().toISOString();
  const results: ImportResult = [];

  // ── Equipamiento ──
  {
    const res: SheetResult = { sheet: SHEET.equipment, created: 0, updated: 0, errors: [] };
    try {
      await insertChunks(
        "equipment",
        plan.equipment.creates.map((e) => ({
          id: e.id,
          gym_id: plan.gymId,
          name: e.name,
          created_at: now,
          updated_at: now,
        }))
      );
      res.created = plan.equipment.creates.length;
      await upsertChunks(
        "equipment",
        plan.equipment.updates.map((e) => ({
          id: e.id,
          gym_id: plan.gymId,
          name: e.name,
          updated_at: now,
        }))
      );
      res.updated = plan.equipment.updates.length;
    } catch (err) {
      res.errors.push({ row: 0, message: (err as Error).message });
    }
    results.push(res);
  }

  // ── Ejercicios (+ links de equipamiento) ──
  {
    const res: SheetResult = { sheet: SHEET.exercises, created: 0, updated: 0, errors: [] };
    try {
      await insertChunks(
        "exercises_base",
        plan.exercises.creates.map((e) => ({
          id: e.id,
          gym_id: plan.gymId,
          is_catalog: false,
          name: e.name,
          category: e.category,
          muscle_group: e.muscle_group,
          is_unilateral: e.is_unilateral,
          instructions: e.instructions,
          youtube_video_url: e.youtube_video_url,
          created_at: now,
          updated_at: now,
        }))
      );
      res.created = plan.exercises.creates.length;
      await upsertChunks(
        "exercises_base",
        plan.exercises.updates.map((e) => ({
          id: e.id,
          gym_id: plan.gymId,
          name: e.name,
          category: e.category,
          muscle_group: e.muscle_group,
          is_unilateral: e.is_unilateral,
          instructions: e.instructions,
          youtube_video_url: e.youtube_video_url,
          updated_at: now,
        }))
      );
      res.updated = plan.exercises.updates.length;

      // La columna Equipamiento es autoritativa por fila: borrar y reinsertar
      // los links (mismo patrón que useSaveAdminExercise).
      const all = [...plan.exercises.creates, ...plan.exercises.updates];
      const allIds = all.map((e) => e.id);
      for (let i = 0; i < allIds.length; i += CHUNK) {
        const { error } = await supabase
          .from("exercise_equipment")
          .delete()
          .in("exercise_id", allIds.slice(i, i + CHUNK));
        if (error) throw new Error(error.message);
      }
      await insertChunks(
        "exercise_equipment",
        all.flatMap((e) =>
          e.equipment_ids.map((equipmentId) => ({
            id: crypto.randomUUID(),
            exercise_id: e.id,
            equipment_id: equipmentId,
            created_at: now,
            updated_at: now,
          }))
        )
      );
    } catch (err) {
      res.errors.push({ row: 0, message: (err as Error).message });
    }
    results.push(res);
  }

  // ── Sesiones ──
  {
    const res: SheetResult = { sheet: SHEET.sessions, created: 0, updated: 0, errors: [] };
    try {
      const { data: auth } = await supabase.auth.getUser();
      await insertChunks(
        "sessions",
        plan.sessions.creates.map((s) => ({
          id: s.id,
          gym_id: plan.gymId,
          is_catalog: false,
          name: s.name,
          description: s.description,
          level: s.level,
          created_by: auth?.user?.id ?? null,
          created_at: now,
          updated_at: now,
        }))
      );
      res.created = plan.sessions.creates.length;
      await upsertChunks(
        "sessions",
        plan.sessions.updates.map((s) => ({
          id: s.id,
          gym_id: plan.gymId,
          name: s.name,
          description: s.description,
          level: s.level,
          updated_at: now,
        }))
      );
      res.updated = plan.sessions.updates.length;

      // Columna Ejercicios: merge sin borrar. Los listados quedan primero en su
      // orden; los vínculos existentes no listados se conservan al final (los
      // planes referencian session_exercises por id, borrarlos rompería planes).
      const withExercises = [...plan.sessions.creates, ...plan.sessions.updates]
        .filter((s) => s.exercise_ids.length);
      if (withExercises.length) {
        const existingLinks = await fetchIdsIn(
          "session_exercises",
          "id, session_id, exercise_id, position",
          "session_id",
          withExercises.map((s) => s.id)
        );
        const linksBySession = new Map<string, Row[]>();
        for (const link of existingLinks) {
          const list = linksBySession.get(link.session_id) ?? [];
          list.push(link);
          linksBySession.set(link.session_id, list);
        }

        const linkUpdates: Row[] = [];
        const linkInserts: Row[] = [];
        for (const s of withExercises) {
          const existing = (linksBySession.get(s.id) ?? []).sort(
            (a, b) => a.position - b.position
          );
          const linkByExercise = new Map(existing.map((l) => [l.exercise_id, l]));
          const listed = new Set(s.exercise_ids);

          s.exercise_ids.forEach((exerciseId, idx) => {
            const link = linkByExercise.get(exerciseId);
            if (link)
              linkUpdates.push({
                id: link.id,
                session_id: s.id,
                exercise_id: exerciseId,
                position: idx,
                updated_at: now,
              });
            else
              linkInserts.push({
                id: crypto.randomUUID(),
                session_id: s.id,
                exercise_id: exerciseId,
                position: idx,
                created_at: now,
                updated_at: now,
              });
          });

          existing
            .filter((l) => !listed.has(l.exercise_id))
            .forEach((l, i) =>
              linkUpdates.push({
                id: l.id,
                session_id: s.id,
                exercise_id: l.exercise_id,
                position: s.exercise_ids.length + i,
                updated_at: now,
              })
            );
        }
        await upsertChunks("session_exercises", linkUpdates);
        await insertChunks("session_exercises", linkInserts);
      }
    } catch (err) {
      res.errors.push({ row: 0, message: (err as Error).message });
    }
    results.push(res);
  }

  // ── Socios ──
  // Updates directos bajo RLS; altas una a una vía crear-socio (la edge function
  // crea la cuenta con service role y maneja emails ya registrados).
  {
    const res: SheetResult = { sheet: SHEET.socios, created: 0, updated: 0, errors: [] };

    for (const u of plan.socios.updates as SocioUpdate[]) {
      try {
        const fields: Row = { ...u.fields };
        if (u.is_active !== null) fields.is_active = u.is_active;
        const { error } = await supabase
          .from("profiles")
          .update(fields)
          .eq("id", u.profile_id);
        if (error) throw new Error(error.message);

        if (u.role || u.membership_status) {
          const patch: Row = {};
          if (u.role) patch.role = u.role;
          if (u.membership_status) patch.status = u.membership_status;
          const { error: memErr } = await supabase
            .from("memberships")
            .update(patch)
            .eq("user_id", u.user_id)
            .eq("gym_id", plan.gymId);
          if (memErr) throw new Error(memErr.message);
        }
        res.updated += 1;
      } catch (err) {
        res.errors.push({ row: u.row, message: (err as Error).message });
      }
    }

    for (const c of plan.socios.creates as SocioCreate[]) {
      const { error } = await supabase.functions.invoke("crear-socio", {
        body: {
          gym_id: plan.gymId,
          email: c.email,
          name: c.name,
          last_name: c.last_name,
          phone: c.phone,
          document_number: c.document_number,
          address: c.address,
          gender: c.gender,
          role: c.role,
        },
      });
      if (error) {
        res.errors.push({
          row: c.row,
          message: await invokeErrorMessage(error, "Error al crear el socio."),
        });
      } else {
        res.created += 1;
      }
    }

    results.push(res);
  }

  // Solo reportar hojas presentes en el archivo.
  return results.filter((r) => plan.sheetsFound.includes(r.sheet));
}
