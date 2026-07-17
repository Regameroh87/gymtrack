// Chrome compartido de Contabilidad: padding de página + barra de pestañas
// (Membresías / Pagos recibidos / Ingresos por actividad / Pagos a coaches).
// BillingGuard cierra el acceso por URL a sub-rutas que el rol/grants no habilitan.

import { BillingTabs } from "@/components/panel/billing-tabs";
import { BillingGuard } from "@/components/panel/billing-guard";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 pb-14 md:p-9">
      <BillingTabs />
      <BillingGuard>{children}</BillingGuard>
    </div>
  );
}
