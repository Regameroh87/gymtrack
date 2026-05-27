import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "./index";
import {
  exercises_base,
  equipment,
  exercise_equipment,
  plan_assignments,
  plan_week_day_exercise_sets,
  plan_week_day_exercises,
  plan_week_days,
  plan_weeks,
  session_exercises,
  sessions,
  training_plans,
  session_logs,
  session_set_logs,
} from "./schemas";
import { supabase } from "../database/supabase";
import { eq, ne, or, and, inArray, isNotNull } from "drizzle-orm";
import { uploadFileToCloudinary } from "../utils/uploadFileToCloudinary";
import { deleteMediaLocally } from "../utils/saveMediaLocally";
import { queryClient } from "../lib/queryClient";

const LAST_SYNC_KEY = "last_sync_at";
const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;
let isSyncing = false;

const TABLE_QUERY_KEYS = {
  sessions: [["sessions"], ["session"]],
  session_exercises: [["sessions"], ["session"]],
  exercises_base: [["exercises"], ["exercise"]],
  equipment: [["equipments"], ["equipment"]],
  exercise_equipment: [
    ["exercises"],
    ["exercise"],
    ["exercise_equipment_detail"],
  ],
  training_plans: [["training_plans"], ["training_plan"]],
  plan_assignments: [["plan_assignments"]],
  plan_weeks: [["training_plans"], ["training_plan"]],
  plan_week_days: [["training_plans"], ["training_plan"]],
  plan_week_day_exercises: [["training_plans"], ["training_plan"]],
  plan_week_day_exercise_sets: [["training_plans"], ["training_plan"]],
  session_logs: [["session_logs"], ["sessions"]],
  session_set_logs: [["session_logs"], ["sessions"]],
};

function invalidateQueriesForTable(tableName) {
  const keys = TABLE_QUERY_KEYS[tableName];
  if (!keys) return;
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey });
  }
}

const COMPOSITE_UNIQUE_COLUMNS = {
  session_exercises: ["session_id", "exercise_id"],
  plan_weeks: ["plan_id", "week_number"],
  plan_week_days: ["week_id", "day_number"],
  plan_week_day_exercises: ["week_day_id", "session_exercise_id"],
  plan_week_day_exercise_sets: ["exercise_id", "set_number"],
  session_set_logs: ["session_log_id", "exercise_id", "set_number"],
};

async function pullTableChanges(
  tableName,
  schemaTable,
  lastSync,
  gymId = null,
  compositeUniqueColumns = null,
  userId = null
) {
  let query = supabase
    .from(tableName)
    .select("*")
    .order("updated_at", { ascending: true });

  if (gymId) query = query.eq("gym_id", gymId);
  if (userId) query = query.eq("user_id", userId);
  if (lastSync) query = query.gte("updated_at", lastSync);

  const { data, error } = await query;

  if (error) {
    console.error(`❌ [PULL] Error descargando "${tableName}":`, error.message);
    return { success: false, changed: false, newLastSync: null };
  }

  let changed = false;
  let newLastSync = null;

  if (data && data.length > 0) {
    // No pisar filas locales con cambios pendientes (pending/dirty/deleted).
    // Esas las resuelve el PUSH de este mismo sync; el PULL siguiente ya
    // las traerá en su estado canónico.
    const remoteIds = data.map((r) => r.id);
    const lockedLocal = await database
      .select({ id: schemaTable.id })
      .from(schemaTable)
      .where(
        and(
          inArray(schemaTable.id, remoteIds),
          ne(schemaTable.sync_status, "synced")
        )
      );
    const lockedIds = new Set(lockedLocal.map((r) => r.id));

    let lockedCompositeKeys = null;
    if (compositeUniqueColumns) {
      const pendingRows = await database
        .select()
        .from(schemaTable)
        .where(ne(schemaTable.sync_status, "synced"));
      lockedCompositeKeys = new Set(
        pendingRows.map((r) =>
          compositeUniqueColumns.map((c) => r[c]).join("::")
        )
      );
    }

    let skipped = 0;
    for (const remoteRow of data) {
      if (lockedIds.has(remoteRow.id)) {
        skipped++;
        continue;
      }
      if (lockedCompositeKeys) {
        const key = compositeUniqueColumns.map((c) => remoteRow[c]).join("::");
        if (lockedCompositeKeys.has(key)) {
          skipped++;
          continue;
        }
      }
      remoteRow.sync_status = "synced";
      await database.insert(schemaTable).values(remoteRow).onConflictDoUpdate({
        target: schemaTable.id,
        set: remoteRow,
      });
    }
    changed = data.length - skipped > 0;
    newLastSync = data[data.length - 1].updated_at;
    console.log(
      `⬇️  [PULL] "${tableName}": ${data.length - skipped} aplicado(s)` +
        (skipped > 0 ? `, ${skipped} omitido(s) por cambios locales` : "")
    );
  }

  // Reconciliar borrados remotos: detectar registros locales "synced" que ya
  // no existen en Supabase (fueron borrados desde otro dispositivo)
  let idsQuery = supabase.from(tableName).select("id");
  if (gymId) idsQuery = idsQuery.eq("gym_id", gymId);
  if (userId) idsQuery = idsQuery.eq("user_id", userId);
  const { data: remoteIds, error: idsError } = await idsQuery;

  if (!idsError && remoteIds) {
    const remoteIdSet = new Set(remoteIds.map((r) => r.id));
    const localSynced = await database
      .select({ id: schemaTable.id })
      .from(schemaTable)
      .where(eq(schemaTable.sync_status, "synced"));
    const idsToDelete = localSynced
      .map((r) => r.id)
      .filter((id) => !remoteIdSet.has(id));

    if (idsToDelete.length > 0) {
      await database
        .delete(schemaTable)
        .where(inArray(schemaTable.id, idsToDelete));
      changed = true;
      console.log(
        `🗑️  [PULL] "${tableName}": ${idsToDelete.length} eliminado(s) localmente`
      );
    }
  }

  return { success: true, changed, newLastSync };
}

