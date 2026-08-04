"use client";

// Barra de pestañas de Cobranza: Configuración / Seguimiento, como sub-rutas de
// /admin/cobranza. Mismo patrón y mismo estilo que BillingTabs.
//
// No filtra por permiso, a diferencia de las de Contabilidad: las dos pantallas
// ya están detrás del mismo guard de rol (MODULE_ROLES.cobranza, owner o admin),
// así que quien ve una ve la otra. Un filtro acá sería una segunda copia de esa
// regla, con el riesgo de que se desincronice.

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/admin/cobranza", label: "Configuración", exact: true },
  { href: "/admin/cobranza/seguimiento", label: "Seguimiento", exact: false },
];

export function CobranzaTabs() {
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
