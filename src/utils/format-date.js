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

// Fecha corta tipo "20 MAY 2026". Acepta un Date o usa la fecha actual.
export const formatShortDate = (date = new Date()) =>
  `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