/**
 * PUSH: Sube cambios locales de Máquinas/Equipamiento
 */
export async function pushEquipmentChanges() {
  const localChanges = await database
    .select()
    .from(equipment)
    .where(
      or(
        eq(equipment.sync_status, "pending"),
        eq(equipment.sync_status, "dirty"),
        eq(equipment.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] equipment: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log(
        `🗑️  [PUSH] Eliminando equipamiento "${row.name}" (id: ${row.id})`
      );
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        await database.delete(equipment).where(eq(equipment.id, row.id));
        console.log(`✅ [PUSH] Equipamiento "${row.name}" eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando equipamiento "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    let updatedLocal = false;

    // 1. Subir Imagen a Cloudinary si es local
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo imagen de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          console.log(
            `✅ [PUSH] Imagen de "${row.name}" subida (${public_id})`
          );
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id;
          updatedLocal = true;
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de "${row.name}":`,
          err.message
        );
      }
    }

    if (updatedLocal) {
      await database
        .update(equipment)
        .set({
          image_uri: row.image_uri,
        })
        .where(eq(equipment.id, row.id));
    }

    // 2. Push a Supabase
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("equipment")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(equipment)
        .set({ sync_status: "synced" })
        .where(eq(equipment.id, row.id));
      console.log(`✅ [PUSH] Equipamiento "${row.name}" sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo equipamiento "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios (Media Pesada)
 */
export async function pushExercisesChanges() {
  const localChanges = await database
    .select()
    .from(exercises_base)
    .where(
      or(
        eq(exercises_base.sync_status, "pending"),
        eq(exercises_base.sync_status, "dirty"),
        eq(exercises_base.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] exercises_base: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    // Si está marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      console.log(
        `🗑️  [PUSH] Eliminando ejercicio "${row.name}" (id: ${row.id})`
      );

      const { count } = await supabase
        .from("session_exercises")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", row.id);

      if (count > 0) {
        console.warn(
          `⚠️  [PUSH] No se puede eliminar "${row.name}": está en uso en ${count} sesión(es). Se restaura localmente.`
        );
        await database
          .update(exercises_base)
          .set({ sync_status: "synced" })
          .where(eq(exercises_base.id, row.id));
        continue;
      }

      const { error } = await supabase
        .from("exercises_base")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log(`✅ [PUSH] Ejercicio "${row.name}" eliminado`);
        await database
          .delete(exercises_base)
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error eliminando ejercicio "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    // 1. Imagen
    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo imagen de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          console.log(
            `✅ [PUSH] Imagen de "${row.name}" subida (${public_id})`
          );
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id; // Necesario para el push a Supabase después
          await database
            .update(exercises_base)
            .set({ image_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de "${row.name}":`,
          err.message
        );
      }
    }

    // 2. Video
    if (row.video_uri && row.video_uri.startsWith("file://")) {
      try {
        console.log(
          `⬆️  [PUSH] Subiendo video de "${row.name}" a Cloudinary...`
        );
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.video_uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (public_id) {
          console.log(`✅ [PUSH] Video de "${row.name}" subido (${public_id})`);
          await deleteMediaLocally(row.video_uri);
          row.video_uri = public_id;
          await database
            .update(exercises_base)
            .set({ video_uri: public_id })
            .where(eq(exercises_base.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo video de "${row.name}":`,
          err.message
        );
      }
    }

    // 3. Enviar a Supabase
    console.log(
      `⬆️  [PUSH] Subiendo ejercicio "${row.name}" (id: ${row.id})...`
    );
    // Stripeamos updated_at: que lo escriba Postgres (default now() + trigger).
    // Así un push tardío de una fila creada offline tiene updated_at = momento del push,
    // no del reloj local de hace horas — y otros devices no pierden la fila por watermark.
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercises_base")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercises_base)
        .set({ sync_status: "synced" })
        .where(eq(exercises_base.id, row.id));
      console.log(`✅ [PUSH] Ejercicio "${row.name}" sincronizado`);
    } else {
      // Marcamos como synced para no trabar la cola de sincronización,
      // aunque lo ideal es que el usuario lo corrija o lo borre.
      if (error.code === "23505") {
        console.warn(
          `⚠️  [PUSH] Conflicto de nombre duplicado en "${row.name}" — se marca como sincronizado para no bloquear la cola`
        );
        await database
          .update(exercises_base)
          .set({ sync_status: "synced" })
          .where(eq(exercises_base.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error subiendo ejercicio "${row.name}":`,
          error.message
        );
      }
    }
  }
}

