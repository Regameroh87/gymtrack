"use client";

// Pagos recibidos (admin): lista de cada cobro individual (subscription_payments)
// del gym en el mes seleccionado, filtrable por actividad, socio y quién lo
// registró. Complementa "Membresías" (suscripciones activas + acción de cobrar)
// con la vista granular de la plata que efectivamente entró. Usa el hook
// @gymtrack/core/hooks/activities/use-gym-payments.

// React / Next
import { useEffect, useMemo, useState } from "react";

// Librerías
import { Receipt, Search, Flame, Wallet, Hash, Loader2, Calendar, User, Banknote, Landmark, CreditCard, QrCode, Ban, AlertTriangle } from "lucide-react";

// Hooks de datos, contextos y helpers
import { useGymPayments, type GymPayment } from "@gymtrack/core/hooks/activities/use-gym-payments";
import { useActivities } from "@gymtrack/core/hooks/activities/use-activities";
import { useMembershipPermissions } from "@gymtrack/core/hooks/users/use-membership-permissions";
import { PERMISSIONS, hasGymPermission } from "@gymtrack/core/permissions";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { useActivitySubscriptionMutations } from "@/lib/hooks/use-activity-subscription-mutations";
import { PageHeader } from "@/components/ui/page-header";
import { MonthPicker, monthRange } from "@/components/ui/month-picker";
import { PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_LABELS } from "@/lib/payment-method-options";
import { ModalShell, Field, Textarea, ErrorBanner } from "@/components/platform/catalog/catalog-ui";

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
  const { gymId, memberships } = useActiveGym();
  const { role } = useUserRole();
  const { userId: myProfileId } = useAuth();
  const { voidPayment } = useActivitySubscriptionMutations();

  // Permisos propios: para saber si puedo anular pagos ajenos (payments.void),
  // más allá de la ventana de gracia sobre mis propios cobros (que valida el RPC).
  const ownMembershipId = memberships.find((m) => m.gym_id === gymId)?.id ?? null;
  const { data: ownGrants } = useMembershipPermissions(ownMembershipId);
  const canVoidAny = hasGymPermission(role, ownGrants ?? [], PERMISSIONS.PAYMENTS_VOID);

  const [voidingPayment, setVoidingPayment] = useState<GymPayment | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);

  const confirmVoid = (reason: string) => {
    if (!voidingPayment) return;
    setVoidError(null);
    voidPayment.mutate(
      { paymentId: voidingPayment.id, reason, memberId: voidingPayment.user_id },
      {
        onSuccess: () => setVoidingPayment(null),
        onError: (err) => setVoidError((err as Error)?.message || "No se pudo anular el pago."),
      }
    );
  };

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

  // Los pagos anulados quedan visibles en la lista (auditoría) pero no suman.
  const stats = useMemo(() => {
    const active = filtered.filter((r) => !r.voided_at);
    const total = active.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const count = active.length;
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
              canVoid={!p.voided_at && (canVoidAny || p.registered_by === myProfileId)}
              onVoid={() => setVoidingPayment(p)}
            />
          ))}
        </div>
      )}

      <VoidPaymentModal
        payment={voidingPayment}
        isPending={voidPayment.isPending}
        error={voidError}
        onCancel={() => {
          setVoidingPayment(null);
          setVoidError(null);
        }}
        onConfirm={confirmVoid}
      />
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
  canVoid,
  onVoid,
}: {
  payment: GymPayment;
  last: boolean;
  brandPrimary: Record<number, string>;
  canVoid: boolean;
  onVoid: () => void;
}) {
  const color = payment.activities?.color ?? brandPrimary[600];
  const voided = !!payment.voided_at;
  return (
    <div
      className={`flex items-center px-4 py-3.5 ${last ? "" : "border-b border-ui-input-border"} ${voided ? "opacity-60" : ""}`}
    >
      {/* Socio + actividad + pase */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A` }}>
          <Flame size={18} color={color} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main ${voided ? "line-through" : ""}`}
          >
            {fullName(payment.member)}
          </p>
          <p className="truncate font-manrope text-[11px] text-ui-text-muted">
            {payment.activities?.name ?? "Actividad"}
            {payment.activity_plans?.label ? ` · ${payment.activity_plans.label}` : ""}
          </p>
          {voided && (
            <p
              className="mt-0.5 truncate font-manrope text-[10px] font-semibold text-red-500"
              title={payment.void_reason ?? undefined}
            >
              Anulado{payment.voider ? ` · ${fullName(payment.voider)}` : ""}
              {payment.void_reason ? ` · ${payment.void_reason}` : ""}
            </p>
          )}
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
      <p className={`w-28 text-right font-jakarta text-[15px] font-bold text-ui-text-main ${voided ? "line-through" : ""}`}>
        {money(payment.amount)}
      </p>

      {/* Anular */}
      <div className="flex w-9 justify-end">
        {canVoid && (
          <button
            type="button"
            onClick={onVoid}
            title="Anular pago"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ui-text-muted transition hover:bg-red-50 hover:text-red-600"
          >
            <Ban size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Anular pago: insert-only, se pide motivo obligatorio ──
function VoidPaymentModal({
  payment,
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  payment: GymPayment | null;
  isPending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [payment?.id]);

  if (!payment) return null;

  const submit = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <ModalShell
      maxWidth={420}
      onClose={() => {
        setReason("");
        onCancel();
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <AlertTriangle size={18} color="#d97706" />
        </div>
        <span className="font-jakarta text-[16px] font-bold tracking-tight text-ui-text-main">
          Anular pago
        </span>
      </div>
      <p className="mb-4 font-manrope text-[12px] leading-5 text-ui-text-muted">
        {money(payment.amount)} de {fullName(payment.member)}, cobrado el {formatDate(payment.paid_at)}.
        El pago queda anulado (no se borra) y el mes vuelve a quedar pendiente.
      </p>
      <Field label="Motivo" hint="Obligatorio: por qué se anula este pago.">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej: error de tipeo en el monto"
        />
      </Field>
      <ErrorBanner message={error} />
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => {
            setReason("");
            onCancel();
          }}
          className="flex-1 rounded-[11px] border border-ui-input-border bg-white py-2.5 text-center font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !reason.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-amber-600 py-2.5 font-manrope text-[13px] font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={14} color="#fff" className="animate-spin" />
          ) : (
            <AlertTriangle size={14} color="#fff" />
          )}
          Anular
        </button>
      </div>
    </ModalShell>
  );
}
