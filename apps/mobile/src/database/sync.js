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
  custom_exercises,
  custom_sessions,
  custom_session_exercises,
  custom_plans,
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
  sync_meta,
} from "./schemas";
import { supabase } from "../database/supabase";
import { eq, ne, or, and, inArray, isNotNull } from "drizzle-orm";
import { uploadFileToCloudinary } from "../utils/uploadFileToCloudinary";
import { deleteMediaLocally } from "../utils/saveMediaLocally";
import { queryClient } from "@gymtrack/core/query-client";

const LAST_SYNC_KEY = "last_sync_at";
const DB_EPOCH_KEY = "db_initialized_at";
// Gym activo (multi-gym): la base SQLite contiene UN solo gym a la vez. La
// clave la escribe el ActiveGymProvider; sync_meta guarda a qué gym pertenece
// el contenido actual de la base para detectar switches (aún tras un crash).
const ACTIVE_GYM_KEY = "active-gym:id";
const ACTIVE_GYM_META_KEY = "active_gym_id";
// Usuario autenticado (auth.uid) dueño del contenido local. La base SQLite se
// comparte en el device entre cuentas (dev/multi-socio): si el contenido es de
// otra cuenta hay que purgar antes de pull/push, o el PUSH intentaría subir
// filas ajenas que la RLS rechaza (user_id ≠ auth_profile_id y no-staff).
const AUTH_USER_META_KEY = "auth_user_id";
// Las filas de catálogo (is_catalog=true) tienen gym_id NULL en Supabase, pero la
// columna gym_id local es NOT NULL (SQLite no permite quitar el constraint con ALTER).
// Al insertarlas localmente mapeamos gym_id → este sentinel; el catálogo se distingue
// por is_catalog, nunca por gym_id, así que el valor es opaco y nunca matchea un gym real.
export const CATALOG_GYM_ID = "__catalog__";
// Tablas padre que pueden contener filas de catálogo (gym_id NULL + is_catalog).
const CATALOG_PARENT_TABLES = new Set([
  "exercises_base",
  "sessions",
  "training_plans",
]);
let isSyncing = false;

