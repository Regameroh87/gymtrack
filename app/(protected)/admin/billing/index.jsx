import React from "react";
import ComingSoonScreen from "../../../../src/components/ComingSoonScreen";

export default function BillingPlaceholder() {
  return (
    <ComingSoonScreen
      title="Gestión Contable"
      features={[
        "Gestión de membresías y cuotas",
        "Control de pagos y vencimientos",
        "Historial de transacciones de socios",
        "Reportes visuales de ingresos"
      ]}
    />
  );
}
