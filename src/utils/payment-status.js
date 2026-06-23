// Estado de pago de una inscripción, derivado del vencimiento (due_date). No se
// persiste: se calcula siempre contra la fecha de hoy, así nunca queda obsoleto.
//   due_date == null  → "Sin fecha"
//   due_date >= hoy    → "Al día"
//   due_date <  hoy    → "Vencido"
// Devuelve clases Tailwind para el chip + texto, reutilizables en web y nativo.
export const paymentBadge = (dueDate) => {
  if (!dueDate)
    return {
      key: "none",
      label: "Sin fecha",
      chip: "bg-ui-input-light dark:bg-ui-input-dark",
      text: "text-ui-text-muted dark:text-ui-text-mutedDark",
    };
  const today = new Date().toISOString().split("T")[0];
  return dueDate >= today
    ? { key: "ok", label: "Al día", chip: "bg-green-500/10", text: "text-green-600" }
    : { key: "overdue", label: "Vencido", chip: "bg-red-500/10", text: "text-red-500" };
};

// true si la inscripción está vencida (due_date en el pasado).
export const isOverdue = (dueDate) =>
  !!dueDate && dueDate < new Date().toISOString().split("T")[0];
