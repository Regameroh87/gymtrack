import PlatformPlaceholder from "../../../../../src/components/admin/PlatformPlaceholder.web";

import {
  Receipt,
  Clock,
  ChartBar,
} from "../../../../../assets/icons";

export default function PlatformBillingWeb() {
  return (
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
          icon: ChartBar,
          title: "Ingresos de la plataforma",
          sub: "MRR, altas y bajas a lo largo del tiempo",
          color: "#d97706",
          bubble: "bg-amber-50",
        },
      ]}
    />
  );
}
