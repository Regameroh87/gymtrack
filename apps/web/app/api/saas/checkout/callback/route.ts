// GET /api/saas/checkout/callback
// MP redirige aquí después de que el owner autoriza (o cancela) el pago.
// El estado real se actualiza vía webhook (mp-webhook edge function); acá
// solo redirigimos al admin con un query param para que la UI muestre feedback.

import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const preapprovalId = url.searchParams.get("preapproval_id") ?? "";

  // MP puede enviar status=authorized o status=pending (si el usuario salió sin autorizar).
  // El webhook mp-webhook es la fuente de verdad; acá solo hacemos UX.
  const destination =
    status === "authorized"
      ? `/admin/suscripcion?activated=1&preapproval_id=${preapprovalId}`
      : `/admin/suscripcion?pending=1`;

  redirect(destination);
}
