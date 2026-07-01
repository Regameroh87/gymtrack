// Facturación de la plataforma (super_admin). Placeholder migrado de Expo
// platform/billing/index.web.jsx. Gating por rol en el server.
import { redirect } from "next/navigation";
import { Receipt, Clock, BarChart3 } from "lucide-react";

import { getSessionContext } from "@/lib/auth/session";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PlatformPlaceholder } from "@/components/platform/platform-placeholder";

export default async function PlatformBillingPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "billing")) redirect("/dashboard");

  return (
    <PlatformShell>
      <PlatformPlaceholder
        kicker="Facturación"
        title="Facturación y suscripciones"
        subtitle="Planes y estado de pago de cada gimnasio (el SaaS)"
        description="Esta sección permitirá ver qué gimnasios están al día, gestionar sus planes de suscripción y controlar los cobros de la plataforma."
        icon={Receipt}
        badge="Billing"
        features={[
          {
            icon: Clock,
            title: "Estado de cada suscripción",
            sub: "Vigencia, vencimientos y morosidad por gimnasio",
            color: "#0284c7",
            bubble: "bg-sky-50",
          },
          {
            icon: BarChart3,
            title: "Ingresos de la plataforma",
            sub: "MRR, altas y bajas a lo largo del tiempo",
            color: "#d97706",
            bubble: "bg-amber-50",
          },
        ]}
      />
    </PlatformShell>
  );
}
