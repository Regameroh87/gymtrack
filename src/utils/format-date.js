// Meses abreviados en español, índice 0 = enero.
export const MONTHS_ES = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

// Meses completos en español, índice 0 = enero.
export const MONTHS_ES_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Días de la semana en español, índice 0 = domingo.
export const WEEKDAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Fecha corta tipo "20 MAY 2026". Acepta un Date o usa la fecha actual.
export const formatShortDate = (date = new Date()) =>
  `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;

// Encabezado de grupo mensual tipo "Mayo 2026".
export const formatMonthLabel = (date = new Date()) =>
  `${MONTHS_ES_FULL[date.getMonth()]} ${date.getFullYear()}`;

// Duración legible a partir de segundos: "1h 12m", "45m" o "—" si no hay dato.
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 1) return "—";
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Etiqueta relativa: "Hoy", "Ayer" o fecha corta. Acepta Date o string ISO.
export const formatRelativeDay = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  const today = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return formatShortDate(date);
};

// ─── Helpers de semana (para la pestaña Progreso) ──────────────────────────────
// Se calculan a mano para no sumar una dependencia de fechas (date-fns/dayjs).

// 00:00 del día local que contiene `input`. Acepta Date o string ISO.
export const startOfDay = (input) => {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Lunes 00:00 de la semana que contiene `input` (semana ISO, empieza lunes).
export const startOfWeek = (input) => {
  const d = startOfDay(input);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes … 6 = domingo
  d.setDate(d.getDate() - dow);
  return d;
};

// Clave estable de semana = fecha del lunes "YYYY-MM-DD". Sirve de id para agrupar.
export const weekKey = (input) => {
  const m = startOfWeek(input);
  const mm = String(m.getMonth() + 1).padStart(2, "0");
  const dd = String(m.getDate()).padStart(2, "0");
  return `${m.getFullYear()}-${mm}-${dd}`;
};

// Las últimas `n` semanas (incluida la actual), de la más vieja a la más nueva.
// Cada item: { key, start (Date del lunes), label "12 MAY" }.
export const lastNWeeks = (n) => {
  const current = startOfWeek(new Date());
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    weeks.push({
      key: weekKey(start),
      start,
      label: `${start.getDate()} ${MONTHS_ES[start.getMonth()]}`,
    });
  }
  return weeks;
};
