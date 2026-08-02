// Formato compartido entre las dos pantallas de cobranza (configuración y
// seguimiento). Vivían dentro de admin/cobranza/page.tsx, que era su único
// consumidor hasta que el seguimiento se separó: duplicarlos habría hecho que
// las dos pantallas mostraran el mismo dato distinto en cuanto alguien tocara
// una sin acordarse de la otra.

export function daysLabel(n: number): string {
  if (n === 0) return "El mismo día del vencimiento";
  return `A los ${n} día${n === 1 ? "" : "s"} del vencimiento`;
}

export function fmtMoneyARS(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function fmtDateAR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Mensaje legible de lo que sea que haya tirado una query.
 *
 * `err instanceof Error` no alcanza: los errores de supabase-js son objetos
 * planos ({ message, details, hint, code }), no instancias de Error, así que la
 * pantalla mostraba "Error desconocido" justo cuando había algo para leer. Pasó
 * de verdad — un select contra una columna borrada devolvía 400 y el owner solo
 * veía el cartel genérico.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const { message, details } = err as { message?: unknown; details?: unknown };
    if (typeof message === "string" && message) {
      return typeof details === "string" && details ? `${message} (${details})` : message;
    }
  }
  return "Error desconocido";
}
