"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  CreditCard,
  Info,
  ShieldAlert,
} from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import {
  useGymSaasSubscription,
  type GymSaasSubscription,
  type SaasSubscriptionStatus,
} from "@/lib/hooks/use-saas-subscription";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { isOwnerRole } from "@/lib/auth/roles";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<
  SaasSubscriptionStatus,
  {
    label: string;
    badgeClass: string;
    icon: typeof CheckCircle2;
    iconColor: string;
  }
> = {
  pending: {
    label: "Pendiente de activación",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
    iconColor: "#d97706",
  },
  trialing: {
    label: "En período de prueba",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
    iconColor: "#2563eb",
  },
  active: {
    label: "Activo",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
    iconColor: "#16a34a",
  },
  past_due: {
    label: "Pago pendiente",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: AlertCircle,
    iconColor: "#ef4444",
  },
  canceled: {
    label: "Cancelado",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    icon: XCircle,
    iconColor: "#64748b",
  },
  expired: {
    label: "Vencido",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
    iconColor: "#ef4444",
  },
};

function getDescription(sub: GymSaasSubscription): string {
  const hasCard = !!sub.mp_preapproval_id;
  switch (sub.status) {
    case "pending":
      return "Tu gym fue creado pero aún no tiene una suscripción activa. Activá el plan para empezar a usarlo.";
    case "trialing":
      return hasCard
        ? `Estás en el período de prueba gratuita. Ya cargaste tu método de pago: el primer cobro será el ${fmt(sub.trial_ends_at)}.`
        : `Estás en el período de prueba gratuita hasta el ${fmt(sub.trial_ends_at)}. Agregá tu método de pago ahora para que el servicio no se corte cuando termine la prueba. No se te cobra nada hasta esa fecha.`;
    case "active":
      return `Tu suscripción está activa. Próximo cobro: ${fmt(sub.current_period_end)}.`;
    case "past_due":
      return "Hubo un problema con tu último pago. MercadoPago reintentará el cobro automáticamente en los próximos días.";
    case "canceled":
      return `Tu suscripción fue cancelada el ${fmt(sub.canceled_at)}. Podés reactivarla en cualquier momento.`;
    case "expired":
      return "Tu suscripción venció. El gym está en modo solo lectura. Activá el plan para recuperar el acceso completo.";
    default:
      return "";
  }
}

const canActivate = (s: SaasSubscriptionStatus) =>
  s === "pending" || s === "expired" || s === "canceled";

// Durante el trial se puede cargar la tarjeta de forma anticipada mientras no
// haya un preapproval de MP asociado (el checkout respeta los días restantes y
// programa el primer cobro para el fin del trial).
const canAddCardDuringTrial = (sub: GymSaasSubscription | null | undefined) =>
  sub?.status === "trialing" && !sub.mp_preapproval_id;

// ── page sub-components ───────────────────────────────────────────────────────

