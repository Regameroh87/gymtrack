import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "./index";
import { supabase } from "./supabase";

/**
 * Sincroniza WatermelonDB con Supabase.
 *
 * Uso:
 *   await syncWithSupabase({ tablesToSync: ["exercises_base"] });
 *   await syncWithSupabase({ tablesToSync: ["exercises_base", "profiles"] });
 *
 * Requisitos en Supabase para cada tabla:
 *   - columna `id` (text)
 *   - columna `created_at` (timestamptz)
 *   - columna `updated_at` (timestamptz, con trigger auto-update)
 *   - columna `deleted_at` (timestamptz, nullable) → para soft deletes
 *   - función RPC `get_server_time` que retorna NOW()
 */
export async function syncWithSupabase({ tablesToSync }) {
  console.log("🔄 Iniciando sincronización...", tablesToSync);

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const changes = {};
        for (const table of tablesToSync) {
          const { created, updated, deleted } = await pullTable(
            table,
            lastPulledAt
          );
          changes[table] = { created, updated, deleted };
        }
        const { data: serverTime } = await supabase.rpc("get_server_time");
        const timestamp = serverTime
          ? new Date(serverTime).getTime()
          : Date.now();
        console.log("⬇️ Pull completado");
        return { changes, timestamp };
      },
      pushChanges: async ({ changes }) => {
        for (const table of tablesToSync) {
          if (!changes[table]) continue;
          await pushTable(table, changes[table]);
        }
        console.log("⬆️ Push completado");
      },

      sendCreatedAsUpdated: true,
      migrationsEnabledAtVersion: 1,
    });

    console.log("✅ Sincronización completada");
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  PULL: Traer cambios de UNA tabla
// ─────────────────────────────────────────────
async function pullTable(tableName, lastPulledAt) {
  const since = lastPulledAt
    ? new Date(lastPulledAt).toISOString()
    : new Date(0).toISOString();

  // Records creados o actualizados desde la última sync
  const { data: upsertedRecords, error: upsertError } = await supabase
    .from(tableName)
    .select("*")
    .or(`created_at.gt.${since},updated_at.gt.${since}`)
    .is("deleted_at", null);

  if (upsertError) {
    console.error(`Error pulling ${tableName}:`, upsertError);
    throw upsertError;
  }

  // Records eliminados (soft delete) desde la última sync
  const { data: deletedRecords, error: deleteError } = await supabase
    .from(tableName)
    .select("id")
    .not("deleted_at", "is", null)
    .gt("deleted_at", since);

  if (deleteError) {
    console.error(`Error pulling deleted ${tableName}:`, deleteError);
    throw deleteError;
  }
  let created = [];
  let updated = [];
  if (!lastPulledAt) {
    created = (upsertedRecords || []).map(sanitizeRecord);
  } else {
    for (const record of upsertedRecords || []) {
      const recordCreatedAt = new Date(record.created_at).getTime();
      if (recordCreatedAt > lastPulledAt) {
        created.push(sanitizeRecord(record));
      } else {
        updated.push(sanitizeRecord(record));
      }
    }
  }
  const deleted = (deletedRecords || []).map((r) => String(r.id));

  return { created, updated, deleted };
}

// ─────────────────────────────────────────────
//  PUSH: Enviar cambios de UNA tabla
// ─────────────────────────────────────────────
async function pushTable(tableName, tableChanges) {
  const { created, updated, deleted } = tableChanges;

  // Upsert: created + updated van juntos
  const recordsToUpsert = [...(created || []), ...(updated || [])];

  if (recordsToUpsert.length > 0) {
    const { error } = await supabase
      .from(tableName)
      .upsert(recordsToUpsert.map(prepareForSupabase), { onConflict: "id" });

    if (error) {
      console.error(`Error pushing ${tableName}:`, error);
      throw error;
    }
  }

  // Soft delete
  if (deleted && deleted.length > 0) {
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .in("id", deleted);

    if (error) {
      console.error(`Error deleting ${tableName}:`, error);
      throw error;
    }
  }
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/** Limpia un record de Supabase → formato WatermelonDB */
function sanitizeRecord(record) {
  const clean = { ...record };
  // Asegurar que id sea string
  clean.id = String(clean.id);
  // Convertir timestamps ISO → epoch ms
  if (clean.created_at) {
    clean.created_at = new Date(clean.created_at).getTime();
  }
  if (clean.updated_at) {
    clean.updated_at = new Date(clean.updated_at).getTime();
  }
  // Remover deleted_at (WatermelonDB no lo necesita)
  delete clean.deleted_at;
  return clean;
}

/** Limpia un record de WatermelonDB → formato Supabase */
function prepareForSupabase(record) {
  const clean = { ...record };
  // Remover campos internos de WatermelonDB
  delete clean._status;
  delete clean._changed;
  // Convertir epoch ms → ISO string para Postgres
  if (clean.created_at && typeof clean.created_at === "number") {
    clean.created_at = new Date(clean.created_at).toISOString();
  }
  if (clean.updated_at && typeof clean.updated_at === "number") {
    clean.updated_at = new Date(clean.updated_at).toISOString();
  }
  return clean;
}
