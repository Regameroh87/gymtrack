// Usuarios globales de la plataforma (super_admin). Placeholder migrado de Expo
// platform/users/index.web.jsx. Gating por rol en el server.
import { redirect } from "next/navigation";
import { Users, ShieldHalf, UserPlus } from "lucide-react";

import { getSessionContext } from "@/lib/auth/session";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PlatformPlaceholder } from "@/components/platform/platform-placeholder";

export default async function PlatformUsersPage() {
  const ctx = await getSessionContext();
  if (!ctx.isSuperAdmin) redirect("/dashboard");

  return (
    <PlatformShell>
      <PlatformPlaceholder
        kicker="Usuarios globales"
        title="Usuarios globales"
        subtitle="Super admins y staff a nivel de toda la plataforma"
        description="Esta sección permitirá administrar a los super admins y al staff con alcance global, por fuera de un gimnasio puntual."
        icon={Users}
        badge="Users"
        features={[
          {
            icon: ShieldHalf,
            title: "Gestión de super admins",
            sub: "Alta y baja de administradores de plataforma",
            color: "#2dd4bf",
            bubble: "bg-brandSecondary-500/10",
          },
          {
            icon: UserPlus,
            title: "Staff cross-gym",
            sub: "Usuarios con acceso a múltiples gimnasios",
            color: "#3023cd",
            bubble: "bg-brandPrimary-50",
          },
        ]}
      />
    </PlatformShell>
  );
}
