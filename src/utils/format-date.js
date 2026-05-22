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
