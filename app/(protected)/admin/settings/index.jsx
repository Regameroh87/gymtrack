import React from "react";
import ComingSoonScreen from "../../../../src/components/ComingSoonScreen";

export default function SettingsPlaceholder() {
  return (
    <ComingSoonScreen
      title="Configuración"
      features={[
        "Datos maestros del gimnasio (Logo, Dirección)",
        "Horarios de operación y feriados",
        "Gestión de roles y permisos del staff",
        "Ajustes de notificaciones automáticas"
      ]}
    />
  );
}
