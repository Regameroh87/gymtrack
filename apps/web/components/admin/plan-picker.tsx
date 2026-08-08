"use client";

// Selector de plan para el owner, en /admin/suscripcion.
//
// Con un solo plan activo se colapsa a una ficha sin radio ni interacción: un
// gimnasio que no tiene entre qué elegir no debería ver una lista de una opción.

// Iconos
import { Check, Users, Calendar, Sparkles } from "lucide-react";

// Hooks
import type { SaasPlanOption } from "@/lib/hooks/use-saas-subscription";

function precio(plan: SaasPlanOption): string {
  if (plan.price == null) return "A confirmar";
  return `${plan.currency} ${plan.price.toLocaleString("es-AR")}`;
}

export function PlanPicker({
  plans,
  currentPlanId,
  selectedId,
  onSelect,
  disabled,
}: {
  plans: SaasPlanOption[];
  currentPlanId: string | null;
  selectedId: string | null;
  onSelect: (planId: string) => void;
  disabled?: boolean;
}) {
  if (plans.length === 0) return null;

  const unico = plans.length === 1;

  return (
    <div
      className={
        unico ? "" : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {plans.map((plan) => {
        const esActual = plan.id === currentPlanId;
        const elegido = unico || plan.id === selectedId;

        return (
          <button
            key={plan.id}
            type="button"
            disabled={disabled || unico}
            aria-pressed={elegido}
            onClick={() => onSelect(plan.id)}
            className={`relative flex h-full flex-col rounded-xl border p-4 text-left transition ${
              elegido
                ? "border-brandSecondary-500 bg-brandSecondary-50/40 ring-1 ring-brandSecondary-500/30"
                : "border-ui-input-border bg-white hover:border-brandSecondary-300"
            } ${disabled ? "cursor-not-allowed opacity-60" : unico ? "cursor-default" : "cursor-pointer"}`}
          >
            {/* Encabezado: nombre + señales */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-jakarta text-sm font-bold text-ui-text-main">
                  {plan.name}
                </p>
                {esActual && (
                  <span className="mt-1 inline-block rounded-full bg-ui-background-light px-2 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wider text-ui-text-muted">
                    Tu plan actual
                  </span>
                )}
              </div>

              {plan.badge_text && (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wider ${
                    plan.is_featured
                      ? "bg-brandSecondary-500 text-white"
                      : "bg-ui-background-light text-ui-text-muted"
                  }`}
                >
                  {plan.is_featured && <Sparkles size={10} />}
                  {plan.badge_text}
                </span>
              )}
            </div>

            {/* Precio */}
            <div className="mb-3 flex items-baseline gap-1">
              <span className="font-jakarta text-xl font-extrabold text-ui-text-main">
                {precio(plan)}
              </span>
              {plan.price != null && (
                <span className="font-manrope text-[11px] text-ui-text-muted">
                  /mes
                </span>
              )}
            </div>

            {/* Tope de socios y prueba: los dos datos que deciden la compra */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-ui-background-light px-2 py-1 font-manrope text-[11px] font-semibold text-ui-text-main">
                <Users size={11} />
                {plan.max_members == null
                  ? "Socios ilimitados"
                  : `Hasta ${plan.max_members} socios`}
              </span>
              {plan.trial_days > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-manrope text-[11px] font-semibold text-emerald-700">
                  <Calendar size={11} />
                  {plan.trial_days} días de prueba
                </span>
              )}
            </div>

            {plan.description && (
              <p className="mb-3 font-manrope text-[12px] leading-5 text-ui-text-muted">
                {plan.description}
              </p>
            )}

            {plan.features.length > 0 && (
              <ul className="mt-auto space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check
                      size={12}
                      className="mt-[3px] shrink-0 text-emerald-500"
                    />
                    <span className="font-manrope text-[12px] leading-4 text-ui-text-muted">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </button>
        );
      })}
    </div>
  );
}
