import React from "react";
import ComingSoonScreen from "../../../../src/components/ComingSoonScreen";

export default function ReportsPlaceholder() {
  return (
    <ComingSoonScreen
      title="Reportes y Estadísticas"
      features={[
        "Dashboard de métricas diarias",
        "Reportes de asistencia por horarios",
        "Métricas de retención de socios",
        "Ejercicios y rutinas más populares"
      ]}
    />
  );
}
