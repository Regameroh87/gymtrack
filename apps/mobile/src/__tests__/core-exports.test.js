// El punto de entrada de @gymtrack/core exporta de verdad lo que dice exportar.
//
// Esto existe por un bug que llegó a producción: index.js reexportaba
// monthIndex/periodAt/owedPeriods/periodLabel pero se olvidaba de cycleIndexAt,
// mientras que apps/web/types/gymtrack-core.d.ts —escrito a mano— sí lo
// declaraba. `tsc` le cree al .d.ts, así que compilaba y linteaba limpio; en el
// navegador el import quedaba sin resolver y la pantalla de membresías reventaba
// entera al montarse.
//
// La causa de fondo es que el .d.ts puede mentir sobre el módulo real y nada los
// contrasta. Este test es ese contraste: si alguien agrega una función a
// billing-period.js y la declara en el .d.ts pero se olvida de reexportarla acá,
// falla en CI en vez de en producción.
import { describe, it, expect } from "vitest";
import * as core from "../../../../packages/core/src/index.js";

// Lo que apps/web/types/gymtrack-core.d.ts declara para el módulo "@gymtrack/core".
const API_PUBLICA = [
  "paymentBadge",
  "isOverdue",
  "monthIndex",
  "periodAt",
  "cycleIndexAt",
  "owedPeriods",
  "periodLabel",
];

describe("@gymtrack/core", () => {
  it.each(API_PUBLICA)("exporta %s", (nombre) => {
    expect(typeof core[nombre]).toBe("function");
  });

  it("no exporta nada que no esté declarado en el .d.ts", () => {
    // Al revés también importa: un export que la web no conoce es código que
    // nadie tipa y que se va a usar mal la primera vez.
    expect(Object.keys(core).sort()).toEqual([...API_PUBLICA].sort());
  });
});
