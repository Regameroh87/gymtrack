// Tests de las decisiones puras del motor de sync (sync-core.js).
// Protegen los invariantes que evitan pérdida de datos offline:
//   - el PULL nunca pisa cambios locales sin sincronizar,
//   - los tombstones remotos ganan siempre (anti-resurrección),
//   - la reconciliación borra exactamente lo que desapareció del server,
//   - el catálogo mapea gym_id NULL al sentinel local.
import { describe, it, expect } from "vitest";
import {
  compositeKey,
  buildLockedCompositeKeys,
  isUnchangedRow,
  planPullApplication,
  reconcileDeletedIds,
} from "../sync-core";

const CATALOG_GYM_ID = "__catalog__";

const remote = (id, extra = {}) => ({
  id,
  name: `row-${id}`,
  updated_at: "2026-07-01T00:00:00Z",
  ...extra,
});

describe("compositeKey", () => {
  it("une los valores de las columnas con ::", () => {
    expect(compositeKey({ plan_id: "p1", week_number: 2 }, ["plan_id", "week_number"])).toBe("p1::2");
  });

  it("dos filas con el mismo slot generan la misma clave", () => {
    const cols = ["week_id", "day_number"];
    const a = { id: "x", week_id: "w1", day_number: 3 };
    const b = { id: "y", week_id: "w1", day_number: 3 };
    expect(compositeKey(a, cols)).toBe(compositeKey(b, cols));
  });
});

describe("buildLockedCompositeKeys", () => {
  it("arma el set con las claves de todas las filas pendientes", () => {
    const cols = ["plan_id", "week_number"];
    const set = buildLockedCompositeKeys(
      [
        { plan_id: "p1", week_number: 1 },
        { plan_id: "p1", week_number: 2 },
      ],
      cols
    );
    expect(set.has("p1::1")).toBe(true);
    expect(set.has("p1::2")).toBe(true);
    expect(set.has("p1::3")).toBe(false);
  });
});

describe("planPullApplication", () => {
  it("aplica filas remotas limpias como synced", () => {
    const { tombstoneIds, upserts, skipped } = planPullApplication({
      remoteRows: [remote("a"), remote("b")],
      lockedIds: new Set(),
    });
    expect(tombstoneIds).toEqual([]);
    expect(skipped).toBe(0);
    expect(upserts).toHaveLength(2);
    for (const row of upserts) expect(row.sync_status).toBe("synced");
  });

  it("NUNCA pisa filas con cambios locales (lockedIds)", () => {
    const { upserts, skipped } = planPullApplication({
      remoteRows: [remote("local-pendiente"), remote("limpia")],
      lockedIds: new Set(["local-pendiente"]),
    });
    expect(skipped).toBe(1);
    expect(upserts.map((r) => r.id)).toEqual(["limpia"]);
  });

  it("NUNCA pisa slots con cambios locales por unique compuesta", () => {
    const cols = ["week_id", "day_number"];
    const locked = buildLockedCompositeKeys(
      [{ week_id: "w1", day_number: 3, sync_status: "dirty" }],
      cols
    );
    const { upserts, skipped } = planPullApplication({
      // Mismo slot (w1, día 3) pero con OTRO id: el server re-creó el día.
      remoteRows: [remote("nuevo-id", { week_id: "w1", day_number: 3 })],
      lockedIds: new Set(),
      compositeUniqueColumns: cols,
      lockedCompositeKeys: locked,
    });
    expect(skipped).toBe(1);
    expect(upserts).toEqual([]);
  });

  it("el tombstone remoto gana incluso si la fila local tiene cambios", () => {
    const { tombstoneIds, upserts, skipped } = planPullApplication({
      remoteRows: [
        remote("borrada", { deleted_at: "2026-07-01T00:00:00Z" }),
        remote("viva"),
      ],
      // "borrada" también está locked localmente: el tombstone debe ganar igual.
      lockedIds: new Set(["borrada"]),
      softDelete: true,
    });
    expect(tombstoneIds).toEqual(["borrada"]);
    expect(upserts.map((r) => r.id)).toEqual(["viva"]);
    expect(skipped).toBe(0);
  });

  it("sin softDelete, deleted_at no genera tombstones", () => {
    const { tombstoneIds, upserts } = planPullApplication({
      remoteRows: [remote("x", { deleted_at: "2026-07-01T00:00:00Z" })],
      lockedIds: new Set(),
      softDelete: false,
    });
    expect(tombstoneIds).toEqual([]);
    expect(upserts).toHaveLength(1);
  });

  it("catalogMode mapea gym_id NULL al sentinel y respeta gym_id no nulo", () => {
    const { upserts } = planPullApplication({
      remoteRows: [
        remote("cat", { gym_id: null, is_catalog: true }),
        remote("gym", { gym_id: "gym-real", is_catalog: false }),
      ],
      lockedIds: new Set(),
      catalogMode: true,
      catalogGymId: CATALOG_GYM_ID,
    });
    expect(upserts.find((r) => r.id === "cat").gym_id).toBe(CATALOG_GYM_ID);
    expect(upserts.find((r) => r.id === "gym").gym_id).toBe("gym-real");
  });

  it("no muta las filas remotas originales", () => {
    const original = remote("a", { gym_id: null });
    planPullApplication({
      remoteRows: [original],
      lockedIds: new Set(),
      catalogMode: true,
      catalogGymId: CATALOG_GYM_ID,
    });
    expect(original.sync_status).toBeUndefined();
    expect(original.gym_id).toBeNull();
  });

  it("skipped cuenta solo salteos por locks (los tombstones cuentan como aplicados)", () => {
    const { skipped, tombstoneIds } = planPullApplication({
      remoteRows: [
        remote("t", { deleted_at: "2026-07-01T00:00:00Z" }),
        remote("locked"),
      ],
      lockedIds: new Set(["locked"]),
      softDelete: true,
    });
    // changed = remoteRows.length - skipped: el tombstone debe contar como cambio.
    expect(skipped).toBe(1);
    expect(tombstoneIds).toHaveLength(1);
  });
});

