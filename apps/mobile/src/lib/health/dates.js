// Helpers de fechas compartidos por los clients de health. Todo el módulo
// trabaja con días en timezone LOCAL del device: los agregados diarios de
// HealthKit/Health Connect se anclan a la medianoche local, y la key "date"
// (YYYY-MM-DD) que viaja a Supabase representa ese día local.

export const toDateKey = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const startOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const daysAgo = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
};
