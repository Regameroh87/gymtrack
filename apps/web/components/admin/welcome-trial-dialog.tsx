"use client";

// Velo de bienvenida post-signup self-service. Se muestra una única vez cuando
// el dashboard se abre con ?bienvenida=1 (redirect de /registro tras crear el
// gym); al cerrarlo se limpia el query param para que un refresh no lo repita.

// Next
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Librerías
import { PartyPopper, X } from "lucide-react";

// Contextos y hooks
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymSaasSubscription } from "@/lib/hooks/use-saas-subscription";
import { isOwnerRole } from "@/lib/auth/roles";

export function WelcomeTrialDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { gymId, role } = useActiveGym();
  const { data: subscription } = useGymSaasSubscription(gymId);
  const open = searchParams.get("bienvenida") === "1";

  if (!open) return null;
  // La activación de la suscripción es del owner; para el resto no hay CTA.
  if (!isOwnerRole(role)) return null;

  // trial_days del plan real del gym (mismo dato que la landing/registro). La
  // query ya viene cacheada del banner del shell; el fallback cubre el instante
  // de carga.
  const trialDays = subscription?.plan?.trial_days ?? 14;
  const dismiss = () => router.replace("/admin", { scroll: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-card-lg bg-white p-8 text-center shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brandPrimary-50">
          <PartyPopper size={32} className="text-brandPrimary-600" />
        </div>

        <h2 className="font-jakarta text-2xl font-extrabold tracking-tight text-gray-900">
          ¡Tu gimnasio ya está online!
        </h2>
        <p className="mt-3 font-manrope text-sm leading-relaxed text-gray-500">
          Tu prueba gratis de {trialDays} días empezó. Sumá a tus socios, cargá tus
          actividades y explorá el panel. Cuando quieras, activá tu suscripción
          para seguir después del trial.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-2xl bg-brandPrimary-600 p-3.5 font-manrope text-base font-bold text-white transition hover:bg-brandPrimary-700"
          >
            Empezar a configurar
          </button>
          <Link
            href="/admin/suscripcion"
            className="w-full rounded-2xl border border-gray-200 p-3.5 font-manrope text-base font-bold text-gray-700 transition hover:border-brandPrimary-600 hover:text-brandPrimary-700"
          >
            Ver mi suscripción
          </Link>
        </div>
      </div>
    </div>
  );
}
