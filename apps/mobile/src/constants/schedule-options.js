// Días de la semana para la agenda de clases. `value` sigue la convención de
// JS Date.getDay() y de activity_schedules.weekday: 0=domingo … 6=sábado.
// El orden de presentación arranca en lunes (semana laboral del gym).
export const WEEKDAYS = [
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 0, short: "Dom", label: "Domingo" },
];

export const weekdayLabel = (value) =>
  WEEKDAYS.find((d) => d.value === value)?.label ?? "";

// "HH:MM:SS" (Postgres time) → "HH:MM" para mostrar.
export const shortTime = (t) => (t ? String(t).slice(0, 5) : "");

// Valida el formato HH:MM (00-23:00-59) de los inputs de hora.
export const isValidTime = (t) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test((t ?? "").trim());
