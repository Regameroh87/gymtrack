"use client";

// Barra de pestañas de Contabilidad: Membresías / Pagos recibidos / Ingresos por
// actividad / Pagos a coaches, como sub-rutas de /admin/billing. Estilo pill
// igual a los FILTERS de la página de membresías.
//
// Se filtran por permiso: un coach con payments.register solo ve cobranza
// (Membresías, Pagos recibidos); Ingresos y Pagos a coaches son datos del
// negocio y liquidaciones, reservados a admin/owner.

import { usePathname } from "next/navigation";
import Link from "next/link";

import { PERMISSIONS } from "@gymtrack/core/permissions";
import { isAdminRole } from "@/lib/auth/roles";
import { useGymPermissions } from "@/components/auth/use-gym-permissions";

type BillingTab = {
  href: string;
  label: string;
  exact: boolean;
  // Visible si la persona cumple este predicado con sus permisos efectivos.
  visible: (p: { can: (perm: string) => boolean; role: string | null }) => boolean;
};

const TABS: BillingTab[] = [
  {
    href: "/admin/billing",
    label: "Membresías",
    exact: true,
    visible: ({ can }) => can(PERMISSIONS.PAYMENTS_REGISTER),
  },
  {
    href: "/admin/billing/payments",
    label: "Pagos recibidos",
    exact: false,
    visible: ({ can }) =>
      can(PERMISSIONS.PAYMENTS_REGISTER) || can(PERMISSIONS.PAYMENTS_VOID),
  },
  {
    href: "/admin/billing/income",
    label: "Ingresos por actividad",
    exact: false,
    visible: ({ role }) => isAdminRole(role),
  },
  {
    href: "/admin/billing/coaches",
    label: "Pagos a coaches",
    exact: false,
    visible: ({ role }) => isAdminRole(role),
  },
];

export function BillingTabs() {
  const pathname = usePathname();
  const { can, role } = useGymPermissions();

  const tabs = TABS.filter((tab) => tab.visible({ can, role }));

  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto">
      {tabs.map((tab) => {
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