// Acota una promesa a un techo de tiempo. El cliente Supabase espera el auth
// processLock ANTES de disparar getSession/queries; si un refresh de token lo tiene
// tomado (hasta ~30s de backoff), esos awaits pueden no resolver y colgar el sync
// entero (el GLOBAL_TIMEOUT_MS solo libera el lock de reentrancia, no desbloquea
// este await). Con esto, el sync aborta limpio y reintenta luego en vez de colgarse.
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timeout (${ms}ms)`)),
      ms
    );
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() =>
    clearTimeout(timer)
  );
}

// Los watermarks last_sync_at_* viven en AsyncStorage, pero describen el
// contenido de la base SQLite. Si la base fue recreada (reinstalación parcial,
// borrado de la DB, migración fallida que terminó en un reset) los watermarks
// quedan huérfanos: los pulls incrementales devuelven 0 filas y la base nunca
// se repuebla. Marcamos la base con una fila en sync_meta; si la fila no está,
// la base es nueva y los watermarks que existan son de una base anterior.
async function resetWatermarksIfDbWasRecreated() {
  const [marker] = await database
    .select()
    .from(sync_meta)
    .where(eq(sync_meta.key, DB_EPOCH_KEY));
  if (marker) return;

  const allKeys = await AsyncStorage.getAllKeys();
  const staleKeys = allKeys.filter((k) => k.startsWith(LAST_SYNC_KEY));
  if (staleKeys.length > 0) {
    await AsyncStorage.multiRemove(staleKeys);
    console.log(
      `🧹 [SYNC] Base local nueva con ${staleKeys.length} watermark(s) huérfano(s): se fuerza sync completo`
    );
  }

  await database
    .insert(sync_meta)
    .values({ key: DB_EPOCH_KEY, value: new Date().toISOString() });
}

// Todas las tablas pobladas por el sync. Se purgan completas al cambiar de
// gym activo: los watermarks son por tabla (no por gym), así que mezclar gyms
// rompería el pull incremental del gym nuevo.
const SYNCED_TABLES = {
  exercises_base,
  equipment,
  exercise_equipment,
  sessions,
  session_exercises,
  training_plans,
  plan_assignments,
  plan_weeks,
  plan_week_days,
  plan_week_day_exercises,
  plan_week_day_exercise_sets,
  session_logs,
  session_set_logs,
  custom_exercises,
  custom_sessions,
  custom_session_exercises,
  custom_plans,
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
};

export async function hasPendingChanges() {
  for (const schemaTable of Object.values(SYNCED_TABLES)) {
    const [pending] = await database
      .select({ id: schemaTable.id })
      .from(schemaTable)
      .where(ne(schemaTable.sync_status, "synced"))
      .limit(1);
    if (pending) return true;
  }
  return false;
}

// Vacía todas las tablas sincronizadas y descarta los watermarks por-tabla
// (LAST_SYNC_KEY). Tras esto, un próximo sync hace full pull. No toca el
// marcador de gym (ACTIVE_GYM_META_KEY): de eso se encarga cada caller.
async function purgeSyncedTables() {
  for (const schemaTable of Object.values(SYNCED_TABLES)) {
    await database.delete(schemaTable);
  }

  const allKeys = await AsyncStorage.getAllKeys();
  const staleKeys = allKeys.filter((k) => k.startsWith(LAST_SYNC_KEY));
  if (staleKeys.length > 0) {
    await AsyncStorage.multiRemove(staleKeys);
  }
}

// Limpieza total de la base local (logout / cuenta sin gimnasio). Purga las
// tablas y borra el marcador de gym, dejando la base "sin marcar" para que un
// próximo login adopte su gym desde una base vacía sin disparar un falso switch.
export async function wipeLocalData() {
  await purgeSyncedTables();
  await database
    .delete(sync_meta)
    .where(
      inArray(sync_meta.key, [ACTIVE_GYM_META_KEY, AUTH_USER_META_KEY])
    );
}

// Guard idempotente: corre al inicio de CADA sync. Si el contenido local
// pertenece a otro gym (switch, incluso interrumpido por un crash), purga
// tablas + watermarks de una sola vez para forzar un full pull del gym nuevo.
async function ensureDbMatchesActiveGym(activeGymId) {
  if (!activeGymId) return;

  const [marker] = await database
    .select()
    .from(sync_meta)
    .where(eq(sync_meta.key, ACTIVE_GYM_META_KEY));

  if (marker?.value === activeGymId) return;

  if (!marker) {
    // Base sin marcar (primer sync multi-gym o base nueva): se adopta el gym
    // activo sin purgar — el único contenido posible es de builds viejos del
    // mismo gym del usuario.
    await database
      .insert(sync_meta)
      .values({ key: ACTIVE_GYM_META_KEY, value: activeGymId });
    return;
  }

  console.log(
    `🔁 [SYNC] Gym activo cambió (${marker.value} → ${activeGymId}): purga local + full pull`
  );

  await purgeSyncedTables();

  await database
    .update(sync_meta)
    .set({ value: activeGymId })
    .where(eq(sync_meta.key, ACTIVE_GYM_META_KEY));
}

// Guard idempotente: corre al inicio de CADA sync, antes de pull/push. Si el
// contenido local pertenece a otra cuenta (logout + login de otro usuario sin
// purga, p. ej. mismo device de prueba o socio compartido), purga todo para que
// el PUSH no intente subir filas ajenas (RLS las rechaza) y el PULL repueble con
// los datos del usuario actual.
async function ensureDbMatchesAuthUser(authUserId) {
  if (!authUserId) return;

  const [marker] = await database
    .select()
    .from(sync_meta)
    .where(eq(sync_meta.key, AUTH_USER_META_KEY));

  if (marker?.value === authUserId) return;

  if (!marker) {
    // Base sin marcar (build viejo previo a este guard o base nueva): se adopta
    // el usuario actual sin purgar. La Capa de PUSH filtra por profile id, así
    // que ninguna fila ajena preexistente se sube igual.
    await database
      .insert(sync_meta)
      .values({ key: AUTH_USER_META_KEY, value: authUserId });
    return;
  }

  console.log(
    `🔁 [SYNC] Auth user cambió (${marker.value} → ${authUserId}): purga local + full pull`
  );

  await purgeSyncedTables();

  await database
    .update(sync_meta)
    .set({ value: authUserId })
    .where(eq(sync_meta.key, AUTH_USER_META_KEY));
}

// Garantiza que no queden cambios locales sin subir antes de un logout en
// device compartido (el próximo login de otra cuenta purgaría la base). Lanza
// error si hay pendientes y no se pueden empujar; el caller debe abortar el
// logout en ese caso.
export async function flushPendingBeforeLogout() {
  if (!(await hasPendingChanges())) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    throw new Error(
      "Tenés cambios sin sincronizar y no hay conexión. Conectate a internet antes de cerrar sesión."
    );
  }

  const { success } = await syncWithSupabase();
  if (!success || (await hasPendingChanges())) {
    throw new Error(
      "No se pudieron subir tus cambios pendientes. Intentá de nuevo en unos segundos."
    );
  }
}

// Cambio de gym activo. Primero empuja los pendientes del gym actual (la purga
// posterior los borraría); recién después persiste el gym nuevo y dispara el
// sync cuyo guard purga y re-puebla. Lanza error si hay pendientes sin red.
export async function requestGymSwitch(newGymId) {
  const current = await AsyncStorage.getItem(ACTIVE_GYM_KEY);
  if (current === newGymId) return { success: true };

  if (await hasPendingChanges()) {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      throw new Error(
        "Tenés cambios sin sincronizar y no hay conexión. Conectate a internet antes de cambiar de gimnasio."
      );
    }
    const { success } = await syncWithSupabase();
    if (!success || (await hasPendingChanges())) {
      throw new Error(
        "No se pudieron subir tus cambios pendientes. Intentá de nuevo en unos segundos."
      );
    }
  }

  await AsyncStorage.setItem(ACTIVE_GYM_KEY, newGymId);
  // Aun sin red conviene sincronizar ya: el guard purga la base local para no
  // mostrar datos del gym anterior; el pull se completará cuando haya conexión.
  return await syncWithSupabase();
}

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
  custom_exercises: [["custom_exercises"], ["custom_exercise"]],
  custom_sessions: [["custom_sessions"], ["custom_session"]],
  custom_session_exercises: [["custom_sessions"], ["custom_session"]],
  custom_plans: [["custom_plans"], ["custom_plan"]],
  custom_plan_weeks: [["custom_plans"], ["custom_plan"]],
  custom_plan_week_days: [["custom_plans"], ["custom_plan"]],
  custom_plan_week_day_exercises: [["custom_plans"], ["custom_plan"]],
  custom_plan_week_day_exercise_sets: [["custom_plans"], ["custom_plan"]],
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
  custom_session_exercises: ["session_id", "exercise_id"],
  custom_plan_weeks: ["plan_id", "week_number"],
  custom_plan_week_days: ["week_id", "day_number"],
  custom_plan_week_day_exercises: ["week_day_id", "session_exercise_id"],
  custom_plan_week_day_exercise_sets: ["exercise_id", "set_number"],
};

// Tablas con soft-delete (tombstone vía columna deleted_at). En el PULL, una fila
// remota con deleted_at gana sobre la copia local cualquiera sea su sync_status:
// se borra local incluso si está pending/dirty. Eso cierra la "resurrección" de un
// borrado cuando otro dispositivo conserva una copia sin sincronizar.
const SOFT_DELETE_TABLES = new Set(["session_logs", "session_set_logs"]);

// Envuelve un query builder de Supabase con un AbortController que lo cancela
// si no responde en `timeoutMs` ms. Devuelve el Promise a awaitar y una función
// clear() para limpiar el timer si el query resuelve antes del timeout.
function makeAbortableQuery(queryBuilder, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    promise: queryBuilder.abortSignal(controller.signal),
    clear: () => clearTimeout(timer),
  };
}

async function pullTableChanges(
  tableName,
  schemaTable,
  lastSync,
  gymId = null,
  compositeUniqueColumns = null,
  userId = null,
  softDelete = false,
  options = {}
) {
  // catalogMode: pull SOLO filas de catálogo (is_catalog=true), sin filtro de gym,
  //   mapeando gym_id → sentinel local y reconciliando dentro del set de catálogo.
  // excludeCatalog: en el pull gym-scopeado de una tabla padre, NO borrar las filas
  //   de catálogo en la reconciliación (no matchean el gym y se borrarían).
  const { catalogMode = false, excludeCatalog = false } = options;

  let query = supabase
    .from(tableName)
    .select("*")
    .order("updated_at", { ascending: true });

  if (catalogMode) query = query.eq("is_catalog", true);
  else if (gymId) query = query.eq("gym_id", gymId);
  if (userId) query = query.eq("user_id", userId);
  if (lastSync) query = query.gte("updated_at", lastSync);

  const { promise: pullPromise, clear: clearPullTimer } = makeAbortableQuery(query, 30_000);
  let data, error;
  try {
    ({ data, error } = await pullPromise);
  } catch (abortErr) {
    clearPullTimer();
    console.warn(`⚠️ [PULL] "${tableName}": timeout (30s), tabla salteada`);
    return { success: false, changed: false, newLastSync: null };
  } finally {
    clearPullTimer();
  }

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
      // Tombstone remoto: gana sobre la copia local sea cual sea su sync_status
      // (incluso pending/dirty). Como el PULL corre antes que el PUSH, esto borra
      // la copia local antes de que pueda re-subirse → evita la resurrección.
      if (softDelete && remoteRow.deleted_at) {
        await database
          .delete(schemaTable)
          .where(eq(schemaTable.id, remoteRow.id));
        continue;
      }
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
      // Antes de insertar, eliminar cualquier fila local con el mismo composite
      // key pero distinto id. Pasa cuando un día/semana del plan cambia de UUID
      // en el servidor (p. ej. un slot vacío re-llenado con makeEmptyDay) y la
      // reconciliación de borrados —que corre más abajo— todavía no eliminó la
      // fila vieja. Las filas con cambios locales (pending/dirty/deleted) ya se
      // saltearon arriba vía lockedCompositeKeys, así que esto solo toca filas
      // "synced" obsoletas.
      if (compositeUniqueColumns) {
        await database
          .delete(schemaTable)
          .where(
            and(
              ...compositeUniqueColumns.map((c) =>
                eq(schemaTable[c], remoteRow[c])
              ),
              ne(schemaTable.id, remoteRow.id)
            )
          );
      }
      remoteRow.sync_status = "synced";
      // Filas de catálogo: gym_id viene NULL del server; mapeamos al sentinel para
      // satisfacer el NOT NULL local (se distinguen por is_catalog, no por gym_id).
      if (catalogMode && remoteRow.gym_id == null) {
        remoteRow.gym_id = CATALOG_GYM_ID;
      }
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
  if (catalogMode) idsQuery = idsQuery.eq("is_catalog", true);
  else if (gymId) idsQuery = idsQuery.eq("gym_id", gymId);
  if (userId) idsQuery = idsQuery.eq("user_id", userId);
  if (softDelete) idsQuery = idsQuery.is("deleted_at", null);
  const { promise: idsPromise, clear: clearIdsTimer } = makeAbortableQuery(idsQuery, 30_000);
  let remoteIds, idsError;
  try {
    ({ data: remoteIds, error: idsError } = await idsPromise);
  } catch (abortErr) {
    clearIdsTimer();
    console.warn(`⚠️ [PULL] "${tableName}": timeout en reconciliación (30s), se saltea`);
    return { success: true, changed, newLastSync };
  } finally {
    clearIdsTimer();
  }

  if (!idsError && remoteIds) {
    const remoteIdSet = new Set(remoteIds.map((r) => r.id));
    // Acotar el set local a comparar:
    //  - catalogMode: solo filas de catálogo (no tocar el contenido del gym).
    //  - excludeCatalog: excluir las de catálogo (las gestiona su propio pase).
    const syncedFilter = catalogMode
      ? and(
          eq(schemaTable.sync_status, "synced"),
          eq(schemaTable.is_catalog, true)
        )
      : excludeCatalog
        ? and(
            eq(schemaTable.sync_status, "synced"),
            eq(schemaTable.is_catalog, false)
          )
        : eq(schemaTable.sync_status, "synced");
    const localSynced = await database
      .select({ id: schemaTable.id })
      .from(schemaTable)
      .where(syncedFilter);
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
        // ¿Esas referencias remotas tienen contraparte local en cola de borrado?
        // El borrado del ejercicio en la UI marca sus session_exercises como
        // "deleted"; éstos se eliminan más abajo en este mismo sync
        // (pushSessionExercisesChanges). Si TODAS las referencias locales están
        // en cola de borrado, dejamos el ejercicio en "deleted" para reintentar
        // su eliminación en el próximo sync. Sólo restauramos si hay alguna
        // referencia local activa (uso real, p.ej. agregada desde otro device).
        const localRefs = await database
          .select({ sync_status: session_exercises.sync_status })
          .from(session_exercises)
          .where(eq(session_exercises.exercise_id, row.id));
        const hasActiveRef = localRefs.some((r) => r.sync_status !== "deleted");
        const hasPendingDeletion = localRefs.some(
          (r) => r.sync_status === "deleted"
        );

        if (hasPendingDeletion && !hasActiveRef) {
          console.log(
            `⏳ [PUSH] "${row.name}" en uso en ${count} sesión(es) cuyas referencias están en cola de borrado — se reintentará tras eliminarlas.`
          );
          continue;
        }

        console.warn(
          `⚠️  [PUSH] No se puede eliminar "${row.name}": está en uso en ${count} sesión(es). Se restaura localmente.`
        );
        await database
          .update(exercises_base)
          .set({ sync_status: "synced" })
          .where(eq(exercises_base.id, row.id));
        continue;
      }

      // El historial de series (session_set_logs) referencia exercises_base con
      // ON DELETE NO ACTION, así que bloquearía el borrado. Es data por-usuario:
      // el admin no tiene los logs de los demás localmente, por eso el borrado
      // remoto se hace acá (RLS deshabilitada lo permite). Los devices de cada
      // usuario reconcilian sus logs locales en el próximo pull.
      const { error: setLogsError } = await supabase
        .from("session_set_logs")
        .delete()
        .eq("exercise_id", row.id);

      if (setLogsError) {
        console.error(
          `❌ [PUSH] Error eliminando historial de "${row.name}":`,
          setLogsError.message
        );
        continue; // Reintentar en el próximo sync; no borramos el ejercicio aún.
      }
      // Limpiar también el historial local del propio admin para consistencia.
      await database
        .delete(session_set_logs)
        .where(eq(session_set_logs.exercise_id, row.id));

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
        // No sincronizamos la fila con una URI local ("file://"): sería inútil
        // para otros dispositivos. Dejamos sync_status pendiente para reintentar
        // la subida en el próximo sync.
        continue;
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
 * Devuelve el subconjunto de `ids` cuyas filas en `schemaTable` ya están
 * `synced` (es decir, llegaron a Supabase). Se usa para no subir filas hijas
 * cuyo padre todavía no está en el servidor y así evitar violaciones de FK
 * (p. ej. una serie cuyo plan_week_day_exercise aún no se sincronizó).
 */
async function getSyncedIds(schemaTable, ids) {
  if (!ids.length) return new Set();
  const rows = await database
    .select({ id: schemaTable.id })
    .from(schemaTable)
    .where(
      and(inArray(schemaTable.id, ids), eq(schemaTable.sync_status, "synced"))
    );
  return new Set(rows.map((r) => r.id));
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

  // Solo subir días cuya semana padre ya esté en el servidor; si el push de la
  // semana falló o quedó pendiente, diferimos para el próximo sync.
  const syncedWeeks = await getSyncedIds(
    plan_weeks,
    localChanges.map((r) => r.week_id)
  );
  const pushable = localChanges.filter((r) => syncedWeeks.has(r.week_id));
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] plan_week_days: ${deferred} día(s) diferido(s) — su semana padre aún no está sincronizada`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_days: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
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
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_days: ${pushable.length} registro(s) sincronizado(s)`
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

  // Solo subir ejercicios cuyos dos padres ya estén en el servidor: el día del
  // plan (week_day_id) y el ejercicio de rutina (session_exercise_id). Si
  // alguno aún no se sincronizó, diferimos para evitar violar sus FK.
  const syncedDays = await getSyncedIds(
    plan_week_days,
    localChanges.map((r) => r.week_day_id)
  );
  const syncedSessionExercises = await getSyncedIds(
    session_exercises,
    localChanges.map((r) => r.session_exercise_id)
  );
  const pushable = localChanges.filter(
    (r) =>
      syncedDays.has(r.week_day_id) &&
      syncedSessionExercises.has(r.session_exercise_id)
  );
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] plan_week_day_exercises: ${deferred} ejercicio(s) diferido(s) — su día o su ejercicio de rutina aún no está sincronizado`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_day_exercises: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
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
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_day_exercises: ${pushable.length} registro(s) sincronizado(s)`
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

  // Solo subir series cuyo ejercicio padre (exercise_id → plan_week_day_exercises)
  // ya esté en el servidor. Evita la violación de la FK
  // plan_week_day_exercise_sets_exercise_id_fkey cuando el push del ejercicio
  // padre falló o quedó pendiente; se reintenta en el próximo sync.
  const syncedExercises = await getSyncedIds(
    plan_week_day_exercises,
    localChanges.map((r) => r.exercise_id)
  );
  const pushable = localChanges.filter((r) =>
    syncedExercises.has(r.exercise_id)
  );
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] plan_week_day_exercise_sets: ${deferred} serie(s) diferida(s) — su ejercicio padre aún no está sincronizado`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] plan_week_day_exercise_sets: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
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
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] plan_week_day_exercise_sets: ${pushable.length} registro(s) sincronizado(s)`
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
export async function pushPlanAssignmentsChanges(currentProfileId) {
  // plan_assignments.user_id = profiles.id. Sin perfil resuelto no podemos
  // validar dueño: no subimos nada (evita empujar filas de otra cuenta bajo la
  // sesión actual, que la RLS rechazaría una y otra vez).
  if (!currentProfileId) {
    console.log("⏭️  [PUSH] plan_assignments omitido: sin profile id");
    return;
  }
  const localChanges = (
    await database
      .select()
      .from(plan_assignments)
      .where(
        and(
          eq(plan_assignments.user_id, currentProfileId),
          or(
            eq(plan_assignments.sync_status, "pending"),
            eq(plan_assignments.sync_status, "dirty"),
            eq(plan_assignments.sync_status, "deleted")
          )
        )
      )
  )
    // Subir primero los cierres/borrados y dejar los "active" al final: así el
    // server nunca queda transitoriamente con dos activos del mismo usuario,
    // que dispararían el índice único parcial uniq_active_plan_assignment (409).
    .sort(
      (a, b) =>
        (a.status === "active" ? 1 : 0) - (b.status === "active" ? 1 : 0)
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
    // Antes de subir un activo, cerrar en el server cualquier OTRO activo del
    // mismo usuario. Cubre el caso del activo viejo que ya no está en el local
    // (purgado al cambiar de gym) y que de otro modo choca con el índice único
    // parcial uniq_active_plan_assignment → 409. Idempotente y respeta RLS
    // (rama self / is_staff_of).
    if (payload.status === "active") {
      await supabase
        .from("plan_assignments")
        .update({ status: "completed", end_date: payload.start_date })
        .eq("user_id", payload.user_id)
        .eq("status", "active")
        .neq("id", payload.id);
    }
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
export async function pushSessionLogsChanges(currentProfileId) {
  // session_logs.user_id = profiles.id. Igual que plan_assignments: sin perfil
  // resuelto no subimos para no empujar filas de otra cuenta (RLS las rechaza).
  if (!currentProfileId) {
    console.log("⏭️  [PUSH] session_logs omitido: sin profile id");
    return;
  }
  const localChanges = await database
    .select()
    .from(session_logs)
    .where(
      and(
        eq(session_logs.user_id, currentProfileId),
        or(
          eq(session_logs.sync_status, "pending"),
          eq(session_logs.sync_status, "dirty"),
          eq(session_logs.sync_status, "deleted")
        )
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_logs: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (const row of localChanges) {
    if (row.sync_status === "deleted") {
      // Soft-delete: subimos un tombstone (deleted_at) en vez de un DELETE físico.
      // Así el borrado sobrevive a una copia "pending" del mismo log en otro
      // dispositivo: el PULL del otro device verá deleted_at y borrará su copia
      // antes de poder re-subirla (ver pullTableChanges + SOFT_DELETE_TABLES).
      const { sync_status, updated_at, ...payload } = row;
      payload.deleted_at = payload.deleted_at ?? new Date().toISOString();
      const { error } = await supabase
        .from("session_logs")
        .upsert(payload, { onConflict: "id" });
      if (!error) {
        await database.delete(session_logs).where(eq(session_logs.id, row.id));
        console.log(`🗑️  [PUSH] session_log (id: ${row.id}) tombstone subido`);
      } else {
        console.error(
          `❌ [PUSH] Error subiendo tombstone session_log (id: ${row.id}):`,
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
        eq(session_set_logs.sync_status, "dirty"),
        eq(session_set_logs.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] session_set_logs: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const deletedRows = localChanges.filter((r) => r.sync_status === "deleted");
  const upsertRows = localChanges.filter((r) => r.sync_status !== "deleted");

  // Tombstones: subimos deleted_at (no DELETE físico) y borramos local tras éxito.
  if (deletedRows.length > 0) {
    const tombstones = deletedRows.map(
      ({ sync_status, updated_at, ...rest }) => ({
        ...rest,
        deleted_at: rest.deleted_at ?? new Date().toISOString(),
      })
    );
    const { error } = await supabase
      .from("session_set_logs")
      .upsert(tombstones, { onConflict: "id" });
    if (!error) {
      await database.delete(session_set_logs).where(
        inArray(
          session_set_logs.id,
          deletedRows.map((r) => r.id)
        )
      );
      console.log(
        `🗑️  [PUSH] session_set_logs: ${deletedRows.length} tombstone(s) subido(s)`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo tombstones session_set_logs:`,
        error.message
      );
    }
  }

  if (upsertRows.length > 0) {
    const rowsToUpsert = upsertRows.map(
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
            upsertRows.map((r) => r.id)
          )
        );
      console.log(
        `✅ [PUSH] session_set_logs: ${upsertRows.length} registro(s) sincronizado(s)`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo session_set_logs:`,
        error.message
      );
    }
  }
}

async function cascadeDeleteCustomPlanLocally(planId) {
  const weekIds = (
    await database
      .select({ id: custom_plan_weeks.id })
      .from(custom_plan_weeks)
      .where(eq(custom_plan_weeks.plan_id, planId))
  ).map((w) => w.id);

  if (weekIds.length) {
    const dayIds = (
      await database
        .select({ id: custom_plan_week_days.id })
        .from(custom_plan_week_days)
        .where(inArray(custom_plan_week_days.week_id, weekIds))
    ).map((d) => d.id);

    if (dayIds.length) {
      const exIds = (
        await database
          .select({ id: custom_plan_week_day_exercises.id })
          .from(custom_plan_week_day_exercises)
          .where(inArray(custom_plan_week_day_exercises.week_day_id, dayIds))
      ).map((e) => e.id);

      if (exIds.length) {
        await database
          .delete(custom_plan_week_day_exercise_sets)
          .where(
            inArray(custom_plan_week_day_exercise_sets.exercise_id, exIds)
          );
      }
      await database
        .delete(custom_plan_week_day_exercises)
        .where(inArray(custom_plan_week_day_exercises.week_day_id, dayIds));
    }
    await database
      .delete(custom_plan_week_days)
      .where(inArray(custom_plan_week_days.week_id, weekIds));
  }
  await database
    .delete(custom_plan_weeks)
    .where(eq(custom_plan_weeks.plan_id, planId));
  await database.delete(custom_plans).where(eq(custom_plans.id, planId));
}

async function cleanOrphanedCustomPlanChildren() {
  const planIds = new Set(
    (await database.select({ id: custom_plans.id }).from(custom_plans)).map(
      (r) => r.id
    )
  );
  const allWeeks = await database
    .select({ id: custom_plan_weeks.id, plan_id: custom_plan_weeks.plan_id })
    .from(custom_plan_weeks);
  const orphanWeekIds = allWeeks
    .filter((w) => !planIds.has(w.plan_id))
    .map((w) => w.id);
  if (orphanWeekIds.length) {
    await database
      .delete(custom_plan_weeks)
      .where(inArray(custom_plan_weeks.id, orphanWeekIds));
    console.log(
      `🧹 [CLEANUP] ${orphanWeekIds.length} semana(s) custom huérfana(s) eliminada(s)`
    );
  }

  const weekIds = new Set(
    (
      await database
        .select({ id: custom_plan_weeks.id })
        .from(custom_plan_weeks)
    ).map((r) => r.id)
  );
  const allDays = await database
    .select({
      id: custom_plan_week_days.id,
      week_id: custom_plan_week_days.week_id,
    })
    .from(custom_plan_week_days);
  const orphanDayIds = allDays
    .filter((d) => !weekIds.has(d.week_id))
    .map((d) => d.id);
  if (orphanDayIds.length) {
    await database
      .delete(custom_plan_week_days)
      .where(inArray(custom_plan_week_days.id, orphanDayIds));
    console.log(
      `🧹 [CLEANUP] ${orphanDayIds.length} día(s) custom huérfano(s) eliminado(s)`
    );
  }

  const dayIds = new Set(
    (
      await database
        .select({ id: custom_plan_week_days.id })
        .from(custom_plan_week_days)
    ).map((r) => r.id)
  );
  const allExercises = await database
    .select({
      id: custom_plan_week_day_exercises.id,
      week_day_id: custom_plan_week_day_exercises.week_day_id,
    })
    .from(custom_plan_week_day_exercises);
  const orphanExIds = allExercises
    .filter((e) => !dayIds.has(e.week_day_id))
    .map((e) => e.id);
  if (orphanExIds.length) {
    await database
      .delete(custom_plan_week_day_exercise_sets)
      .where(
        inArray(custom_plan_week_day_exercise_sets.exercise_id, orphanExIds)
      );
    await database
      .delete(custom_plan_week_day_exercises)
      .where(inArray(custom_plan_week_day_exercises.id, orphanExIds));
    console.log(
      `🧹 [CLEANUP] ${orphanExIds.length} ejercicio(s) custom huérfano(s) eliminado(s)`
    );
  }

  const exIds = new Set(
    (
      await database
        .select({ id: custom_plan_week_day_exercises.id })
        .from(custom_plan_week_day_exercises)
    ).map((r) => r.id)
  );
  const allSets = await database
    .select({
      id: custom_plan_week_day_exercise_sets.id,
      exercise_id: custom_plan_week_day_exercise_sets.exercise_id,
    })
    .from(custom_plan_week_day_exercise_sets);
  const orphanSetIds = allSets
    .filter((s) => !exIds.has(s.exercise_id))
    .map((s) => s.id);
  if (orphanSetIds.length) {
    await database
      .delete(custom_plan_week_day_exercise_sets)
      .where(inArray(custom_plan_week_day_exercise_sets.id, orphanSetIds));
    console.log(
      `🧹 [CLEANUP] ${orphanSetIds.length} set(s) custom huérfano(s) eliminado(s)`
    );
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios Custom del usuario
 */
export async function pushCustomExercisesChanges() {
  const localChanges = await database
    .select()
    .from(custom_exercises)
    .where(
      or(
        eq(custom_exercises.sync_status, "pending"),
        eq(custom_exercises.sync_status, "dirty"),
        eq(custom_exercises.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_exercises: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("custom_exercises")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(custom_exercises)
          .where(eq(custom_exercises.id, row.id));
        console.log(`✅ [PUSH] custom_exercise "${row.name}" eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando custom_exercise "${row.name}":`,
          error.message
        );
      }
      continue;
    }

    if (row.image_uri && row.image_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.image_uri,
          uploadPreset: "gymtrack_images",
          typeFile: "image",
        });
        if (public_id) {
          await deleteMediaLocally(row.image_uri);
          row.image_uri = public_id;
          await database
            .update(custom_exercises)
            .set({ image_uri: public_id })
            .where(eq(custom_exercises.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen custom_exercise "${row.name}":`,
          err.message
        );
      }
    }

    if (row.video_uri && row.video_uri.startsWith("file://")) {
      try {
        const { public_id } = await uploadFileToCloudinary({
          fileUri: row.video_uri,
          uploadPreset: "gymtrack_videos",
          typeFile: "video",
        });
        if (public_id) {
          await deleteMediaLocally(row.video_uri);
          row.video_uri = public_id;
          await database
            .update(custom_exercises)
            .set({ video_uri: public_id })
            .where(eq(custom_exercises.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo video custom_exercise "${row.name}":`,
          err.message
        );
      }
    }

    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("custom_exercises")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(custom_exercises)
        .set({ sync_status: "synced" })
        .where(eq(custom_exercises.id, row.id));
      console.log(`✅ [PUSH] custom_exercise "${row.name}" sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo custom_exercise "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Sesiones Custom del usuario
 */
export async function pushCustomSessionsChanges() {
  const localChanges = await database
    .select()
    .from(custom_sessions)
    .where(
      or(
        eq(custom_sessions.sync_status, "pending"),
        eq(custom_sessions.sync_status, "dirty"),
        eq(custom_sessions.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_sessions: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("custom_sessions")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(custom_sessions)
          .where(eq(custom_sessions.id, row.id));
        console.log(`✅ [PUSH] custom_session "${row.name}" eliminada`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando custom_session "${row.name}":`,
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
            .update(custom_sessions)
            .set({ cover_image_uri: public_id })
            .where(eq(custom_sessions.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen custom_session "${row.name}":`,
          err.message
        );
      }
    }

    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("custom_sessions")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(custom_sessions)
        .set({ sync_status: "synced" })
        .where(eq(custom_sessions.id, row.id));
      console.log(`✅ [PUSH] custom_session "${row.name}" sincronizada`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo custom_session "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios de Sesión Custom
 */
export async function pushCustomSessionExercisesChanges() {
  const localChanges = await database
    .select()
    .from(custom_session_exercises)
    .where(
      or(
        eq(custom_session_exercises.sync_status, "pending"),
        eq(custom_session_exercises.sync_status, "dirty"),
        eq(custom_session_exercises.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_session_exercises: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (const row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("custom_session_exercises")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await database
          .delete(custom_session_exercises)
          .where(eq(custom_session_exercises.id, row.id));
        console.log(
          `✅ [PUSH] custom_session_exercise (id: ${row.id}) eliminado`
        );
      } else {
        console.error(
          `❌ [PUSH] Error eliminando custom_session_exercise (id: ${row.id}):`,
          error.message
        );
      }
      continue;
    }

    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("custom_session_exercises")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(custom_session_exercises)
        .set({ sync_status: "synced" })
        .where(eq(custom_session_exercises.id, row.id));
      console.log(
        `✅ [PUSH] custom_session_exercise (id: ${row.id}) sincronizado`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo custom_session_exercise (id: ${row.id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Planes Custom del usuario
 */
export async function pushCustomPlansChanges() {
  const localChanges = await database
    .select()
    .from(custom_plans)
    .where(
      or(
        eq(custom_plans.sync_status, "pending"),
        eq(custom_plans.sync_status, "dirty"),
        eq(custom_plans.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_plans: ${localChanges.length} cambio(s) pendiente(s)`
  );

  for (let row of localChanges) {
    if (row.sync_status === "deleted") {
      const { error } = await supabase
        .from("custom_plans")
        .delete()
        .eq("id", row.id);
      if (!error) {
        await cascadeDeleteCustomPlanLocally(row.id);
        console.log(`✅ [PUSH] custom_plan "${row.name}" eliminado`);
      } else {
        console.error(
          `❌ [PUSH] Error eliminando custom_plan "${row.name}":`,
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
            .update(custom_plans)
            .set({ cover_image_uri: public_id })
            .where(eq(custom_plans.id, row.id));
        }
      } catch (err) {
        console.error(
          `❌ [PUSH] Error subiendo imagen custom_plan "${row.name}":`,
          err.message
        );
      }
    }

    const { sync_status, updated_at, ...restOfRow } = row;
    const { error } = await supabase
      .from("custom_plans")
      .upsert(restOfRow, { onConflict: "id" });
    if (!error) {
      await database
        .update(custom_plans)
        .set({ sync_status: "synced" })
        .where(eq(custom_plans.id, row.id));
      console.log(`✅ [PUSH] custom_plan "${row.name}" sincronizado`);
    } else {
      console.error(
        `❌ [PUSH] Error subiendo custom_plan "${row.name}":`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Semanas de Plan Custom
 */
export async function pushCustomPlanWeeksChanges() {
  const localChanges = await database
    .select()
    .from(custom_plan_weeks)
    .where(
      or(
        eq(custom_plan_weeks.sync_status, "pending"),
        eq(custom_plan_weeks.sync_status, "dirty"),
        eq(custom_plan_weeks.sync_status, "deleted")
      )
    );
  if (localChanges.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_plan_weeks: ${localChanges.length} cambio(s) pendiente(s)`
  );

  const deletedRows = localChanges.filter((r) => r.sync_status === "deleted");
  const pendingRows = localChanges.filter((r) => r.sync_status !== "deleted");

  for (const row of deletedRows) {
    const { error } = await supabase
      .from("custom_plan_weeks")
      .delete()
      .eq("id", row.id);
    if (!error) {
      await database
        .delete(custom_plan_weeks)
        .where(eq(custom_plan_weeks.id, row.id));
      console.log(`✅ [PUSH] custom_plan_week (id: ${row.id}) eliminada`);
    } else {
      console.error(
        `❌ [PUSH] Error eliminando custom_plan_week (id: ${row.id}):`,
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
      .from("custom_plan_weeks")
      .delete()
      .eq("plan_id", plan_id);
    if (deleteError) {
      console.error(
        `❌ [PUSH] Error limpiando semanas custom remotas (plan_id: ${plan_id}):`,
        deleteError.message
      );
      continue;
    }

    const rowsToUpsert = rows.map(
      ({ sync_status, updated_at, ...rest }) => rest
    );
    const { error } = await supabase
      .from("custom_plan_weeks")
      .upsert(rowsToUpsert, { onConflict: "id" });
    if (!error) {
      await database
        .update(custom_plan_weeks)
        .set({ sync_status: "synced" })
        .where(eq(custom_plan_weeks.plan_id, plan_id));
      console.log(
        `✅ [PUSH] custom_plan_weeks (plan_id: ${plan_id}) sincronizadas (${rows.length})`
      );
    } else {
      console.error(
        `❌ [PUSH] Error subiendo custom_plan_weeks (plan_id: ${plan_id}):`,
        error.message
      );
    }
  }
}

/**
 * PUSH: Sube cambios locales de Días de Plan Custom
 */
export async function pushCustomPlanWeekDaysChanges() {
  const localChanges = await database
    .select()
    .from(custom_plan_week_days)
    .where(
      or(
        eq(custom_plan_week_days.sync_status, "pending"),
        eq(custom_plan_week_days.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;

  const syncedWeeks = await getSyncedIds(
    custom_plan_weeks,
    localChanges.map((r) => r.week_id)
  );
  const pushable = localChanges.filter((r) => syncedWeeks.has(r.week_id));
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] custom_plan_week_days: ${deferred} día(s) diferido(s) — su semana padre aún no está sincronizada`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_plan_week_days: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("custom_plan_week_days")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(custom_plan_week_days)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          custom_plan_week_days.id,
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] custom_plan_week_days: ${pushable.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(
      `❌ [PUSH] Error subiendo custom_plan_week_days:`,
      error.message
    );
  }
}

/**
 * PUSH: Sube cambios locales de Ejercicios de Día de Plan Custom
 */
export async function pushCustomPlanWeekDayExercisesChanges() {
  const localChanges = await database
    .select()
    .from(custom_plan_week_day_exercises)
    .where(
      or(
        eq(custom_plan_week_day_exercises.sync_status, "pending"),
        eq(custom_plan_week_day_exercises.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;

  const syncedDays = await getSyncedIds(
    custom_plan_week_days,
    localChanges.map((r) => r.week_day_id)
  );
  const syncedSessionExercises = await getSyncedIds(
    custom_session_exercises,
    localChanges.map((r) => r.session_exercise_id)
  );
  const pushable = localChanges.filter(
    (r) =>
      syncedDays.has(r.week_day_id) &&
      syncedSessionExercises.has(r.session_exercise_id)
  );
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] custom_plan_week_day_exercises: ${deferred} ejercicio(s) diferido(s) — su día o su ejercicio de sesión aún no está sincronizado`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_plan_week_day_exercises: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("custom_plan_week_day_exercises")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(custom_plan_week_day_exercises)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          custom_plan_week_day_exercises.id,
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] custom_plan_week_day_exercises: ${pushable.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(
      `❌ [PUSH] Error subiendo custom_plan_week_day_exercises:`,
      error.message
    );
  }
}

/**
 * PUSH: Sube cambios locales de Series de Plan Custom
 */
export async function pushCustomPlanWeekDayExerciseSetsChanges() {
  const localChanges = await database
    .select()
    .from(custom_plan_week_day_exercise_sets)
    .where(
      or(
        eq(custom_plan_week_day_exercise_sets.sync_status, "pending"),
        eq(custom_plan_week_day_exercise_sets.sync_status, "dirty")
      )
    );
  if (localChanges.length === 0) return;

  const syncedExercises = await getSyncedIds(
    custom_plan_week_day_exercises,
    localChanges.map((r) => r.exercise_id)
  );
  const pushable = localChanges.filter((r) =>
    syncedExercises.has(r.exercise_id)
  );
  const deferred = localChanges.length - pushable.length;
  if (deferred > 0) {
    console.warn(
      `⏳ [PUSH] custom_plan_week_day_exercise_sets: ${deferred} serie(s) diferida(s) — su ejercicio padre aún no está sincronizado`
    );
  }
  if (pushable.length === 0) return;
  console.log(
    `⬆️  [PUSH] custom_plan_week_day_exercise_sets: ${pushable.length} cambio(s) pendiente(s)`
  );

  const rowsToUpsert = pushable.map(
    ({ sync_status, updated_at, ...rest }) => rest
  );
  const { error } = await supabase
    .from("custom_plan_week_day_exercise_sets")
    .upsert(rowsToUpsert, { onConflict: "id" });
  if (!error) {
    await database
      .update(custom_plan_week_day_exercise_sets)
      .set({ sync_status: "synced" })
      .where(
        inArray(
          custom_plan_week_day_exercise_sets.id,
          pushable.map((r) => r.id)
        )
      );
    console.log(
      `✅ [PUSH] custom_plan_week_day_exercise_sets: ${pushable.length} registro(s) sincronizado(s)`
    );
  } else {
    console.error(
      `❌ [PUSH] Error subiendo custom_plan_week_day_exercise_sets:`,
      error.message
    );
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
    "custom_exercises",
    "custom_sessions",
    "custom_session_exercises",
    "custom_plans",
    "custom_plan_weeks",
    "custom_plan_week_days",
    "custom_plan_week_day_exercises",
    "custom_plan_week_day_exercise_sets",
  ]
) {
  if (isSyncing) {
    console.log(
      `⏳ [SYNC] Ya hay una sincronización en progreso, ignorando..`
    );
    return { success: false, skipped: true };
  }
  isSyncing = true;
  // Garantiza que isSyncing se libere aunque un await de Supabase nunca resuelva
  // (red hostil, captive portal, latencia extrema). Sin este timer el lock puede
  // quedar true para siempre bloqueando todos los syncs futuros.
  const GLOBAL_TIMEOUT_MS = 120_000;
  const safetyTimer = setTimeout(() => {
    if (isSyncing) {
      console.warn(
        `⚠️ [SYNC] Timeout global (${GLOBAL_TIMEOUT_MS / 1000}s): liberando lock`
      );
      isSyncing = false;
    }
  }, GLOBAL_TIMEOUT_MS);
  try {
    const syncTime = new Date().toISOString();
    console.log(
      `🔄 [SYNC] Iniciando — tablas: [${tablesToSync.join(", ")}] — ${syncTime}`
    );

    await resetWatermarksIfDbWasRecreated();

    // Gym activo: lo persiste el ActiveGymProvider. Si la base local pertenece
    // a otro gym (switch), el guard la purga antes de pull/push.
    const activeGymId = await AsyncStorage.getItem(ACTIVE_GYM_KEY);
    await ensureDbMatchesActiveGym(activeGymId);

    // --- DOWNLOAD PHASE ---
    // getSession() refresca el JWT si venció (autoRefreshToken=true); getUser()
    // solo lo valida contra el server sin refrescarlo, dejando el token vencido
    // y causando auth.uid()=NULL en todos los writes posteriores.
    let currentSession = null;
    try {
      const res = await withTimeout(
        supabase.auth.getSession(),
        10_000,
        "getSession"
      );
      currentSession = res?.data?.session ?? null;
    } catch (e) {
      console.warn(
        `⚠️ [SYNC] getSession no respondió a tiempo (lock de auth tomado por un refresh): sync abortado — ${e.message}`
      );
      return { success: false, reason: "auth-timeout" };
    }
    const currentUserId = currentSession?.user?.id ?? null;
    if (!currentUserId) {
      console.warn("⚠️ [SYNC] Sin sesión válida — sync abortado");
      return { success: false, reason: "no-session" };
    }

    // Si el contenido local es de otra cuenta (login de otro usuario sin purga),
    // se purga acá — antes de cualquier push— para no subir filas ajenas.
    await ensureDbMatchesAuthUser(currentUserId);

    // session_logs/plan_assignments referencian profiles.id (PK interna del
    // perfil), NO auth.uid — ver getSession.jsx. Las custom_* sí usan auth.uid.
    let currentProfileId = null;
    if (currentUserId) {
      try {
        const { data: prof } = await withTimeout(
          supabase
            .from("profiles")
            .select("id")
            .eq("user_id", currentUserId)
            .maybeSingle(),
          10_000,
          "profiles fetch"
        );
        currentProfileId = prof?.id ?? null;
      } catch (e) {
        // Sin profile id las tablas profile-scoped (session_logs, plan_assignments)
        // se saltean en este pase; el próximo sync las recupera. Mejor que colgar.
        console.warn(`⚠️ [SYNC] profiles no respondió a tiempo: ${e.message}`);
      }
    }

    // Tablas con columna gym_id: el pull se limita al gym activo (la RLS ahora
    // devuelve TODOS los gyms del usuario; el recorte por gym es del cliente).
    const GYM_COLUMN_TABLES = new Set([
      "exercises_base",
      "equipment",
      "sessions",
      "training_plans",
      "plan_assignments",
      "session_logs",
    ]);
    const USER_SCOPED_TABLES = new Set([
      "session_logs",
      "plan_assignments",
      "custom_exercises",
      "custom_sessions",
      "custom_session_exercises",
      "custom_plans",
      "custom_plan_weeks",
      "custom_plan_week_days",
      "custom_plan_week_day_exercises",
      "custom_plan_week_day_exercise_sets",
    ]);
    // user_id de estas tablas = profiles.id; el resto de las user-scoped usa auth.uid.
    const PROFILE_SCOPED_TABLES = new Set(["session_logs", "plan_assignments"]);

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
      else if (table === "custom_exercises") schemaTable = custom_exercises;
      else if (table === "custom_sessions") schemaTable = custom_sessions;
      else if (table === "custom_session_exercises")
        schemaTable = custom_session_exercises;
      else if (table === "custom_plans") schemaTable = custom_plans;
      else if (table === "custom_plan_weeks") schemaTable = custom_plan_weeks;
      else if (table === "custom_plan_week_days")
        schemaTable = custom_plan_week_days;
      else if (table === "custom_plan_week_day_exercises")
        schemaTable = custom_plan_week_day_exercises;
      else if (table === "custom_plan_week_day_exercise_sets")
        schemaTable = custom_plan_week_day_exercise_sets;

      if (schemaTable) {
        // Sin gym activo todavía (primer arranque multi-gym, antes de la
        // selección) no se puede scopear el pull: se saltea esta tabla si
        // depende del gym. El ActiveGymProvider re-dispara el sync al elegir.
        const needsGym = GYM_COLUMN_TABLES.has(table);
        if (needsGym && !activeGymId) {
          console.log(`⏭️  [PULL] "${table}" omitida: sin gym activo`);
          continue;
        }
        const gymId = needsGym ? activeGymId : null;
        const userId = USER_SCOPED_TABLES.has(table)
          ? PROFILE_SCOPED_TABLES.has(table)
            ? currentProfileId
            : currentUserId
          : null;
        // Una tabla user-scoped sin id resuelto pullearía sin filtro (mezcla
        // de usuarios/gyms vía la visibilidad de staff): mejor saltearla.
        if (USER_SCOPED_TABLES.has(table) && !userId) {
          console.log(`⏭️  [PULL] "${table}" omitida: sin user/profile id`);
          continue;
        }
        const compositeUniqueColumns = COMPOSITE_UNIQUE_COLUMNS[table] ?? null;
        const softDelete = SOFT_DELETE_TABLES.has(table);
        const { success, changed, newLastSync } = await pullTableChanges(
          table,
          schemaTable,
          lastSync,
          gymId,
          compositeUniqueColumns,
          userId,
          softDelete,
          // En las tablas padre con catálogo, no borrar las filas is_catalog en la
          // reconciliación gym-scopeada: las trae/limpia su propio pase de catálogo.
          { excludeCatalog: CATALOG_PARENT_TABLES.has(table) }
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

    // --- CATALOG PULL ---
    // El contenido de catálogo (is_catalog=true, gym_id NULL) es compartido y read-only.
    // Se pullea SIEMPRE —sin importar el gym activo ni el flag default_catalog del gym—
    // para que las referencias de forks custom (exercise_source="base") nunca queden
    // colgadas. Watermark propio por tabla (sufijo _catalog) para no pisar el del pase
    // gym-scopeado. Las hijas (session_exercises, plan_*) bajan en el loop de arriba sin
    // filtro de gym, así que su contenido de catálogo ya llegó vía RLS.
    if (currentUserId) {
      const CATALOG_TABLES = [
        ["exercises_base", exercises_base],
        ["sessions", sessions],
        ["training_plans", training_plans],
      ];
      for (const [table, schemaTable] of CATALOG_TABLES) {
        if (!tablesToSync.includes(table)) continue;
        const syncKey = `${LAST_SYNC_KEY}_${table}_catalog`;
        const lastSync = await AsyncStorage.getItem(syncKey);
        const { success, changed, newLastSync } = await pullTableChanges(
          table,
          schemaTable,
          lastSync,
          null,
          COMPOSITE_UNIQUE_COLUMNS[table] ?? null,
          null,
          false,
          { catalogMode: true }
        );
        if (success) {
          if (newLastSync) await AsyncStorage.setItem(syncKey, newLastSync);
          if (changed) invalidateQueriesForTable(table);
        }
      }
    }

    // --- ORPHAN CLEANUP ---
    // Borra hijos locales cuyo padre ya no existe (cualquier sync_status).
    // Previene errores de FK en el push cuando un padre fue eliminado remotamente.
    await cleanOrphanedPlanChildren();
    await cleanOrphanedCustomPlanChildren();

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
      await pushPlanAssignmentsChanges(currentProfileId);
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
      await pushSessionLogsChanges(currentProfileId);
    }
    if (tablesToSync.includes("session_set_logs")) {
      await pushSessionSetLogsChanges();
    }
    if (tablesToSync.includes("custom_exercises")) {
      await pushCustomExercisesChanges();
    }
    if (tablesToSync.includes("custom_sessions")) {
      await pushCustomSessionsChanges();
    }
    if (tablesToSync.includes("custom_session_exercises")) {
      await pushCustomSessionExercisesChanges();
    }
    if (tablesToSync.includes("custom_plans")) {
      await pushCustomPlansChanges();
    }
    if (tablesToSync.includes("custom_plan_weeks")) {
      await pushCustomPlanWeeksChanges();
    }
    if (tablesToSync.includes("custom_plan_week_days")) {
      await pushCustomPlanWeekDaysChanges();
    }
    if (tablesToSync.includes("custom_plan_week_day_exercises")) {
      await pushCustomPlanWeekDayExercisesChanges();
    }
    if (tablesToSync.includes("custom_plan_week_day_exercise_sets")) {
      await pushCustomPlanWeekDayExerciseSetsChanges();
    }
    console.log(`✅ [SYNC] Sincronización completada`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [SYNC] Error fatal:`, error.message);
    return { success: false, error };
  } finally {
    clearTimeout(safetyTimer);
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
      // Al recuperar conexión, refrescar memberships (única fuente de
      // gyms.is_active): si el gym activo fue suspendido offline, el contexto
      // lo detecta al volver datos frescos y fuerza el logout.
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
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
