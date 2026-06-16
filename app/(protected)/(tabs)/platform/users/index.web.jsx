import PlatformPlaceholder from "../../../../../src/components/admin/PlatformPlaceholder";

import {
  Users,
  ShieldHalf,
  UserPlus,
} from "../../../../../assets/icons";

export default function PlatformUsersWeb() {
  return (
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
  );
}
