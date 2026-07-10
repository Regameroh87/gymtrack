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

// Reconciliación de borrados remotos: de las filas locales "synced", cuáles
// ya no existen en el servidor (borradas desde otro dispositivo) y hay que
// eliminar localmente. Nunca toca filas con cambios locales: el caller solo
// pasa ids en estado synced.
export function reconcileDeletedIds(localSyncedIds, remoteIds) {
  const remoteSet = new Set(remoteIds);
  return localSyncedIds.filter((id) => !remoteSet.has(id));
}