function FeedbackBanners() {
  const params = useSearchParams();
  const activated = params.get("activated") === "1";
  const pending = params.get("pending") === "1";

  if (activated) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 size={16} color="#16a34a" className="shrink-0" />
        <p className="font-manrope text-[13px] font-semibold text-green-800">
          ¡Suscripción activada! Tu período de prueba ya está en curso.
        </p>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Clock size={16} color="#d97706" className="shrink-0" />
        <p className="font-manrope text-[13px] font-semibold text-amber-800">
          El proceso está pendiente. Si completaste el pago en MercadoPago, el
          estado se actualizará en unos minutos.
        </p>
      </div>
    );
  }

  return null;
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function SuscripcionPage() {
  const { gymId, role } = useActiveGym();
  const { data: sub, isLoading } = useGymSaasSubscription(gymId);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isOwner = isOwnerRole(role);

  if (!isOwner) {
    return (
      <div className="p-4 md:p-9">
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            Sin permiso
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            Esta sección es solo para el dueño del gimnasio.
          </p>
        </div>
      </div>
    );
  }

  async function handleActivate() {
    if (!gymId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/saas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gym_id: gymId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Error al iniciar el checkout",
        );
      }
      const { init_point } = (await res.json()) as { init_point: string };
      window.location.href = init_point;
    } catch (err: unknown) {
      setCheckoutError(
        err instanceof Error ? err.message : "Error desconocido",
      );
      setCheckoutLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-14 md:p-9">
        <PageHeader section="Suscripción" title="Plan y Facturación" />
        <div className="h-48 animate-pulse rounded-card border border-ui-input-border bg-white" />
      </div>
    );
  }

  const status: SaasSubscriptionStatus = sub?.status ?? "pending";
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Suscripción"
        title="Plan y Facturación"
        description="Gestioná tu suscripción a GymTrack Pro"
      />

      {/* Feedback de MP callback (necesita Suspense por useSearchParams) */}
      <Suspense>
        <FeedbackBanners />
      </Suspense>

      <div className="flex flex-col gap-4 md:max-w-2xl">
        {/* Status card */}
        <div className="rounded-card border border-ui-input-border bg-white shadow-card-brand">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ui-input-border px-5 py-4">
            <p className="font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
              Estado actual
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${cfg.badgeClass}`}
            >
              <StatusIcon size={12} color={cfg.iconColor} />
              <span className="font-manrope text-[11px] font-bold">
                {cfg.label}
              </span>
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="mb-4 font-manrope text-[13px] leading-5 text-ui-text-muted">
              {sub
                ? getDescription(sub)
                : "Activá tu suscripción para empezar a usar GymTrack Pro."}
            </p>

            {/* Plan details */}
            {sub?.plan && (
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-ui-input-border bg-ui-background-light p-4 md:grid-cols-3">
                <div>
                  <p className="mb-0.5 font-manrope text-[10px] text-ui-text-muted">
                    Plan
                  </p>
                  <p className="font-jakarta text-sm font-bold text-ui-text-main">
                    {sub.plan.name}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 font-manrope text-[10px] text-ui-text-muted">
                    Precio
                  </p>
                  <p className="font-jakarta text-sm font-bold text-ui-text-main">
                    {sub.plan.price
                      ? `${sub.plan.currency} ${sub.plan.price.toLocaleString("es-AR")}/mes`
                      : "A confirmar"}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 font-manrope text-[10px] text-ui-text-muted">
                    Prueba gratuita
                  </p>
                  <p className="font-jakarta text-sm font-bold text-ui-text-main">
                    {sub.plan.trial_days} días
                  </p>
                </div>
              </div>
            )}

            {/* Error de checkout */}
            {checkoutError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle size={13} color="#ef4444" className="shrink-0" />
                <p className="font-manrope text-[12px] text-red-700">
                  {checkoutError}
                </p>
              </div>
            )}

            {/* Acción principal */}
            {(canActivate(status) || canAddCardDuringTrial(sub)) && (
              <Button
                variant="primary"
                size="lg"
                loading={checkoutLoading}
                icon={<CreditCard size={16} />}
                onClick={handleActivate}
              >
                {status === "canceled"
                  ? "Reactivar suscripción"
                  : status === "trialing"
                    ? "Agregar método de pago"
                    : "Activar suscripción"}
              </Button>
            )}

            {/* Gestión: solo cuando ya hay una suscripción cargada en MP */}
            {(status === "active" ||
              (status === "trialing" && !!sub?.mp_preapproval_id)) && (
              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <Info size={14} color="#2563eb" className="mt-0.5 shrink-0" />
                <p className="font-manrope text-[12px] leading-5 text-blue-800">
                  Tu método de pago ya está cargado. Para cambiar la tarjeta o
                  cancelar la suscripción, entrá a tu cuenta de{" "}
                  <strong>MercadoPago → Tu perfil → Suscripciones</strong>.
                </p>
              </div>
            )}

            {status === "past_due" && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle
                  size={14}
                  color="#ef4444"
                  className="mt-0.5 shrink-0"
                />
                <p className="font-manrope text-[12px] leading-5 text-red-800">
                  MercadoPago reintentará el cobro automáticamente. Si el
                  problema persiste por más de 30 días, la suscripción se
                  cancelará. Revisá tu método de pago desde tu cuenta de MP.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
