// Los ciclos de cuota, del lado del panel.
//
// Réplica exacta de subscription_period / subscription_month_index
// (migración 20260803170000). Tiene que dar lo mismo que el SQL: si la pantalla
// calcula un ciclo y el RPC cobra otro, el staff ofrece un período y termina
// cobrando uno distinto.
//
// ── La regla, y por qué es fácil errarla ────────────────────────────────────
//
// El ciclo k va de `alta + k meses` a `alta + (k+1) meses`, con el día recortado
// al último válido del mes destino. Los dos extremos se calculan SIEMPRE desde el
// alta, nunca uno a partir del otro.
//
// Encadenar (sumarle un mes al resultado anterior) parece equivalente y no lo es:
// un alta el 31/01 daría 31/01 → 28/02 → 28/03 → 28/04, o sea que una vez que cae
// en un mes corto se queda ahí para siempre. Desde el ancla da
// 31/01 → 28/02 → 31/03 → 30/04: febrero recorta ese ciclo y solo ese.
//
// Todas las fechas son ISO (YYYY-MM-DD) y se comparan como strings, que para ese
// formato es orden cronológico. Nada de objetos Date en los límites: construirlos
// desde un ISO los ancla a UTC y en Argentina (UTC-3) corren un día.

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const pad = (n) => String(n).padStart(2, "0");
const parse = (iso) => iso.split("-").map(Number);

/** Días del mes (mes 1-indexado). El día 0 del siguiente es el último de este. */
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Suma días a una fecha ISO. Solo para el corte de un día de due_day_is_covered. */
const addDays = (iso, n) => {
  const [y, m, d] = parse(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/**
 * En qué ciclo cae una fecha, contando desde el alta. Solo año y mes: mirar el
 * día haría que el recorte de febrero corriera el índice y el ancla no volviera.
 */
export const monthIndex = (startISO, dateISO) => {
  const [sy, sm] = parse(startISO);
  const [dy, dm] = parse(dateISO);
  return (dy - sy) * 12 + (dm - sm);
};

/**
 * Límites del ciclo k. `end` es EXCLUSIVO: es el día en que arranca el siguiente.
 * @returns {{ start: string, end: string }}
 */
export const periodAt = (startISO, k) => {
  const [y, m, d] = parse(startISO);
  const shift = (n) => {
    const total = m - 1 + n;
    const year = y + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12 + 1;
    return `${year}-${pad(month)}-${pad(Math.min(d, lastDay(year, month)))}`;
  };
  return { start: shift(k), end: shift(k + 1) };
};

/**
 * Índice del ciclo que CONTIENE una fecha.
 *
 * No alcanza con monthIndex, que cuenta meses mientras que el ciclo arranca el
 * día del ancla. Un alta del 31/01 mirada el 15/04 da monthIndex 3, pero el ciclo
 * 3 arranca el 30/04 y todavía no empezó: el que contiene al 15/04 es el 2
 * (31/03 → 30/04). Sin este ajuste la deuda se corre un ciclo entero.
 */
export const cycleIndexAt = (startISO, dateISO) => {
  const k = monthIndex(startISO, dateISO);
  return periodAt(startISO, k).start > dateISO ? k - 1 : k;
};

/**
 * Ciclos impagos de una suscripción: los que ya arrancaron y no están cubiertos
 * por lo que pagó. Mismo criterio que member_pending_charges, incluido el corte
 * de un día cuando el gym da por cubierto el día del vencimiento.
 *
 * @param startISO fecha de alta (el ancla)
 * @param dueISO   hasta cuándo pagó; null = debe el ciclo en curso
 * @param todayISO hoy
 * @param dueDayIsCovered política del gym sobre el día exacto del vencimiento
 * @returns {{ start: string, end: string }[]}
 */
export const owedPeriods = (startISO, dueISO, todayISO, dueDayIsCovered = false) => {
  if (!startISO) return [];
  const corte = dueDayIsCovered ? addDays(todayISO, -1) : todayISO;
  // Sin vencimiento debe UN ciclo, el que está corriendo hoy — no toda la
  // historia desde el alta.
  const pagadoHasta =
    dueISO ?? periodAt(startISO, cycleIndexAt(startISO, corte)).start;

  // Se arranca en el ciclo que CONTIENE lo pagado, no en el siguiente: un
  // due_date que no cae justo en un borde (dato viejo, o cargado a mano) deja ese
  // ciclo a medio pagar y hay que seguir cobrándolo. Cuando sí cae en el borde,
  // el ciclo que lo contiene es el primero impago y da lo mismo.
  const desde = Math.max(0, cycleIndexAt(startISO, pagadoHasta));
  const hasta = monthIndex(startISO, corte);

  const out = [];
  for (let k = desde; k <= hasta; k += 1) {
    const p = periodAt(startISO, k);
    if (p.end > pagadoHasta && p.start <= corte) out.push(p);
  }
  return out;
};

/**
 * Etiqueta de un ciclo: "12 ago – 11 sep".
 *
 * El `end` guardado es exclusivo, así que se muestra el día anterior — decir
 * "12 ago – 12 sep" haría que dos ciclos consecutivos parecieran pisarse.
 */
export const periodLabel = (startISO, endISO, { year = false } = {}) => {
  if (!startISO || !endISO) return "—";
  const [, sm, sd] = parse(startISO);
  const ultimo = addDays(endISO, -1);
  const [ey, em, ed] = parse(ultimo);
  const desde = `${sd} ${MESES[sm - 1]}`;
  const hasta = `${ed} ${MESES[em - 1]}`;
  return year ? `${desde} – ${hasta} ${ey}` : `${desde} – ${hasta}`;
};
