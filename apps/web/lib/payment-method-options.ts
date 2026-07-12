// Métodos de pago válidos para subscription_payments.payment_method (ver check
// constraint subscription_payments_payment_method_check).

export const PAYMENT_METHOD_OPTIONS = [
  { label: "Efectivo", value: "efectivo" },
  { label: "Transferencia", value: "transferencia" },
  { label: "Tarjeta", value: "tarjeta" },
  { label: "Mercado Pago / QR", value: "mercado_pago" },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label])
);
