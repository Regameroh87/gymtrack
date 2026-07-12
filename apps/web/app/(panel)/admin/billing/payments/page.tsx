"use client";

// Pagos recibidos (admin): lista de cada cobro individual (subscription_payments)
// del gym en el mes seleccionado, filtrable por actividad, socio y quién lo
// registró. Complementa "Membresías" (suscripciones activas + acción de cobrar)
// con la vista granular de la plata que efectivamente entró. Usa el hook
// @gymtrack/core/hooks/activities/use-gym-payments.

// React / Next
import { useMemo, useState } from "react";

// Librerías
import { Receipt, Search, Flame, Wallet, Hash, Loader2, Calendar, User, Banknote, Landmark, CreditCard, QrCode } from "lucide-react";

// Hooks de datos, contextos y helpers
import { useGymPayments, type GymPayment } from "@gymtrack/core/hooks/activities/use-gym-payments";
import { useActivities } from "@gymtrack/core/hooks/activities/use-activities";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { PageHeader } from "@/components/ui/page-header";
import { MonthPicker, monthRange } from "@/components/ui/month-picker";
import { PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_LABELS } from "@/lib/payment-method-options";

const PAYMENT_METHOD_ICONS: Record<string, typeof Banknote> = {
  efectivo: Banknote,
  transferencia: Landmark,
  tarjeta: CreditCard,
  mercado_pago: QrCode,
};

const money = (n: number | string | null | undefined) =>
  `$${Number(n || 0).toLocaleString("es-AR")}`;

const fullName = (p?: { name?: string | null; last_name?: string | null } | null) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "—";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
};

// Mes cubierto por el cobro, tipo "ago 2026".
const monthLabel = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export default function PaymentsPage() {
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();

  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { fromISO, toISO } = monthRange(cursor.year, cursor.month);

  const [search, setSearch] = useState("");
  const [activityId, setActivityId] = useState("");
  const [registrantId, setRegistrantId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: payments, isLoading } = useGymPayments(gymId, fromISO, toISO);
  const { data: activities } = useActivities(gymId);

  // Opciones del filtro "registrado por": staff distinto presente en el mes.
  const registrants = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of payments ?? []) {
      if (p.registered_by && p.registrant) map.set(p.registered_by, fullName(p.registrant));
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [payments]);

  const filtered = useMemo(() => {
    let rows = payments ?? [];
    if (activityId) rows = rows.filter((r) => r.activity_id === activityId);
    if (registrantId) rows = rows.filter((r) => r.registered_by === registrantId);
    if (paymentMethod) rows = rows.filter((r) => r.payment_method === paymentMethod);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => fullName(r.member).toLowerCase().includes(q));
    return rows;
  }, [payments, activityId, registrantId, paymentMethod, search]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const count = filtered.length;
    return { total, count, avg: count ? Math.round(total / count) : 0 };
  }, [filtered]);

  const hasFilters = !!(search || activityId || registrantId || paymentMethod);

  return (
    <>
      <PageHeader
        section="Contabilidad"
        title="Pagos recibidos"
        description="Cada cobro registrado en el período, con socio, actividad y quién lo cobró"
        cta={<MonthPicker cursor={cursor} onChange={setCursor} />}
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Wallet} label="Recaudado" value={money(stats.total)} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={Hash} label="Pagos" value={stats.count} iconColor="#16a34a" bubble="bg-emerald-50" />
        <StatCard icon={Receipt} label="Ticket promedio" value={money(stats.avg)} iconColor="#d97706" bubble="bg-amber-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar socio..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>
        <FilterSelect value={activityId} onChange={setActivityId} allLabel="Todas las actividades">
          {(activities ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? "Actividad"}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={registrantId} onChange={setRegistrantId} allLabel="Cualquier staff">
          {registrants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={paymentMethod} onChange={setPaymentMethod} allLabel="Todos los métodos">
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">Cargando pagos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <Receipt size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {hasFilters ? "Sin resultados" : "No hay pagos en este mes"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {hasFilters ? "Probá con otro filtro o período." : "Los cobros que registres aparecerán acá."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-ui-input-border bg-white shadow-card-brand">
          {filtered.map((p, i) => (
            <PaymentRow
              key={p.id}
              payment={p}
              last={i === filtered.length - 1}
              brandPrimary={brandPrimary}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Subcomponents ──

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bubble,
}: {
  icon: typeof Wallet;
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

function FilterSelect({
  value,
  onChange,
  allLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5 font-manrope text-xs font-semibold text-ui-text-muted shadow-card-brand outline-none hover:bg-brandPrimary-50/60"
    >
      <option value="">{allLabel}</option>
      {children}
    </select>
  );
}

function PaymentRow({
  payment,
  last,
  brandPrimary,
}: {
  payment: GymPayment;
  last: boolean;
  brandPrimary: Record<number, string>;
}) {
  const color = payment.activities?.color ?? brandPrimary[600];
  return (
    <div className={`flex items-center px-4 py-3.5 ${last ? "" : "border-b border-ui-input-border"}`}>
      {/* Socio + actividad + pase */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A` }}>
          <Flame size={18} color={color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main">
            {fullName(payment.member)}
          </p>
          <p className="truncate font-manrope text-[11px] text-ui-text-muted">
            {payment.activities?.name ?? "Actividad"}
            {payment.activity_plans?.label ? ` · ${payment.activity_plans.label}` : ""}
          </p>
        </div>
      </div>

      {/* Mes que cubre */}
      <div className="hidden w-28 flex-col items-center md:flex">
        <div className="flex items-center gap-1">
          <Calendar size={12} color={ui.text.muted} />
          <span className="font-manrope text-[12px] font-semibold capitalize text-ui-text-main">
            {monthLabel(payment.period_start)}
          </span>
        </div>
        <span className="mt-0.5 font-manrope text-[10px] text-ui-text-muted">mes cubierto</span>
      </div>

      {/* Método de pago */}
      <div className="hidden w-32 flex-col items-center lg:flex">
        {payment.payment_method ? (
          <>
            <div className="flex items-center gap-1">
              {(() => {
                const Icon = PAYMENT_METHOD_ICONS[payment.payment_method] ?? Banknote;
                return <Icon size={12} color={ui.text.muted} />;
              })()}
              <span className="font-manrope text-[12px] font-semibold text-ui-text-main">
                {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
              </span>
            </div>
            <span className="mt-0.5 font-manrope text-[10px] text-ui-text-muted">método</span>
          </>
        ) : (
          <span className="font-manrope text-[12px] text-ui-text-muted">—</span>
        )}
      </div>

      {/* Fecha de cobro + quién */}
      <div className="hidden w-40 flex-col items-center px-2 md:flex">
        <span className="font-manrope text-[12px] font-semibold text-ui-text-main">
          {formatDate(payment.paid_at)}
        </span>
        {payment.registrant ? (
          <span className="mt-0.5 flex items-center gap-1 font-manrope text-[10px] text-ui-text-muted">
            <User size={10} color={ui.text.muted} />
            <span className="truncate">{fullName(payment.registrant)}</span>
          </span>
        ) : (
          <span className="mt-0.5 font-manrope text-[10px] text-ui-text-muted">registro</span>
        )}
      </div>

      {/* Monto */}
      <p className="w-28 text-right font-jakarta text-[15px] font-bold text-ui-text-main">
        {money(payment.amount)}
      </p>
    </div>
  );
}
