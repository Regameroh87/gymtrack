// Página de vuelta del checkout de MercadoPago para los cobros de cuota que
// arrancan desde un MAIL de cobranza (cobranza-recordatorios) o, en general,
// desde cualquier lugar sin la app instalada. crear-cobro-socio sigue usando
// el deep link (gymtrack://) para el flujo dentro de la app — esta página es
// SOLO para el flujo web.
//
// Estática y sin lógica a propósito: quien confirma el pago de verdad es
// mp-gym-webhook (vía register_member_online_payment), no este retorno. Acá
// no hay nada que consultar ni nada que pueda fallar.

import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Pago recibido — GymTrack",
  description: "Tu pago se está acreditando.",
};

export default function PagoGraciasPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ui-background-light px-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-card border border-ui-input-border bg-white p-8 text-center shadow-card-brand">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 size={28} color="#16a34a" />
        </div>
        <h1 className="font-jakarta text-xl font-bold text-ui-text-main">¡Listo!</h1>
        <p className="mt-2 font-manrope text-sm text-ui-text-muted">
          Tu pago se está acreditando. En unos minutos tu cuota va a quedar al
          día — no hace falta que hagas nada más.
        </p>
        <p className="mt-4 font-manrope text-xs text-ui-text-muted">
          Ya podés cerrar esta ventana.
        </p>
      </div>
    </main>
  );
}
