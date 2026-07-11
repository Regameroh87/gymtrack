"use client";

// Selector de mes (‹ Julio de 2026 ›), compartido por las pestañas de Ingresos
// por actividad y Pagos a coaches. Puerto del selector de apps/mobile
// admin/billing/coaches.jsx.

import { ChevronLeft, ChevronRight } from "lucide-react";

import { ui } from "@gymtrack/core/colors";

const toISO = (d: Date) => d.toISOString().split("T")[0];

export const monthRange = (year: number, month: number) => ({
  fromISO: toISO(new Date(Date.UTC(year, month, 1))),
  toISO: toISO(new Date(Date.UTC(year, month + 1, 0))),
});

export const monthTitle = (year: number, month: number) => {
  const label = new Date(year, month, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

interface MonthCursor {
  year: number;
  month: number;
}

interface MonthPickerProps {
  cursor: MonthCursor;
  onChange: (cursor: MonthCursor) => void;
}

export function MonthPicker({ cursor, onChange }: MonthPickerProps) {
  const moveMonth = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    onChange({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => moveMonth(-1)}
        className="rounded-xl border border-ui-input-border bg-white p-2.5 shadow-card-brand hover:bg-brandPrimary-50/60"
      >
        <ChevronLeft size={16} color={ui.text.muted} />
      </button>
      <span className="min-w-[130px] text-center font-manrope text-[13px] font-semibold text-ui-text-main">
        {monthTitle(cursor.year, cursor.month)}
      </span>
      <button
        type="button"
        onClick={() => moveMonth(1)}
        className="rounded-xl border border-ui-input-border bg-white p-2.5 shadow-card-brand hover:bg-brandPrimary-50/60"
      >
        <ChevronRight size={16} color={ui.text.muted} />
      </button>
    </div>
  );
}
