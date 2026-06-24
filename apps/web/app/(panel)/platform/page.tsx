// Stub del panel de PLATAFORMA (super_admin). La cadena de auth/rol/gym ya
// funciona; el contenido real (dashboard + CRUD de gyms + catálogo) se migra en
// la próxima fase.

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { PanelShell } from "@/components/panel/panel-shell";

export default async function PlatformPage() {
  const ctx = await getSessionContext();
  // Gating por rol (el middleware solo valida sesión, no rol).
  if (!ctx.isSuperAdmin) redirect("/dashboard");

  return (
    <PanelShell>
      <div className="px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brandPrimary-700">
          Plataforma
        </p>
        <h1 className="mt-1 font-jakarta text-2xl font-bold text-gray-900">
          Panel de super administrador
        </h1>
        <p className="mt-3 max-w-prose text-sm text-gray-500">
          Base de autenticación lista. El dashboard de plataforma y el CRUD de
          gimnasios se migran en la próxima fase.
        </p>
      </div>
    </PanelShell>
  );
}
