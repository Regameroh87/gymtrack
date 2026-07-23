"use client";

import { AlertCircle, AlertTriangle, XCircle, Info } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useSubscriptionBanner } from "@/lib/hooks/use-saas-subscription";
import { isOwnerRole } from "@/lib/auth/roles";

const BANNER_CONFIG = {
  trial_ending_soon: {
    wrapperClass: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconColor: "#d97706",
    getText: (days: number | null) =>
      `Tu período de prueba vence en ${days ?? 0} día${days === 1 ? "" : "s"}.`,
    cta: "Activar plan",
  },
  trial_expired: {
    wrapperClass: "bg-red-50 border-red-200",
    icon: XCircle,
    iconColor: "#ef4444",
    getText: () => "Tu período de prueba venció. El gym está en modo solo lectura.",
    cta: "Activar plan",
  },
  payment_failed: {
    wrapperClass: "bg-red-50 border-red-200",
    icon: AlertCircle,
    iconColor: "#ef4444",
    getText: () => "Pago pendiente. Actualizá tu método de pago para continuar.",
    cta: "Ver suscripción",
  },
  canceled: {
    wrapperClass: "bg-slate-50 border-slate-200",
    icon: Info,
    iconColor: "#64748b",
    getText: () =>
      "Tu suscripción fue cancelada. Reactivala para seguir usando GymTrack.",
    cta: "Reactivar",
  },
} as const;

export function SaasSubscriptionBanner() {
  const { gymId, role } = useActiveGym();
  const { kind, daysLeft } = useSubscriptionBanner(gymId);

  // El billing del gym es del owner: ni admin/coach ni super_admin ven el banner
  // (su CTA lleva a /admin/suscripcion, que solo el owner puede gestionar).
  if (!isOwnerRole(role)) return null;
  if (kind === "none") return null;

  const cfg = BANNER_CONFIG[kind];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-2.5 ${cfg.wrapperClass}`}
    >
      <Icon size={15} color={cfg.iconColor} className="shrink-0" />
      <p className="flex-1 font-manrope text-[12px] font-semibold text-ui-text-main">
        {cfg.getText(daysLeft)}
      </p>
      <a
        href="/admin/suscripcion"
        className="shrink-0 rounded-lg border border-ui-input-border bg-white px-3 py-1 font-manrope text-[11px] font-bold text-ui-text-main shadow-sm hover:bg-brandPrimary-50/50"
      >
        {cfg.cta}
      </a>
    </div>
  );
}
