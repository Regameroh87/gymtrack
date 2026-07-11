"use client";

// Pagos a coaches (admin). Port web de apps/mobile admin/billing/coaches.jsx:
// liquidación calculada por coach (fijo + % de ingresos + clases × tarifa vía RPC
// coach_payment_summary) para el mes seleccionado, con registro de pagos
// (parciales o totales) y su historial.

import { useMemo, useState } from "react";

import {
  Users,
  Receipt,
  ChevronDown,
  X,
  Trash2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useCoachPaymentSummary } from "@gymtrack/core/hooks/coaches/use-coach-payment-summary";
import { useCoachPayments } from "@gymtrack/core/hooks/coaches/use-coach-payments";
import { ui } from "@gymtrack/core/colors";
import { useCoachPaymentMutations } from "@/lib/hooks/use-coach-payment-mutations";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { PageHeader } from "@/components/ui/page-header";
import { MonthPicker, monthRange } from "@/components/ui/month-picker";
import { DeleteConfirmModal } from "@/components/platform/catalog/catalog-ui";

const money = (n: number | string | null | undefined) =>
  `$${Number(n || 0).toLocaleString("es-AR")}`;
const fullName = (p?: { name?: string | null; last_name?: string | null } | null) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Coach";

const formatPaidAt = (ts: string | null) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
};

interface PaymentRow {
  id: string;
  coach_id: string;
  total_amount: number | string;
  paid_at: string | null;
  notes: string | null;
  coach: { id: string; name: string | null; last_name: string | null } | null;
}

interface SummaryRow {
  coach_id: string;
  fixed_total: number | string;
  revenue_total: number | string;
  classes_count: number;
  classes_total: number | string;
  total: number | string;
  coach: { id: string; name: string | null; last_name: string | null } | null;
}

