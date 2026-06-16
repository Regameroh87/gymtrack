import PlatformPlaceholder from "../../../../../src/components/admin/PlatformPlaceholder.web";

import {
  Settings,
  Barbell,
  ShieldHalf,
} from "../../../../../assets/icons";

export default function PlatformSettingsWeb() {
  return (
    <PlatformPlaceholder
      kicker="Ajustes"
      title="Ajustes de plataforma"
      subtitle="Configuración global del sistema y branding por defecto"
      description="Esta sección permitirá definir el branding por defecto, parámetros del sistema y opciones que aplican a todos los gimnasios."
      icon={Settings}
      badge="Settings"
      features={[
        {
          icon: Barbell,
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
  );
}
