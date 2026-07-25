// Hasta cuándo tiene acceso pago una suscripción SaaS.
//
// Se toma la fecha más lejana entre trial_ends_at y current_period_end en vez de
// elegir una según el status. Motivo: el status puede quedar desactualizado o
// directamente mal. Pasó en producción el 2026-07-24 — un aviso viejo de MP dejó
// la fila en 'trialing' con trial_ends_at pasado cuando ya tenía un pago
// aprobado hasta el 23/08; la baja miró la rama del trial y cortó el acceso el
// mismo día, comiéndose el mes pagado.
//
// Las dos fechas juntas describen el acceso pago sin ambigüedad: en trial vale
// trial_ends_at, con pago vale current_period_end, y la que no aplica suele
// venir nula o vieja. La más lejana es siempre la correcta.
//
// OJO: existe un gemelo de esta función en supabase/functions/mp-webhook
// (`accesoPagoHasta`), para el caso de la baja hecha desde la app de MP. No se
// puede importar de acá: la edge function corre en Deno y se deploya sola, sin
// acceso a apps/web. Si tocás la lógica, tocá las dos.

export const esFuturo = (iso: string | null | undefined): boolean =>
  !!iso && new Date(iso) > new Date();

/**
 * Fin del acceso ya pagado, o null si no queda ninguno vigente.
 * El caller decide qué hacer con el null (la baja corta en el acto).
 */
export function paidAccessUntil(sub: {
  trial_ends_at?: string | null;
  current_period_end?: string | null;
}): string | null {
  const fechas = [sub.current_period_end, sub.trial_ends_at].filter(esFuturo);
  if (!fechas.length) return null;
  return fechas.reduce((a, b) => (new Date(a!) > new Date(b!) ? a : b))!;
}
