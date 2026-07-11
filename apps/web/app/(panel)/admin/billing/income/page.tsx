"use client";

// Ingresos por actividad (admin): cobros reales registrados (subscription_payments)
// agrupados por actividad en el mes seleccionado. Usa el RPC activity_income_summary
// vía @gymtrack/core/hooks/activities/use-activity-income-summary.

import { useMemo, useState } from "react";

import { TrendingUp, Receipt, Users, Flame, Loader2 } from "lucide-react";

import { useActivityIncomeSummary } from "@gymtrack/core/hooks/activities/use-activity-income-summary";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { PageHeader } from "@/components/ui/page-header";
import { MonthPicker, monthRange } from "@/components/ui/month-picker";

const money = (n: number | string | null | undefined) =>
  `$${Number(n || 0).toLocaleString("es-AR")}`;

export default function ActivityIncomePage() {
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();

  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { fromISO, toISO } = monthRange(cursor.year, cursor.month);

  const { data: rows, isLoading } = useActivityIncomeSummary(gymId, fromISO, toISO);

  const totals = useMemo(() => {
    const list = rows ?? [];
    return {
      collected: list.reduce((s, r) => s + Number(r.total || 0), 0),
      payments: list.reduce((s, r) => s + Number(r.payments_count || 0), 0),
      students: list.reduce((s, r) => s + Number(r.active_students || 0), 0),
    };
  }, [rows]);

  const maxTotal = useMemo(
    () => Math.max(...(rows ?? []).map((r) => Number(r.total || 0)), 1),
    [rows]
  );

  return (
    <>
      <PageHeader
        section="Contabilidad"
        title="Ingresos por actividad"
        description="Cobros reales registrados por período"
        cta={<MonthPicker cursor={cursor} onChange={setCursor} />}
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard
          icon={TrendingUp}
          label="Recaudado"
          value={money(totals.collected)}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={Receipt}
          label="Pagos registrados"
          value={totals.payments}
          iconColor="#16a34a"
          bubble="bg-emerald-50"
        />
        <StatCard
          icon={Users}
          label="Socios activos"
          value={totals.students}
          iconColor="#2563eb"
          bubble="bg-blue-50"
        />
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando ingresos...
          </p>
        </div>
      ) : (rows?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <TrendingUp size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            Sin cobros en este período
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            Registrá pagos desde la pestaña Membresías.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ui-input-border bg-white shadow-card-brand">
          {(rows ?? []).map((row, i) => (
            <IncomeRow
              key={row.activity_id}
              row={row}
              last={i === (rows?.length ?? 0) - 1}
              brandPrimary={brandPrimary}
              maxTotal={maxTotal}
            />
          ))}
        </div>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bubble,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number | string;
  iconColor: string;
  bubble: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-card border border-ui-input-border bg-white p-4 shadow-card-brand">
      <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl ${bubble}`}>
        <Icon size={18} color={iconColor} />
      </div>
      <div className="flex-1">
        <p className="truncate font-jakarta text-[22px] font-bold tracking-tight text-ui-text-main">
          {value}
        </p>
        <p className="font-manrope text-[11px] text-ui-text-muted">{label}</p>
      </div>
    </div>
  );
}

function IncomeRow({
  row,
  last,
  brandPrimary,
  maxTotal,
}: {
  row: {
    activity_id: string;
    activity_name: string | null;
    activity_color: string | null;
    payments_count: number;
    total: number | string;
    active_students: number;
  };
  last: boolean;
  brandPrimary: Record<number, string>;
  maxTotal: number;
}) {
  const color = row.activity_color ?? brandPrimary[600];
  const total = Number(row.total || 0);
  const pct = Math.max((total / maxTotal) * 100, 2);

  return (
    <div className={`px-4 py-3.5 ${last ? "" : "border-b border-ui-input-border"}`}>
      <div className="flex items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1A` }}
          >
            <Flame size={18} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main">
              {row.activity_name ?? "Actividad"}
            </p>
            <p className="truncate font-manrope text-[11px] text-ui-text-muted">
              {row.active_students} socios · {row.payments_count} pagos
            </p>
          </div>
        </div>
        <p className="font-jakarta text-[15px] font-bold text-ui-text-main">
          {money(total)}
        </p>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ui-background-light">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
