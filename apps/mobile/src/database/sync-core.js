// Decisiones puras del motor de sync (sin BD ni red), extraídas de sync.js
// para poder testearlas de forma aislada. pullTableChanges las consume; la
// semántica es exactamente la del loop original.

// Clave de unique compuesta: los valores de las columnas unidos por "::".
export const compositeKey = (row, columns) =>
  columns.map((c) => row[c]).join("::");

// Set de claves compuestas de las filas locales con cambios sin sincronizar
// (pending/dirty/deleted): el PULL no debe pisar esos slots.
export function buildLockedCompositeKeys(pendingRows, columns) {
  return new Set(pendingRows.map((r) => compositeKey(r, columns)));
}

/**
 * Decide qué hacer con cada fila remota del PULL:
 *  - Tombstone (softDelete + deleted_at): borrar la copia local SIEMPRE,
 *    incluso si tiene cambios locales — el borrado remoto gana y así se evita
 *    la resurrección vía PUSH.
 *  - Con cambios locales (lockedIds por id, o lockedCompositeKeys por unique
 *    compuesta): saltear; el PUSH de este mismo ciclo resuelve la versión
 *    canónica.
 *  - Resto: upsert local con sync_status "synced". En catalogMode, las filas
 *    de catálogo llegan con gym_id NULL y se mapean al sentinel local (la
 *    columna es NOT NULL en SQLite).
 *
 * Devuelve { tombstoneIds, upserts, skipped }. `skipped` cuenta solo los
 * salteos por cambios locales (los tombstones cuentan como aplicados, igual
 * que en el loop original).
 */
export function planPullApplication({
  remoteRows,
  lockedIds,
  compositeUniqueColumns = null,
  lockedCompositeKeys = null,
  softDelete = false,
  catalogMode = false,
  catalogGymId = null,
}) {
  const tombstoneIds = [];
  const upserts = [];
  let skipped = 0;

  for (const remoteRow of remoteRows) {
    if (softDelete && remoteRow.deleted_at) {
      tombstoneIds.push(remoteRow.id);
      continue;
    }
    if (lockedIds.has(remoteRow.id)) {
      skipped += 1;
      continue;
    }
    if (
      lockedCompositeKeys &&
      lockedCompositeKeys.has(compositeKey(remoteRow, compositeUniqueColumns))
    ) {
      skipped += 1;
      continue;
    }
    const row = { ...remoteRow, sync_status: "synced" };
    if (catalogMode && row.gym_id == null) {
      row.gym_id = catalogGymId;
    }
    upserts.push(row);
  }

  return { tombstoneIds, upserts, skipped };
}

// Columnas que no se comparan al decidir si una fila remota trae novedades:
// sync_status es estado local puro (el upsert siempre lo fuerza a "synced"),
// así que nunca refleja un cambio del servidor.
const LOCAL_ONLY_COLUMNS = new Set(["sync_status"]);

/**
 * ¿El upsert dejaría la fila local exactamente como está?
 *
 * El watermark del pull filtra con `>=` (no `>`) para no perder filas escritas
 * en el mismo timestamp que el corte, así que CADA pull vuelve a traer al menos
 * la última fila ya conocida. Sin esta comprobación, esa fila se contaría como
 * cambio y dispararía una invalidación de queries —y el refresco visible de la
 * UI— en cada sync, aunque el servidor no tenga nada nuevo.
 *
 * Se compara contra una fila local que en un sync previo se escribió DESDE una
 * fila remota de la misma forma, así que las representaciones coinciden por
 * construcción y alcanza con comparación estricta. Ante cualquier duda (columna
 * ausente, tipos distintos) devuelve false: un falso "cambió" solo provoca una
 * invalidación de más —el comportamiento histórico—, mientras que un falso "no
 * cambió" dejaría la UI desactualizada hasta el sync siguiente.
 */
export function isUnchangedRow(upsertRow, localRow) {
  if (!localRow) return false;
  for (const column of Object.keys(localRow)) {
    if (LOCAL_ONLY_COLUMNS.has(column)) continue;
    if (!Object.is(upsertRow[column], localRow[column])) return false;
  }
  return true;
}

// Reconciliación de borrados remotos: de las filas locales "synced", cuáles
// ya no existen en el servidor (borradas desde otro dispositivo) y hay que
// eliminar localmente. Nunca toca filas con cambios locales: el caller solo
// pasa ids en estado synced.
export function reconcileDeletedIds(localSyncedIds, remoteIds) {
  const remoteSet = new Set(remoteIds);
  return localSyncedIds.filter((id) => !remoteSet.has(id));
}
