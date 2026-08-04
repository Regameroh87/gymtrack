// Estado de pago de una inscripción, derivado del vencimiento (due_date). No se
// persiste: se calcula siempre contra la fecha de hoy, así nunca queda obsoleto.
//   due_date == null → "Sin fecha"
// Devuelve clases Tailwind para el chip + texto, reutilizables en web y nativo.
//
// Qué pasa el día EXACTO del vencimiento lo decide el gym
// (gyms.due_day_is_covered), y por eso estos helpers piden el flag en vez de
// tener una opinión propia:
//
//   dueDayIsCovered = false (default) → el día del vencimiento ya es deuda
//   dueDayIsCovered = true            → ese día todavía está cubierto
//
// Antes acá había un `due_date >= hoy` fijo, y era el único de los cuatro lugares
// que contaba así: member_pending_charges, la lista de meses adeudados de la
// pantalla de membresías y gym_dunning_candidates usan todos el criterio
// contrario. Resultado: el día del vencimiento el socio se veía "Al día" en verde
// mientras el mail de cuota vencida ya le había salido. El default false está
// justamente para alinearlo con los otros tres.

const todayISO = () => new Date().toISOString().split("T")[0];

// ¿Ese vencimiento ya cuenta como deuda hoy?
const isDue = (dueDate, dueDayIsCovered) =>
  dueDayIsCovered ? dueDate < todayISO() : dueDate <= todayISO();

export const paymentBadge = (dueDate, dueDayIsCovered = false) => {
  if (!dueDate)
    return {
      key: "none",
      label: "Sin fecha",
      chip: "bg-ui-input-light dark:bg-ui-input-dark",
      text: "text-ui-text-muted dark:text-ui-text-mutedDark",
    };
  return isDue(dueDate, dueDayIsCovered)
    ? { key: "overdue", label: "Vencido", chip: "bg-red-500/10", text: "text-red-500" }
    : { key: "ok", label: "Al día", chip: "bg-green-500/10", text: "text-green-600" };
};

// true si la inscripción ya cuenta como vencida.
export const isOverdue = (dueDate, dueDayIsCovered = false) =>
  !!dueDate && isDue(dueDate, dueDayIsCovered);
