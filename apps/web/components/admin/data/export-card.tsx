"use client";

// Card de export de la sección Datos: elegir grupos y descargar el .xlsx.
// El armado del workbook corre en el browser (ver lib/data-transfer/export.ts).

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EXPORT_GROUPS,
  buildExportSheets,
  exportFilename,
  type ExportGroup,
} from "@/lib/data-transfer/export";
import { downloadWorkbook } from "@/lib/data-transfer/xlsx";

export function ExportCard({ gymId }: { gymId: string | null }) {
  const [selected, setSelected] = useState<ExportGroup[]>(
    EXPORT_GROUPS.map((g) => g.value)
  );
  const [busy, setBusy] = useState(false);

  const toggle = (group: ExportGroup) =>
    setSelected((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );

  const onExport = async () => {
    if (!gymId || !selected.length || busy) return;
    setBusy(true);
    try {
      const { sheets, failures } = await buildExportSheets(gymId, selected);

      for (const failure of failures) {
        const label =
          EXPORT_GROUPS.find((g) => g.value === failure.group)?.label ??
          failure.group;
        toast.error(`No se pudo exportar ${label}: ${failure.message}`);
      }

      const dataSheets = sheets.filter((s) => !s.aoa);
      if (!dataSheets.length) {
        setBusy(false);
        return;
      }

      await downloadWorkbook(exportFilename(), sheets);
      const total = dataSheets.reduce((n, s) => n + s.rows.length, 0);
      toast.success(`Excel generado: ${total} filas.`, {
        description: dataSheets
          .map((s) => `${s.name}: ${s.rows.length}`)
          .join(" · "),
        duration: 8000,
      });
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo generar el Excel.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
        Exportar a Excel
      </h2>
      <p className="mt-1 font-manrope text-xs text-ui-text-muted">
        Se descarga un archivo .xlsx con una hoja por tipo de dato. Ese mismo
        archivo sirve como plantilla para importar.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {EXPORT_GROUPS.map((group) => (
          <label
            key={group.value}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-ui-input-border bg-white px-3.5 py-3 hover:bg-brandPrimary-50/40"
          >
            <input
              type="checkbox"
              checked={selected.includes(group.value)}
              onChange={() => toggle(group.value)}
              className="mt-0.5 h-4 w-4 accent-brandPrimary-600"
            />
            <span>
              <span className="block font-manrope text-[13px] font-bold text-ui-text-main">
                {group.label}
              </span>
              <span className="block font-manrope text-[11px] text-ui-text-muted">
                {group.detail}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5">
        <Button
          onClick={onExport}
          disabled={busy || !selected.length}
          icon={
            busy ? (
              <Loader2 size={15} className="animate-spin" color="#fff" />
            ) : (
              <Download size={15} color="#fff" />
            )
          }
        >
          {busy ? "Generando..." : "Exportar"}
        </Button>
      </div>
    </Card>
  );
}