export default function CoachPaymentsPage() {
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();

  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { fromISO, toISO } = monthRange(cursor.year, cursor.month);

  const { data: summary, isLoading } = useCoachPaymentSummary(gymId, fromISO, toISO);
  const { data: payments } = useCoachPayments(gymId, fromISO, toISO);
  const { register, remove } = useCoachPaymentMutations();

  const [paying, setPaying] = useState<SummaryRow | null>(null);
  const [removingPayment, setRemovingPayment] = useState<PaymentRow | null>(null);

  const paidByCoach = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments ?? []) {
      map[p.coach_id] = (map[p.coach_id] ?? 0) + Number(p.total_amount || 0);
    }
    return map;
  }, [payments]);

  const totals = useMemo(() => {
    const rows = summary ?? [];
    const due = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const paid = Object.values(paidByCoach).reduce((s, v) => s + v, 0);
    return { due, paid, balance: due - paid };
  }, [summary, paidByCoach]);

  const onRemovePayment = (id: string) => {
    if (typeof window !== "undefined" && window.confirm("¿Eliminar este pago registrado?")) {
      remove.mutate(id);
    }
  };

  return (
    <>
      <PageHeader
        section="Contabilidad"
        title="Pagos a coaches"
        description="Liquidación calculada y pagos registrados por período"
        cta={<MonthPicker cursor={cursor} onChange={setCursor} />}
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Receipt} label="A pagar" value={money(totals.due)} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={Receipt} label="Pagado" value={money(totals.paid)} iconColor="#16a34a" bubble="bg-emerald-50" />
        <StatCard
          icon={Receipt}
          label="Saldo"
          value={money(totals.balance)}
          iconColor={totals.balance > 0 ? "#d97706" : "#16a34a"}
          bubble={totals.balance > 0 ? "bg-amber-50" : "bg-emerald-50"}
        />
      </div>

      {/* Cards por coach */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando liquidación...
          </p>
        </div>
      ) : (summary?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <Users size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            No hay nada para liquidar este mes
          </p>
          <p className="max-w-xs text-center font-manrope text-xs text-ui-text-muted">
            Asigná coaches con esquema de pago en las actividades.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(summary ?? []).map((row) => (
            <CoachRow
              key={row.coach_id}
              row={row}
              paid={paidByCoach[row.coach_id] ?? 0}
              brandPrimary={brandPrimary}
              onPay={() => setPaying(row)}
            />
          ))}
        </div>
      )}

      {/* Historial del mes */}
      {(payments?.length ?? 0) > 0 && (
        <div className="mt-6">
          <p className="mb-2 font-manrope text-[11px] font-semibold uppercase tracking-widest text-ui-text-muted">
            Pagos registrados
          </p>
          <div className="flex flex-col gap-2">
            {(payments ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center rounded-2xl border border-ui-input-border bg-white p-3.5 shadow-card-brand"
              >
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <Receipt size={18} color="#16a34a" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main">
                    {fullName(p.coach)}
                  </p>
                  <p className="truncate font-manrope text-[11px] text-ui-text-muted">
                    {formatPaidAt(p.paid_at)}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <p className="mr-3 font-jakarta text-[14px] font-bold text-ui-text-main">
                  {money(p.total_amount)}
                </p>
                <button
                  type="button"
                  onClick={() => onRemovePayment(p.id)}
                  className="rounded-lg bg-red-100 p-2 hover:bg-red-200/70"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {paying && (
        <PayModal
          row={paying}
          fromISO={fromISO}
          toISO={toISO}
          alreadyPaid={paidByCoach[paying.coach_id] ?? 0}
          onClose={() => setPaying(null)}
          register={register}
        />
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
  icon: LucideIcon;
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

function CoachRow({
  row,
  paid,
  brandPrimary,
  onPay,
}: {
  row: SummaryRow;
  paid: number;
  brandPrimary: Record<number, string>;
  onPay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const balance = Number(row.total || 0) - paid;

  return (
    <div className="rounded-card border border-ui-input-border bg-white p-3.5 shadow-card-brand">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center"
      >
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brandPrimary-50">
          <Users size={18} color={brandPrimary[600]} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main">
            {fullName(row.coach)}
          </p>
          <p className="truncate font-manrope text-[11px] text-ui-text-muted">
            Pagado {money(paid)} de {money(row.total)}
          </p>
        </div>
        <p
          className={`mr-2 font-jakarta text-[15px] font-bold ${
            balance > 0 ? "text-amber-600" : "text-green-600"
          }`}
        >
          {money(balance)}
        </p>
        <ChevronDown
          size={15}
          color={ui.text.muted}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-ui-input-border pt-3">
          <BreakdownLine label="Fijo mensual" value={money(row.fixed_total)} />
          <BreakdownLine label="% de ingresos" value={money(row.revenue_total)} />
          <BreakdownLine
            label={`Clases dictadas (${row.classes_count})`}
            value={money(row.classes_total)}
          />
          <button
            type="button"
            onClick={onPay}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brandPrimary-600 py-2.5 hover:opacity-90 active:scale-[0.97]"
          >
            <Receipt size={14} color="#fff" />
            <span className="font-manrope text-xs font-bold tracking-wider text-white">
              REGISTRAR PAGO
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function BreakdownLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-manrope text-xs text-ui-text-muted">{label}</span>
      <span className="font-manrope text-xs font-semibold text-ui-text-main">{value}</span>
    </div>
  );
}

// Modal para registrar un pago: monto prellenado con el saldo del período,
// notas opcionales; guarda el snapshot del desglose calculado.
function PayModal({
  row,
  fromISO,
  toISO,
  alreadyPaid,
  onClose,
  register,
}: {
  row: SummaryRow;
  fromISO: string;
  toISO: string;
  alreadyPaid: number;
  onClose: () => void;
  register: ReturnType<typeof useCoachPaymentMutations>["register"];
}) {
  const balance = Math.max(Number(row.total || 0) - alreadyPaid, 0);
  const [amount, setAmount] = useState<string>(String(balance));
  const [notes, setNotes] = useState("");

  const submit = async () => {
    const value = amount.trim() === "" ? balance : Number(amount);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Monto inválido");
      return;
    }
    try {
      await register.mutateAsync({
        coachId: row.coach_id,
        periodStart: fromISO,
        periodEnd: toISO,
        fixedAmount: row.fixed_total,
        revenueShareAmount: row.revenue_total,
        classesCount: row.classes_count,
        classesAmount: row.classes_total,
        totalAmount: value,
        notes,
      });
      toast.success("Pago registrado", {
        description: `${money(value)} a ${fullName(row.coach)}.`,
      });
      onClose();
    } catch (error) {
      toast.error("No se pudo registrar el pago", {
        description: error instanceof Error ? error.message : "Intentá de nuevo.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[420px] overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ui-input-border px-5 py-4">
          <span className="font-jakarta text-[16px] font-bold text-ui-text-main">
            Pagar a {fullName(row.coach)}
          </span>
          <button type="button" onClick={onClose}>
            <X size={18} color={ui.text.muted} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-manrope text-[11px] font-semibold uppercase tracking-widest text-ui-text-muted">
              Monto (saldo: {money(balance)})
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-manrope text-[11px] font-semibold uppercase tracking-widest text-ui-text-muted">
              Notas
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: adelanto, transferencia... (opcional)"
              className="rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={register.isPending}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-brandPrimary-600 py-3 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
          >
            <span className="font-manrope text-[13px] font-bold tracking-wider text-white">
              {register.isPending ? "GUARDANDO..." : "CONFIRMAR PAGO"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
