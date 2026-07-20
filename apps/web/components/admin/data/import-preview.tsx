"use client";

// Preview del import antes de aplicar: por hoja, cuántas filas se crean,
// cuántas se actualizan y qué filas tienen errores (esas se saltean).

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ImportPlan, RowError, SheetPlan } from "@/lib/data-transfer/import";

function SheetSummary({ plan }: { plan: SheetPlan<unknown> }) {
  const total = plan.creates.length + plan.updates.length + plan.errors.length;
  if (total === 0) {
    return (
      <p className="font-manrope text-[11px] text-ui-text-muted">Sin filas.</p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="green" label={`${plan.creates.length} nuevas`} />
      <Badge color="sky" label={`${plan.updates.length} a actualizar`} />
      {plan.errors.length > 0 && (
        <Badge color="red" label={`${plan.errors.length} con errores`} />
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: RowError[] }) {
  if (!errors.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
      {errors.map((e, i) => (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <AlertTriangle size={12} color="#ef4444" className="mt-0.5 shrink-0" />
          <p className="font-manrope text-[11px] text-ui-text-main">
            {e.row > 0 && (
              <span className="font-bold">Fila {e.row}: </span>
            )}
            {e.message}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ImportPreview({ plan }: { plan: ImportPlan }) {
  const sheets = [
    plan.equipment,
    plan.exercises,
    plan.sessions,
    plan.sessionExercises,
    plan.socios,
  ].filter((s) => plan.sheetsFound.includes(s.sheet));

  return (
    <div className="mt-4 flex flex-col gap-3">
      {sheets.map((sheetPlan) => (
        <div
          key={sheetPlan.sheet}
          className="rounded-xl border border-ui-input-border bg-white p-3.5"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-manrope text-[13px] font-bold text-ui-text-main">
              {sheetPlan.sheet}
            </span>
          </div>
          <SheetSummary plan={sheetPlan} />
          <ErrorList errors={sheetPlan.errors} />
        </div>
      ))}
    </div>
  );
}
