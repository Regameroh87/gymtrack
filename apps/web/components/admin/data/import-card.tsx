"use client";

// Card de import de la sección Datos. Flujo: elegir archivo → parseo +
// validación (buildImportPlan) → preview con conteos y errores → confirmar →
// aplicar (applyImportPlan) → reporte final. Las filas con error se saltean;
// el import nunca borra datos.

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  applyImportPlan,
  buildImportPlan,
  type ImportPlan,
  type ImportResult,
} from "@/lib/data-transfer/import";
import { ImportPreview } from "./import-preview";

type Phase =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "preview"; plan: ImportPlan; filename: string }
  | { step: "applying"; plan: ImportPlan }
  | { step: "done"; result: ImportResult };

// Caches del panel que pueden quedar viejos después de un import.
const STALE_QUERY_KEYS = [
  "admin_users",
  "admin_equipments_web",
  "admin_equipment_picker",
  "admin_exercises_web",
  "admin_sessions_web",
  "admin_session_ex_picker",
  "admin_plan_sessions_list",
];

export function ImportCard({ gymId }: { gymId: string | null }) {
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const onFile = async (file: File | null) => {
    if (!file || !gymId) return;
    setPhase({ step: "parsing" });
    try {
      const plan = await buildImportPlan(gymId, file);
      if (!plan.sheetsFound.length) {
        toast.error(
          "El archivo no tiene ninguna hoja importable (Socios, Equipamiento, Ejercicios o Sesiones)."
        );
        setPhase({ step: "idle" });
        return;
      }
      setPhase({ step: "preview", plan, filename: file.name });
    } catch (err) {
      toast.error((err as Error)?.message || "No se pudo leer el archivo.");
      setPhase({ step: "idle" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onApply = async (plan: ImportPlan) => {
    setPhase({ step: "applying", plan });
    try {
      const result = await applyImportPlan(plan);
      for (const key of STALE_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      const failed = result.reduce((n, r) => n + r.errors.length, 0);
      if (failed) toast.warning("Import aplicado con algunos errores.");
      else toast.success("Import aplicado.");
      setPhase({ step: "done", result });
    } catch (err) {
      toast.error((err as Error)?.message || "Error al aplicar el import.");
      setPhase({ step: "preview", plan, filename: "" });
    }
  };

  const validRows = (plan: ImportPlan) =>
    [plan.socios, plan.equipment, plan.exercises, plan.sessions]
      .filter((s) => plan.sheetsFound.includes(s.sheet))
      .reduce((n, s) => n + s.creates.length + s.updates.length, 0);

  return (
    <Card className="max-w-2xl">
      <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">
        Importar desde Excel
      </h2>
      <p className="mt-1 font-manrope text-xs text-ui-text-muted">
        Usá un archivo exportado desde acá como plantilla. Filas con ID vacío se
        crean, filas con ID existente se actualizan; nunca se borra nada. Las
        hojas importables son Socios, Equipamiento, Ejercicios y Sesiones.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {(phase.step === "idle" || phase.step === "parsing") && (
        <div className="mt-5">
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={phase.step === "parsing" || !gymId}
            icon={
              phase.step === "parsing" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileUp size={15} />
              )
            }
          >
            {phase.step === "parsing" ? "Analizando..." : "Elegir archivo .xlsx"}
          </Button>
        </div>
      )}

      {phase.step === "preview" && (
        <>
          {phase.filename && (
            <p className="mt-4 font-manrope text-[11px] text-ui-text-muted">
              Archivo: <span className="font-bold">{phase.filename}</span>
            </p>
          )}
          <ImportPreview plan={phase.plan} />
          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={() => onApply(phase.plan)}
              disabled={validRows(phase.plan) === 0}
              icon={<Upload size={15} color="#fff" />}
            >
              Aplicar (solo filas válidas)
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ step: "idle" })}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {phase.step === "applying" && (
        <div className="mt-5 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-brandPrimary-600" />
          <span className="font-manrope text-xs text-ui-text-muted">
            Aplicando cambios...
          </span>
        </div>
      )}

      {phase.step === "done" && (
        <>
          <div className="mt-4 flex flex-col gap-3">
            {phase.result.map((r) => (
              <div
                key={r.sheet}
                className="rounded-xl border border-ui-input-border bg-white p-3.5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span className="font-manrope text-[13px] font-bold text-ui-text-main">
                    {r.sheet}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color="green" label={`${r.created} creadas`} />
                  <Badge color="sky" label={`${r.updated} actualizadas`} />
                  {r.errors.length > 0 && (
                    <Badge color="red" label={`${r.errors.length} fallidas`} />
                  )}
                </div>
                {r.errors.length > 0 && (
                  <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    {r.errors.map((e, i) => (
                      <p key={i} className="py-0.5 font-manrope text-[11px] text-ui-text-main">
                        {e.row > 0 && <span className="font-bold">Fila {e.row}: </span>}
                        {e.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setPhase({ step: "idle" })}>
              Importar otro archivo
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
