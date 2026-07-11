// Chrome compartido de Contabilidad: padding de página + barra de pestañas
// (Membresías / Ingresos por actividad / Pagos a coaches).

import { BillingTabs } from "@/components/panel/billing-tabs";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 pb-14 md:p-9">
      <BillingTabs />
      {children}
    </div>
  );
}
