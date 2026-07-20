"use client";

// Sección Datos (/admin/data): exportar los datos del gym a Excel e importar
// desde la misma plantilla. Solo admin/owner (MODULE_ROLES.data); el layout de
// /admin ya bloquea a los no-staff y la RLS sigue siendo la autoridad real.

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymPermissions } from "@/components/auth/use-gym-permissions";
import { PageHeader } from "@/components/ui/page-header";
import { ExportCard } from "@/components/admin/data/export-card";
import { ImportCard } from "@/components/admin/data/import-card";

type Tab = "export" | "import";

export default function AdminDataPage() {
  const { gymId } = useActiveGym();
  const { canAccessModule, loading } = useGymPermissions();
  const [tab, setTab] = useState<Tab>("export");

  // Fail-closed: esperar los grants antes de decidir que NO se ve.
  if (!loading && !canAccessModule("data")) {
    return (
      <div className="p-4 md:p-9">
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <ShieldAlert size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            Sin permiso
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            Esta sección es solo para administradores del gimnasio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Datos"
        title="Exportar / Importar"
        description="Descargá los datos del gimnasio en Excel o cargalos desde una planilla"
      />

      <div className="mb-5 flex w-fit gap-1 rounded-xl border border-ui-input-border bg-white p-1">
        <TabButton active={tab === "export"} onClick={() => setTab("export")}>
          Exportar
        </TabButton>
        <TabButton active={tab === "import"} onClick={() => setTab("import")}>
          Importar
        </TabButton>
      </div>

      {tab === "export" ? <ExportCard gymId={gymId} /> : <ImportCard gymId={gymId} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[9px] px-4 py-2 font-manrope text-xs font-bold transition ${
        active
          ? "bg-brandPrimary-600 text-white"
          : "text-ui-text-muted hover:bg-brandPrimary-50/60"
      }`}
    >
      {children}
    </button>
  );
}
