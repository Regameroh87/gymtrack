// Motivos de baja de la suscripción SaaS. El valor se guarda en
// gym_saas_subscriptions.cancel_reason; el label es lo que ve el owner.
// Compartido entre el modal y la tabla de plataforma para que el super admin
// vea texto y no un slug.

export const CANCEL_REASONS = [
  { value: "too_expensive", label: "Es muy caro para mi gimnasio" },
  { value: "missing_features", label: "Le faltan funciones que necesito" },
  { value: "switching_tool", label: "Me paso a otra herramienta" },
  { value: "closing_gym", label: "Cierro o pauso el gimnasio" },
  { value: "not_using", label: "No le estoy dando uso" },
  { value: "technical_issues", label: "Tuve problemas técnicos" },
  { value: "other", label: "Otro motivo" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["value"];

const VALUES = new Set<string>(CANCEL_REASONS.map((r) => r.value));

export const isCancelReason = (v: unknown): v is CancelReason =>
  typeof v === "string" && VALUES.has(v);

/** Label del motivo, o el valor crudo si no está en el catálogo (motivos viejos). */
export function cancelReasonLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CANCEL_REASONS.find((r) => r.value === value)?.label ?? value;
}
