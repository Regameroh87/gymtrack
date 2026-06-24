// Stub del panel de ADMIN de un gym (staff). La cadena de auth/rol/gym ya
// funciona; los módulos reales (usuarios, ejercicios, sesiones, planes, etc.) se
// migran en fases siguientes.

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";

export default async function AdminPage() {
  const ctx = await getSessionContext();
  // Solo staff. El super_admin necesita un gym activo (su contexto operativo).
  if (!isStaffRole(ctx.role)) redirect("/dashboard");
  if (ctx.isSuperAdmin && !ctx.activeGymId) redirect("/platform");

  return (
    <PanelShell>
      <div className="px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brandPrimary-700">
          {ctx.activeGym?.name ?? "Gimnasio"}
        </p>
        <h1 className="mt-1 font-jakarta text-2xl font-bold text-gray-900">
          Panel de administración
        </h1>
        <p className="mt-3 max-w-prose text-sm text-gray-500">
          Base de autenticación lista. Los módulos de gestión (usuarios,
          ejercicios, sesiones, planes…) se migran en fases siguientes.
        </p>
      </div>
    </PanelShell>
  );
}