/**
 * PUSH: Sube cambios locales de Relación Ejercicio-Equipo
 */
export async function pushExerciseEquipmentChanges() {
  const localChanges = await database
    .select()
    .from(exercise_equipment)
    .where(
      or(
        eq(exercise_equipment.sync_status, "pending"),
        eq(exercise_equipment.sync_status, "dirty"),
        eq(exercise_equipment.sync_status, "deleted")
      )
    );

  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] exercise_equipment: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    //Si esta marcado para borrar, lo borramos de Supabase y luego localmente
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("exercise_equipment")
        .delete()
        .eq("id", row.id);

      if (!error) {
        console.log(
          `✅ [PUSH] Relación exercise_equipment (id: ${row.id}) eliminada`
        );
        await database
          .delete(exercise_equipment)
          .where(eq(exercise_equipment.id, row.id));
      } else {
        console.error(
          `❌ [PUSH] Error eliminando relación exercise_equipment (id: ${row.id}) en Supabase:`,
          error.message
        );
      }
      continue;
    }

    // Stripeamos updated_at: que lo escriba Postgres (default now() + trigger).
    // Así un push tardío de una fila creada offline tiene updated_at = momento del push,
    // no del reloj local de hace horas — y otros devices no pierden la fila por watermark.
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("exercise_equipment")
      .upsert(restOfRow, { onConflict: "id" });

    if (!error) {
      await database
        .update(exercise_equipment)
        .set({ sync_status: "synced" })
        .where(eq(exercise_equipment.id, row.id));
      console.log(
        `✅ [PUSH] Relación exercise_equipment (id: ${row.id}) sincronizada`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo relación exercise_equipment (id: ${row.id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Rutinas
 */
export async function pushSessionsChanges() {
  const localChanges = await database
    .select()
    .from(sessions)
    .where(
      or(
        eq(sessions.sync_status, "pending"),
        eq(sessions.sync_status, "dirty"),
        eq(sessions.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] sessions: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database.delete(sessions).where(eq(sessions.id, row.id));
        console.log(`✅ [PUSH] Sesión "${row.name}" eliminada`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando sesión "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    // Subir imagen de portada a Cloudinary si es local
    if (row.cover_image_uri && row.cover_image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.cover_image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          await deleteMediaLocally(row.cover_image_uri);
          row.cover_image_uri = public_id;
          await database
            .update(sessions)
            .set({ cover_image_uri: public_id })
            .where(eq(sessions.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de rutina "${row.name}":`,
          err.message
        );
      }
    }

    // Stripeamos updated_at: que lo escriba Postgres (default now() + trigger).
    // Así un push tardío de una fila creada offline tiene updated_at = momento del push,
    // no del reloj local de hace horas — y otros devices no pierden la fila por watermark.
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("sessions")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(sessions)
        .set({ sync_status: "synced" })
        .where(eq(sessions.id, row.id));
      console.log(`✅ [PUSH] Sesión "${row.name}" sincronizada`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo rutina "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios de Rutina
 */
export async function pushSessionExercisesChanges() {
  const localChanges = await database
    .select()
    .from(session_exercises)
    .where(
      or(
        eq(session_exercises.sync_status, "pending"),
        eq(session_exercises.sync_status, "dirty"),
        eq(session_exercises.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_exercises: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("session_exercises")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(session_exercises)
          .where(eq(session_exercises.id, row.id));
        console.log(`✅ [PUSH] session_exercise (id: ${row.id}) eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando routine_exercise (id: ${row.id}):`,
          error.message
        );
      }
      continue;
    }

    // Stripeamos updated_at: que lo escriba Postgres (default now() + trigger).
    // Así un push tardío de una fila creada offline tiene updated_at = momento del push,
    // no del reloj local de hace horas — y otros devices no pierden la fila por watermark.
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("session_exercises")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(session_exercises)
        .set({ sync_status: "synced" })
        .where(eq(session_exercises.id, row.id));
      console.log(`✅ [PUSH] session_exercise (id: ${row.id}) sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo routine_exercise (id: ${row.id}):`,
        error.message
      );
    }
  }
}

async function cascadeDeletePlanLocally(planId) {
  const weekIds = (
    await database
      .select({ id: plan_weeks.id })
      .from(plan_weeks)
      .where(eq(plan_weeks.plan_id, planId))
  ).map((w) => w.id);

  if (weekIds.length) {
    const dayIds = (
      await database
        .select({ id: plan_week_days.id })
        .from(plan_week_days)
        .where(inArray(plan_week_days.week_id, weekIds))
    ).map((d) => d.id);

    if (dayIds.length) {
      const exIds = (
        await database
          .select({ id: plan_week_day_exercises.id })
          .from(plan_week_day_exercises)
          .where(inArray(plan_week_day_exercises.week_day_id, dayIds))
      ).map((e) => e.id);

      if (exIds.length) {
        await database
          .delete(plan_week_day_exercise_sets)
          .where(inArray(plan_week_day_exercise_sets.exercise_id, exIds));
      }
      await database
        .delete(plan_week_day_exercises)
        .where(inArray(plan_week_day_exercises.week_day_id, dayIds));
    }
    await database
      .delete(plan_week_days)
      .where(inArray(plan_week_days.week_id, weekIds));
  }
  await database
    .delete(plan_assignments)
    .where(eq(plan_assignments.plan_id, planId));
  await database
    .update(session_logs)
    .set({ plan_id: null })
    .where(eq(session_logs.plan_id, planId));
  await database.delete(plan_weeks).where(eq(plan_weeks.plan_id, planId));
  await database.delete(training_plans).where(eq(training_plans.id, planId));
}

async function cleanOrphanedPlanChildren() {
  // Semanas sin plan padre
  const planIds = new Set(
    (await database.select({ id: training_plans.id }).from(training_plans)).map(
      (r) => r.id
    )
  );
  const allWeeks = await database
    .select({ id: plan_weeks.id, plan_id: plan_weeks.plan_id })
    .from(plan_weeks);
  const orphanWeekIds = allWeeks
    .filter((w) => !planIds.has(w.plan_id))
    .map((w) => w.id);
  if (orphanWeekIds.length) {
    await database
      .delete(plan_weeks)
      .where(inArray(plan_weeks.id, orphanWeekIds));
    console.log(
      `🧹 [CLEANUP] ${orphanWeekIds.length} semana(s) huérfana(s) eliminada(s)`
    );
  }

  // Días sin semana padre
  const weekIds = new Set(
    (await database.select({ id: plan_weeks.id }).from(plan_weeks)).map(
      (r) => r.id
    )
  );
  const allDays = await database
    .select({ id: plan_week_days.id, week_id: plan_week_days.week_id })
    .from(plan_week_days);
  const orphanDayIds = allDays
    .filter((d) => !weekIds.has(d.week_id))
    .map((d) => d.id);
  if (orphanDayIds.length) {
    await database
      .delete(plan_week_days)
      .where(inArray(plan_week_days.id, orphanDayIds));
    console.log(
      `🧹 [CLEANUP] ${orphanDayIds.length} día(s) huérfano(s) eliminado(s)`
    );
  }

  // Ejercicios sin día padre
  const dayIds = new Set(
    (await database.select({ id: plan_week_days.id }).from(plan_week_days)).map(
      (r) => r.id
    )
  );
  const allExercises = await database
    .select({
      id: plan_week_day_exercises.id,
      week_day_id: plan_week_day_exercises.week_day_id,
    })
    .from(plan_week_day_exercises);
  const orphanExIds = allExercises
    .filter((e) => !dayIds.has(e.week_day_id))
    .map((e) => e.id);
  if (orphanExIds.length) {
    await database
      .delete(plan_week_day_exercise_sets)
      .where(inArray(plan_week_day_exercise_sets.exercise_id, orphanExIds));
    await database
      .delete(plan_week_day_exercises)
      .where(inArray(plan_week_day_exercises.id, orphanExIds));
    console.log(
      `🧹 [CLEANUP] ${orphanExIds.length} ejercicio(s) huérfano(s) eliminado(s)`
    );
  }

  // Sets sin ejercicio padre
  const exIds = new Set(
    (
      await database
        .select({ id: plan_week_day_exercises.id })
        .from(plan_week_day_exercises)
    ).map((r) => r.id)
  );
  const allSets = await database
    .select({
      id: plan_week_day_exercise_sets.id,
      exercise_id: plan_week_day_exercise_sets.exercise_id,
    })
    .from(plan_week_day_exercise_sets);
  const orphanSetIds = allSets
    .filter((s) => !exIds.has(s.exercise_id))
    .map((s) => s.id);
  if (orphanSetIds.length) {
    await database
      .delete(plan_week_day_exercise_sets)
      .where(inArray(plan_week_day_exercise_sets.id, orphanSetIds));
    console.log(
      `🧹 [CLEANUP] ${orphanSetIds.length} set(s) huérfano(s) eliminado(s)`
    );
  }

  // plan_assignments sin plan padre
  const allPlanIds = new Set(
    (await database.select({ id: training_plans.id }).from(training_plans)).map(
      (r) => r.id
    )
  );
  const allAssignments = await database
    .select({ id: plan_assignments.id, plan_id: plan_assignments.plan_id })
    .from(plan_assignments);
  const orphanAssignmentIds = allAssignments
    .filter((a) => !allPlanIds.has(a.plan_id))
    .map((a) => a.id);
  if (orphanAssignmentIds.length) {
    await database
      .delete(plan_assignments)
      .where(inArray(plan_assignments.id, orphanAssignmentIds));
    console.log(
      `🧹 [CLEANUP] ${orphanAssignmentIds.length} asignación(es) huérfana(s) eliminada(s)`
    );
  }

  // session_logs con plan_id que ya no existe (se mantiene el log, se libera la FK)
  const orphanedLogs = await database
    .select({ id: session_logs.id, plan_id: session_logs.plan_id })
    .from(session_logs)
    .where(isNotNull(session_logs.plan_id));
  const orphanLogIds = orphanedLogs
    .filter((l) => !allPlanIds.has(l.plan_id))
    .map((l) => l.id);
  if (orphanLogIds.length) {
    await database
      .update(session_logs)
      .set({ plan_id: null })
      .where(inArray(session_logs.id, orphanLogIds));
    console.log(
      `🧹 [CLEANUP] ${orphanLogIds.length} log(s) con plan_id huérfano saneado(s)`
    );
  }
}

/**
 * PUSH: Sube cambios locales de Planes de Entrenamiento
 */
export async function pushTrainingPlansChanges() {
  const localChanges = await database
    .select()
    .from(training_plans)
    .where(
      or(
        eq(training_plans.sync_status, "pending"),
        eq(training_plans.sync_status, "dirty"),
        eq(training_plans.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] training_plans: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      // Borrar asignaciones en Supabase antes que el plan para evitar FK violations
      await supabase.from("plan_assignments").delete().eq("plan_id", row.id);
      const { error } = await supabase
        .from("training_plans")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await cascadeDeletePlanLocally(row.id);
        console.log(`✅ [PUSH] Plan "${row.name}" eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando plan "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    if (row.cover_image_uri && row.cover_image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.cover_image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          await deleteMediaLocally(row.cover_image_uri);
          row.cover_image_uri = public_id;
          await database
            .update(training_plans)
            .set({ cover_image_uri: public_id })
            .where(eq(training_plans.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen de plan "${row.name}":`,
          err.message
        );
      }
    }

    // Stripeamos updated_at: que lo escriba Postgres (default now() + trigger).
    // Así un push tardío de una fila creada offline tiene updated_at = momento del push,
    // no del reloj local de hace horas — y otros devices no pierden la fila por watermark.
    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("training_plans")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(training_plans)
        .set({ sync_status: "synced" })
        .where(eq(training_plans.id, row.id));
      console.log(`✅ [PUSH] Plan "${row.name}" sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo plan "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Semanas de Plan
 *
 * Al editar un plan, las semanas locales se reemplazan por completo (delete + reinsert).
 * Se borran las semanas remotas del plan primero — el CASCADE en Supabase elimina
 * automáticamente los días, ejercicios y series hijos.
 */
export async function pushPlanWeeksChanges() {
  const localChanges = await database
    .select()
    .from(plan_weeks)
    .where(
      or(
        eq(plan_weeks.sync_status, "pending"),
        eq(plan_weeks.sync_status, "dirty"),
        eq(plan_weeks.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_weeks: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const deletedRows = localChanges.filter((r) => r.sync_status === "deleted");
  const pendingRows = localChanges.filter((r) => r.sync_status !== "deleted");

  for (const row of deletedRows) {
    const { error } = await supabase
      .from("plan_weeks")
      .delete()
      .eq("id", row.id);
    if (!error) {
      await database.delete(plan_weeks).where(eq(plan_weeks.id, row.id));
      console.log(`✅ [PUSH] Semana de plan (id: ${row.id}) eliminada`);
    } else {
      console.error(
        `❌ [PUSH] Error eliminando semana de plan (id: ${row.id}):`,
        error.message
      );
    }
  }

  const byPlan = {};
  for (const row of pendingRows) {
    if (!byPlan[row.plan_id]) byPlan[row.plan_id] = [];
    byPlan[row.plan_id].push(row);
  }

  for (const [plan_id, rows] of Object.entries(byPlan)) {
    const { error: deleteError } = await supabase
      .from("plan_weeks")
      .delete()
      .eq("plan_id", plan_id);
    if (deleteError) {
      console.error(
        `❌ [PUSH] Error limpiando semanas remotas del plan (plan_id: ${plan_id}):`,
        deleteError.message
      );
      continue;
    }

    const rowsToUpsert = rows.map(
      ({ sync_status, updated_at, ...rest }) => rest
    );
    const { error } = await supabase
      .from("plan_weeks")
      .upsert(rowsToUpsert, { onConflict: "id" });
    if (!error) {
      await database
        .update(plan_weeks)
        .set({ sync_status: "synced" })
        .where(eq(plan_weeks.plan_id, plan_id));
      console.log(
        `✅ [PUSH] Semanas del plan (plan_id: ${plan_id}) sincronizadas (${rows.length})`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo semanas del plan (plan_id: ${plan_id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Días de Semana de Plan
 *
 * Las eliminaciones las maneja el CASCADE de plan_weeks en Supabase.
 */
export async function pushPlanWeekDaysChanges() {
  const localChanges = await database
    .select()
    .from(plan_week_days)
    .where(
      or(
        eq(plan_week_days.sync_status, "pending"),
        eq(plan_week_days.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_days: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = localChanges.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("plan_week_days")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(plan_week_days)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          plan_week_days.id,
          localChanges.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_days: ${localChanges.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(`❌ [PUSH] Error subiendo plan_week_days:`, error.message);
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios de Día de Semana de Plan
 *
 * Las eliminaciones las maneja el CASCADE de plan_week_days en Supabase.
 */
export async function pushPlanWeekDayExercisesChanges() {
  const localChanges = await database
    .select()
    .from(plan_week_day_exercises)
    .where(
      or(
        eq(plan_week_day_exercises.sync_status, "pending"),
        eq(plan_week_day_exercises.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_day_exercises: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = localChanges.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("plan_week_day_exercises")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(plan_week_day_exercises)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          plan_week_day_exercises.id,
          localChanges.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_day_exercises: ${localChanges.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(
      `❌ [PUSH] Error subiendo plan_week_day_exercises:`,
      error.message
    );
  }
}

/**
 * PUSH: Sube cambios locales de Series de Ejercicio de Plan
 *
 * Las eliminaciones las maneja el CASCADE de plan_week_day_exercises en Supabase.
 */
export async function pushPlanWeekDayExerciseSetsChanges() {
  const localChanges = await database
    .select()
    .from(plan_week_day_exercise_sets)
    .where(
      or(
        eq(plan_week_day_exercise_sets.sync_status, "pending"),
        eq(plan_week_day_exercise_sets.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_day_exercise_sets: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = localChanges.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("plan_week_day_exercise_sets")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(plan_week_day_exercise_sets)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          plan_week_day_exercise_sets.id,
          localChanges.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_day_exercise_sets: ${localChanges.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(
      `❌ [PUSH] Error subiendo plan_week_day_exercise_sets:`,
      error.message
    );
  }
}

/**
 * PUSH: Sube cambios locales de Asignaciones de Planes
 */
export async function pushPlanAssignmentsChanges() {
  const localChanges = await database
    .select()
    .from(plan_assignments)
    .where(
      or(
        eq(plan_assignments.sync_status, "pending"),
        eq(plan_assignments.sync_status, "dirty"),
        eq(plan_assignments.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_assignments: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (const row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("plan_assignments")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(plan_assignments)
          .where(eq(plan_assignments.id, row.id));
        console.log(`✅ [PUSH] plan_assignment (id: ${row.id}) eliminada`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando plan_assignment (id: ${row.id}):`,
          error.message
        );
      }
      continue;
    }

    const { sync_status, updated_at, ...payload } = row;
    const { error } = await supabase
      .from("plan_assignments")
      .upsert(payload, { onConflict: "id" });
    if (!error) {
      await database
        .update(plan_assignments)
        .set({ sync_status: "synced" })
        .where(eq(plan_assignments.id, row.id));
      console.log(`✅ [PUSH] plan_assignment (id: ${row.id}) sincronizada`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo plan_assignment (id: ${row.id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Cabeceras de Logs de Sesión
 */
export async function pushSessionLogsChanges() {
  const localChanges = await database
    .select()
    .from(session_logs)
    .where(
      or(
        eq(session_logs.sync_status, "pending"),
        eq(session_logs.sync_status, "dirty"),
        eq(session_logs.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_logs: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (const row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("session_logs")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database.delete(session_logs).where(eq(session_logs.id, row.id));
        console.log(`✅ [PUSH] session_log (id: ${row.id}) eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando session_log (id: ${row.id}):`,
          error.message
        );
      }
      continue;
    }

    const { sync_status, updated_at, ...payload } = row;
    const { error } = await supabase
      .from("session_logs")
      .upsert(payload, { onConflict: "id" });
    if (!error) {
      await database
        .update(session_logs)
        .set({ sync_status: "synced" })
        .where(eq(session_logs.id, row.id));
      console.log(`✅ [PUSH] session_log (id: ${row.id}) sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo session_log (id: ${row.id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Series de Logs de Sesión
 */
export async function pushSessionSetLogsChanges() {
  const localChanges = await database
    .select()
    .from(session_set_logs)
    .where(
      or(
        eq(session_set_logs.sync_status, "pending"),
        eq(session_set_logs.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_set_logs: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = localChanges.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("session_set_logs")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(session_set_logs)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          session_set_logs.id,
          localChanges.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] session_set_logs: ${localChanges.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(`❌ [PUSH] Error subiendo session_set_logs:`, error.message);
  }
}

export async function syncWithSupabase(
  tablesToSync = [
    "exercises_base",
    "equipment",
    "exercise_equipment",
    "sessions",
    "session_exercises",
    "training_plans",
    "plan_assignments",
    "plan_weeks",
    "plan_week_days",
    "plan_week_day_exercises",
    "plan_week_day_exercise_sets",
    "session_logs",
    "session_set_logs",
  ]
) {
  if (isSyncing) {
    console.log(
      `⏳ [SYNC] Ya hay una sincronización en progreso, ignorando...`
    );
    return { success: false, skipped: true };
  }
  isSyncing = true;
  try {
    const syncTime = new Date().toISOString();
    console.log(
      `🔄 [SYNC] Iniciando — tablas: [${tablesToSync.join(", ")}] — ${syncTime}`
    );

    // --- DOWNLOAD PHASE ---
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id ?? null;

    const GYM_SCOPED_TABLES = new Set([
      "exercises_base",
      "equipment",
      "sessions",
      "training_plans",
    ]);
    const USER_SCOPED_TABLES = new Set(["session_logs", "plan_assignments"]);

    for (const table of tablesToSync) {
      const syncKey = `${LAST_SYNC_KEY}_${table}`;
      const lastSync = await AsyncStorage.getItem(syncKey);

      let schemaTable;
      if (table === "exercises_base") schemaTable = exercises_base;
      else if (table === "equipment") schemaTable = equipment;
      else if (table === "exercise_equipment") schemaTable = exercise_equipment;
      else if (table === "sessions") schemaTable = sessions;
      else if (table === "session_exercises") schemaTable = session_exercises;
      else if (table === "training_plans") schemaTable = training_plans;
      else if (table === "plan_assignments") schemaTable = plan_assignments;
      else if (table === "plan_weeks") schemaTable = plan_weeks;
      else if (table === "plan_week_days") schemaTable = plan_week_days;
      else if (table === "plan_week_day_exercises")
        schemaTable = plan_week_day_exercises;
      else if (table === "plan_week_day_exercise_sets")
        schemaTable = plan_week_day_exercise_sets;
      else if (table === "session_logs") schemaTable = session_logs;
      else if (table === "session_set_logs") schemaTable = session_set_logs;

      if (schemaTable) {
        const gymId = GYM_SCOPED_TABLES.has(table) ? GYM_ID : null;
        const userId = USER_SCOPED_TABLES.has(table) ? currentUserId : null;
        const compositeUniqueColumns = COMPOSITE_UNIQUE_COLUMNS[table] ?? null;
        const { success, changed, newLastSync } = await pullTableChanges(
          table,
          schemaTable,
          lastSync,
          gymId,
          compositeUniqueColumns,
          userId
        );
        if (success) {
          // Solo avanzamos el watermark si el servidor devolvió filas nuevas.
          // Usamos su updated_at (no el reloj local) para evitar clock-skew
          // entre dispositivos: un push tardío con updated_at viejo nunca
          // quedará por debajo de un lastSync seteado con reloj de otro device.
          if (newLastSync) {
            await AsyncStorage.setItem(syncKey, newLastSync);
          }
          if (changed) invalidateQueriesForTable(table);
        }
      }
    }

    // --- ORPHAN CLEANUP ---
    // Borra hijos locales cuyo padre ya no existe (cualquier sync_status).
    // Previene errores de FK en el push cuando un padre fue eliminado remotamente.
    await cleanOrphanedPlanChildren();

    // --- UPLOAD PHASE ---
    if (tablesToSync.includes("exercises_base")) {
      await pushExercisesChanges();
    }
    if (tablesToSync.includes("equipment")) {
      await pushEquipmentChanges();
    }
    if (tablesToSync.includes("exercise_equipment")) {
      await pushExerciseEquipmentChanges();
    }
    if (tablesToSync.includes("sessions")) {
      await pushSessionsChanges();
    }
    if (tablesToSync.includes("session_exercises")) {
      await pushSessionExercisesChanges();
    }
    if (tablesToSync.includes("training_plans")) {
      await pushTrainingPlansChanges();
    }
    if (tablesToSync.includes("plan_assignments")) {
      await pushPlanAssignmentsChanges();
    }
    if (tablesToSync.includes("plan_weeks")) {
      await pushPlanWeeksChanges();
    }
    if (tablesToSync.includes("plan_week_days")) {
      await pushPlanWeekDaysChanges();
    }
    if (tablesToSync.includes("plan_week_day_exercises")) {
      await pushPlanWeekDayExercisesChanges();
    }
    if (tablesToSync.includes("plan_week_day_exercise_sets")) {
      await pushPlanWeekDayExerciseSetsChanges();
    }
    if (tablesToSync.includes("session_logs")) {
      await pushSessionLogsChanges();
    }
    if (tablesToSync.includes("session_set_logs")) {
      await pushSessionSetLogsChanges();
    }
    console.log(`✅ [SYNC] Sincronización completada`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [SYNC] Error fatal:`, error.message);
    return { success: false, error };
  } finally {
    isSyncing = false;
  }
}

/**
 * Listeners y Triggers
 */
export function startSyncListener() {
  let previouslyConnected = null;
  NetInfo.addEventListener((state) => {
    const isConnected = !!(state.isConnected && state.isInternetReachable);
    if (previouslyConnected === false && isConnected) {
      syncWithSupabase();
    }
    previouslyConnected = isConnected;
  });
}

export async function checkNetInfoAndSync() {
  const netInfo = await NetInfo.fetch();
  if (netInfo.isConnected) {
    const { success, error } = await syncWithSupabase();
    return { success, error };
  }
}