describe("isUnchangedRow", () => {
  // El caso que motiva la función: el watermark filtra con >=, así que la última
  // fila conocida vuelve a bajar en CADA pull. Detectarla evita invalidar las
  // queries (y refrescar la UI) cuando el server no trajo nada nuevo.
  it("reconoce la fila del watermark que vuelve a bajar sin cambios", () => {
    const local = { ...remote("a"), sync_status: "synced" };
    const upsert = { ...remote("a"), sync_status: "synced" };
    expect(isUnchangedRow(upsert, local)).toBe(true);
  });

  it("ignora sync_status: es estado local, no un cambio del server", () => {
    const local = { ...remote("a"), sync_status: "synced" };
    const upsert = { ...remote("a"), sync_status: "pending" };
    expect(isUnchangedRow(upsert, local)).toBe(true);
  });

  it("detecta un cambio real en cualquier columna", () => {
    const local = { ...remote("a"), sync_status: "synced" };
    expect(isUnchangedRow({ ...local, name: "otro" }, local)).toBe(false);
    expect(
      isUnchangedRow({ ...local, updated_at: "2026-07-02T00:00:00Z" }, local)
    ).toBe(false);
  });

  it("una fila que no existe local siempre es cambio", () => {
    expect(isUnchangedRow(remote("nueva"), undefined)).toBe(false);
    expect(isUnchangedRow(remote("nueva"), null)).toBe(false);
  });

  // Ante la duda debe decir "cambió": una invalidación de más es inocua, una de
  // menos deja la UI desactualizada hasta el sync siguiente.
  it("es conservador ante tipos distintos o columnas ausentes", () => {
    const local = { id: "a", is_unilateral: false, reps: 10, note: null };
    // booleano vs entero (representaciones distintas del mismo valor)
    expect(isUnchangedRow({ ...local, is_unilateral: 0 }, local)).toBe(false);
    // número vs string
    expect(isUnchangedRow({ ...local, reps: "10" }, local)).toBe(false);
    // columna ausente en el remoto (undefined) frente a NULL local
    expect(isUnchangedRow({ id: "a", is_unilateral: false, reps: 10 }, local)).toBe(
      false
    );
  });

  it("null a ambos lados no cuenta como cambio", () => {
    const local = { id: "a", image_uri: null, sync_status: "synced" };
    expect(isUnchangedRow({ id: "a", image_uri: null }, local)).toBe(true);
  });

  // En catalogMode el gym_id remoto (NULL) ya viene mapeado al sentinel local
  // antes de comparar, así que una fila de catálogo estable no debe dar cambio.
  it("la fila de catálogo ya mapeada al sentinel no cuenta como cambio", () => {
    const local = { id: "c", gym_id: CATALOG_GYM_ID, is_catalog: true };
    expect(
      isUnchangedRow({ id: "c", gym_id: CATALOG_GYM_ID, is_catalog: true }, local)
    ).toBe(true);
  });
});

describe("reconcileDeletedIds", () => {
  it("borra localmente solo lo que desapareció del server", () => {
    expect(reconcileDeletedIds(["a", "b", "c"], ["a", "c"])).toEqual(["b"]);
  });

  it("no borra nada si el server tiene todo", () => {
    expect(reconcileDeletedIds(["a", "b"], ["a", "b", "extra-remota"])).toEqual([]);
  });

  it("con server vacío borra todo lo synced local (gym purgado)", () => {
    expect(reconcileDeletedIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("con local vacío no hace nada", () => {
    expect(reconcileDeletedIds([], ["a"])).toEqual([]);
  });
});
