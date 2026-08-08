// Copy por defecto de los recordatorios de cobranza (/admin/cobranza).
//
// El tono sube con el ORDEN del recordatorio (0 = primer aviso, amistoso; de
// ahí en más, más firme) — es la escalada que pidió el usuario: "una plantilla
// por recordatorio, para poder subir el tono progresivamente".
//
// Se usa en dos momentos: al crear un step nuevo (se siembra este contenido en
// vez de arrancar en blanco) y en el botón "Restaurar plantilla por defecto"
// del canvas, sobre el step que esté seleccionado en ese momento — por eso es
// una función de la posición y no una constante fija por step.

export interface DunningStepDefaults {
  subject: string;
  heading: string;
  body_text: string;
  cta_label: string;
  show_payment_button: boolean;
}

const TONES: DunningStepDefaults[] = [
  {
    subject: "Tu cuota de {{gimnasio}} está vencida",
    heading: "¡Hola {{nombre}}!",
    body_text:
      "Queríamos avisarte que tu cuota de {{gimnasio}} venció el {{vencimiento}} y quedó un saldo pendiente de {{monto}}. Si ya la pagaste, ignorá este mensaje. Si no, podés hacerlo en un clic desde el botón de acá abajo. ¡Te esperamos!",
    cta_label: "Pagar mi cuota",
    show_payment_button: true,
  },
  {
    subject: "Seguís debiendo tu cuota de {{gimnasio}}",
    heading: "Hola {{nombre}}, un recordatorio",
    body_text:
      "Tu cuota de {{gimnasio}} venció el {{vencimiento}} (hace {{dias_atraso}} días) y todavía figura un saldo de {{monto}}.\n\n{{detalle}}\n\nRegularizala cuando puedas desde el botón de abajo.",
    cta_label: "Regularizar mi cuota",
    show_payment_button: true,
  },
  {
    subject: "Último aviso: cuota vencida en {{gimnasio}}",
    heading: "{{nombre}}, tu cuota sigue impaga",
    body_text:
      "Ya pasaron {{dias_atraso}} días desde el vencimiento de tu cuota en {{gimnasio}} ({{monto}}). Te pedimos que la regularices a la brevedad para seguir disfrutando de todos los beneficios.\n\n{{detalle}}",
    cta_label: "Pagar ahora",
    show_payment_button: true,
  },
];

/**
 * Plantilla por defecto para un recordatorio, según su posición (0-based)
 * entre los recordatorios del gym ordenados por days_after_due. A partir del
 * tercero se repite el tono más firme: no hay un cuarto escalón de urgencia.
 */
export function defaultDunningStep(order: number): DunningStepDefaults {
  return TONES[Math.min(Math.max(order, 0), TONES.length - 1)];
}

// Variables que el owner puede insertar en el mensaje. Mismo nombre exacto que
// resuelve el job (supabase/functions/cobranza-recordatorios) — cambiar un
// token acá sin cambiarlo allá deja la variable sin reemplazar en el mail.
export const DUNNING_VARIABLES: { token: string; label: string }[] = [
  { token: "{{nombre}}", label: "Nombre del socio" },
  { token: "{{gimnasio}}", label: "Nombre del gimnasio" },
  { token: "{{monto}}", label: "Monto adeudado" },
  { token: "{{vencimiento}}", label: "Fecha de vencimiento" },
  { token: "{{dias_atraso}}", label: "Días de atraso" },
  { token: "{{detalle}}", label: "Detalle de las cuotas" },
];

// Datos de ejemplo para el preview y el mail de prueba: no hay un socio real
// detrás todavía cuando el owner está editando el canvas.
export const DUNNING_SAMPLE_VARS: Record<string, string> = {
  nombre: "Martina",
  gimnasio: "tu gimnasio",
  monto: "$ 15.000",
  vencimiento: "22 de julio de 2026",
  dias_atraso: "5",
  detalle: "Musculación · julio 2026: $ 15.000",
};

/** Mismo criterio que el job: reemplazo simple de {{variable}} por su valor. */
export function resolveDunningVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), text);
}
