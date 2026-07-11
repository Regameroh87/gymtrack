"use client";

// Barra de pestañas de Contabilidad: Membresías / Ingresos por actividad / Pagos
// a coaches, como sub-rutas de /admin/billing. Estilo pill igual a los FILTERS
// de la página de membresías.

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/admin/billing", label: "Membresías", exact: true },
  { href: "/admin/billing/income", label: "Ingresos por actividad", exact: false },
  { href: "/admin/billing/coaches", label: "Pagos a coaches", exact: false },
];

export function BillingTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded-xl border px-3.5 py-2.5 transition ${
              active
                ? "btn-gradient border-transparent shadow-btn-brand"
                : "border-ui-input-border bg-white shadow-card-brand hover:bg-brandPrimary-50/60"
            }`}
          >
            <span
              className={`font-manrope text-xs font-semibold ${
                active ? "text-white" : "text-ui-text-muted"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
