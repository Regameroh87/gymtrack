// Tests de los ciclos de cuota por aniversario (packages/core/src/billing-period.js).
//
// Viven acá y no en packages/core porque el único runner del monorepo es el
// vitest de apps/mobile.
//
// Lo que protegen es una sola cosa, y es la que decide si el modelo de cobranza
// está bien: los ciclos se calculan SIEMPRE desde el alta (`ancla + k meses`) y
// nunca encadenando un mes sobre el resultado anterior. Encadenar hace que un
// alta del 31 caiga en 28 al primer febrero y se quede ahí para siempre — y con
// eso todas las altas del 29, 30 y 31 colapsan en el mismo día de cobro dentro
// del primer año.
//
// Esta misma regla está implementada aparte en SQL (subscription_period,
// migración 20260803170000). Estos tests cubren la mitad JS; la de SQL se
// verifica contra la base.
import { describe, it, expect } from "vitest";
// Import relativo y no "@gymtrack/core/billing-period": mobile resuelve el
// paquete por las watchFolders de Metro, no por node_modules, así que vitest no
// lo encuentra por nombre. Mismo criterio que sync-core.test.js.
import {
  monthIndex,
  periodAt,
  owedPeriods,
  periodLabel,
} from "../../../../packages/core/src/billing-period.js";

const starts = (startISO, ks) => ks.map((k) => periodAt(startISO, k).start);

describe("periodAt — el ancla vuelve", () => {
  it("un alta del 31 de enero recupera el 31 después de febrero", () => {
    expect(starts("2026-01-31", [0, 1, 2, 3, 4])).toEqual([
      "2026-01-31",
      "2026-02-28", // recortado
      "2026-03-31", // vuelve al ancla — si acá sale 2026-03-28, quedó encadenado
      "2026-04-30", // recortado
      "2026-05-31",
    ]);
  });

  it("un alta del 30 solo se recorta en febrero", () => {
    expect(starts("2026-01-30", [0, 1, 2, 3])).toEqual([
      "2026-01-30",
      "2026-02-28",
      "2026-03-30",
      "2026-04-30",
    ]);
  });

  it("no encadena: el ciclo k no depende de haber calculado el k-1", () => {
    // Cada índice se calcula suelto y tiene que dar lo mismo que la serie.
    for (const k of [0, 1, 2, 3, 4, 11, 12, 25]) {
      expect(periodAt("2026-01-31", k).start).toBe(starts("2026-01-31", [k])[0]);
    }
    expect(periodAt("2026-01-31", 2).start).toBe("2026-03-31");
  });

  it("el fin de un ciclo es el arranque del siguiente", () => {
    for (const k of [0, 1, 2, 12]) {
      expect(periodAt("2026-01-31", k).end).toBe(periodAt("2026-01-31", k + 1).start);
    }
  });

  it("cruza el año", () => {
    expect(periodAt("2026-11-15", 3).start).toBe("2027-02-15");
    expect(periodAt("2026-12-31", 1).start).toBe("2027-01-31");
  });
});

describe("periodAt — bisiesto", () => {
  it("un alta del 29 de febrero se recorta los años no bisiestos y vuelve al 29", () => {
    expect(periodAt("2028-02-29", 12).start).toBe("2029-02-28");
    expect(periodAt("2028-02-29", 24).start).toBe("2030-02-28");
    expect(periodAt("2028-02-29", 48).start).toBe("2032-02-29");
  });

  it("el primer ciclo de un alta del 29/02 dura 29 días", () => {
    const { start, end } = periodAt("2028-02-29", 0);
    expect(start).toBe("2028-02-29");
    expect(end).toBe("2028-03-29");
  });
});

describe("monthIndex", () => {
  it("ignora el día, así el recorte de febrero no corre el índice", () => {
    expect(monthIndex("2026-01-31", "2026-02-28")).toBe(1);
    expect(monthIndex("2026-01-31", "2026-03-31")).toBe(2);
    expect(monthIndex("2026-01-31", "2027-01-31")).toBe(12);
  });

  it("es la inversa de periodAt sobre el arranque de cada ciclo", () => {
    for (const k of [0, 1, 2, 5, 13]) {
      expect(monthIndex("2026-01-31", periodAt("2026-01-31", k).start)).toBe(k);
    }
  });
});

describe("owedPeriods", () => {
  it("al día no debe nada", () => {
    expect(owedPeriods("2026-08-12", "2026-09-12", "2026-08-20")).toEqual([]);
  });

  it("el día del vencimiento ya debe, salvo que el gym diga lo contrario", () => {
    expect(owedPeriods("2026-08-12", "2026-09-12", "2026-09-12")).toHaveLength(1);
    expect(owedPeriods("2026-08-12", "2026-09-12", "2026-09-12", true)).toHaveLength(0);
  });

  it("acumula un ciclo por mes impago, sin huecos", () => {
    const debe = owedPeriods("2026-01-31", "2026-01-31", "2026-04-15");
    expect(debe.map((p) => p.start)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("no ofrece un ciclo que todavía no arrancó", () => {
    // El 20/4 el ciclo que arranca el 30/4 no empezó, aunque el índice del mes
    // en curso lo alcance.
    const debe = owedPeriods("2026-01-31", "2026-03-31", "2026-04-20");
    expect(debe.map((p) => p.start)).toEqual(["2026-03-31"]);
  });

  it("sin vencimiento debe un solo ciclo, el que corre hoy", () => {
    const debe = owedPeriods("2026-01-31", null, "2026-04-15");
    expect(debe).toHaveLength(1);
    expect(debe[0].start).toBe("2026-03-31");
  });
});

describe("periodLabel", () => {
  it("muestra el fin inclusivo, para que dos ciclos no parezcan pisarse", () => {
    expect(periodLabel("2026-08-12", "2026-09-12")).toBe("12 ago – 11 sep");
    expect(periodLabel("2026-01-31", "2026-02-28")).toBe("31 ene – 27 feb");
  });

  it("puede llevar el año", () => {
    expect(periodLabel("2026-12-15", "2027-01-15", { year: true })).toBe(
      "15 dic – 14 ene 2027"
    );
  });
});
