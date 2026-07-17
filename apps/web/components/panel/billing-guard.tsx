"use client";

// Guard de las páginas de Contabilidad: defensa en profundidad sobre la RLS
// (que sigue siendo la autoridad real). Evita que alguien llegue por URL a una
// pantalla que su rol/grants no habilitan y la vea rota o vacía:
//   - sin acceso a billing (ni por rol ni por grant) ⇒ vuelve al dashboard;
//   - coach con permisos de cobro en una sub-ruta admin-only (Ingresos, Pagos a
//     coaches) ⇒ a la primera pestaña que sí ve;
//   - solo con payments.void (sin register) en Membresías ⇒ a Pagos recibidos.

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PERMISSIONS } from "@gymtrack/core/permissions";
import { isAdminRole } from "@/lib/auth/roles";
import { useGymPermissions } from "@/components/auth/use-gym-permissions";

export function BillingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, role, can, canAccessModule } = useGymPermissions();

  const allowed = canAccessModule("billing");
  const canRegister = can(PERMISSIONS.PAYMENTS_REGISTER);
  const adminOnly =
    pathname.startsWith("/admin/billing/income") ||
    pathname.startsWith("/admin/billing/coaches");
  const atRoot = pathname === "/admin/billing";

  const blocked =
    !allowed || (adminOnly && !isAdminRole(role)) || (atRoot && !canRegister);

  useEffect(() => {
    if (loading || !blocked) return;
    if (!allowed) router.replace("/admin");
    else if (adminOnly && !isAdminRole(role))
      router.replace(canRegister ? "/admin/billing" : "/admin/billing/payments");
    else router.replace("/admin/billing/payments");
  }, [loading, blocked, allowed, adminOnly, role, canRegister, router]);

  // Mientras cargan los grants, o si la ruta está bloqueada (antes de que el
  // replace surta efecto), no renderizamos la pantalla protegida.
  if (loading || blocked) return null;
  return <>{children}</>;
}
