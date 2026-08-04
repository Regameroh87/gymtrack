// Monto sugerido para el primer mes de una membresía, según cómo cobre el gym
// (gyms.prorate_first_month + gyms.full_month_until_day).
//
// El período cubierto es el mes calendario SIEMPRE — prorratear mueve el MONTO,
// no las fechas: el socio que se anota el 20/8 queda cubierto hasta el 1/9 pague
// lo que pague, y del segundo mes en adelante paga el pase completo (el prorrateo
// no toca activity_subscriptions.price, solo el amount de ese primer cobro).
//
// Vive en core y no en cada app para que web y móvil no puedan calcular distinto
// el mismo primer mes.

// Días que tiene el mes de una fecha ISO (YYYY-MM-DD). Se arma en UTC a partir de
// los números de la fecha, no parseando el string: `new Date("2026-08-20")` es
// medianoche UTC y en Argentina (UTC-3) cae el 19, que corre el prorrateo un día.
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * @param price precio del pase (number | string | null)
 * @param prorate true si el gym prorratea el primer mes
 * @param todayISO fecha del alta, YYYY-MM-DD
 * @param fullMonthUntilDay hasta qué día del mes se cobra completo igual
 * @returns monto sugerido, o null si el pase no tiene precio
 */
export const firstMonthAmount = (price, prorate, todayISO, fullMonthUntilDay = 5) => {
  if (price == null || price === "") return null;
  const full = Number(price);
  if (!Number.isFinite(full)) return null;
  if (!prorate) return full;

  const [year, month, day] = todayISO.split("-").map(Number);

  // Los primeros días se cobran enteros. El umbral no es un lujo: sin él, un alta
  // el día 2 de un mes de 31 sugiere 30/31 — un 3% de descuento que nadie decidió
  // dar y que el staff termina corrigiendo a mano en cada alta temprana.
  if (day <= fullMonthUntilDay) return full;

  const total = daysInMonth(year, month);
  // El día del alta se cobra: quien se anota el 20 de un mes de 31 paga 12 días,
  // no 11.
  const remaining = total - day + 1;

  // A peso redondo: los precios de los pases son enteros y un total con centavos
  // en el ticket de un cobro en efectivo no le sirve a nadie.
  return Math.round((full * remaining) / total);
};
