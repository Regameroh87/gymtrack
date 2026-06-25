// Layout del panel de ADMIN de un gym. Gating (clon de admin/_layout.web.jsx):
// solo staff; el super_admin sin gym activo va a su panel de plataforma. El chrome
// (sidebar/drawer) lo provee AdminShell, que persiste entre navegaciones del grupo.

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/roles";
import { AdminShell } from "@/components/panel/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  // Solo el staff accede al panel (defensa en profundidad; el middleware ya valida sesión).
  if (!isStaffRole(ctx.role)) redirect("/dashboard");
  // El super_admin sin gym activo no tiene contexto operativo (theme/datos): a plataforma.
  if (ctx.isSuperAdmin && !ctx.activeGymId) redirect("/platform");

  return <AdminShell>{children}</AdminShell>;
}
