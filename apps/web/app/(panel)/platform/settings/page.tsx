// Ajustes de la plataforma (super_admin). Placeholder migrado de Expo
// platform/settings/index.web.jsx. Gating por rol en el server.
import { redirect } from "next/navigation";
import { Settings, Dumbbell, ShieldHalf } from "lucide-react";

import { getSessionContext } from "@/lib/auth/session";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PlatformPlaceholder } from "@/components/platform/platform-placeholder";

export default async function PlatformSettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx.isSuperAdmin) redirect("/dashboard");

  return (
    <PlatformShell>
      <PlatformPlaceholder
        kicker="Ajustes"
        title="Ajustes de plataforma"
        subtitle="Configuración global del sistema y branding por defecto"
        description="Esta sección permitirá definir el branding por defecto, parámetros del sistema y opciones que aplican a todos los gimnasios."
        icon={Settings}
        badge="Settings"
        features={[
          {
            icon: Dumbbell,
            title: "Branding por defecto",
            sub: "Logo, colores y textos base para gimnasios nuevos",
            color: "#3023cd",
            bubble: "bg-brandPrimary-50",
          },
          {
            icon: ShieldHalf,
            title: "Parámetros del sistema",
            sub: "Opciones globales que aplican a toda la plataforma",
            color: "#2dd4bf",
            bubble: "bg-brandSecondary-500/10",
          },
        ]}
      />
    </PlatformShell>
  );
}
