"use client";

// Membresías y cobranza (admin). Clon de apps/mobile admin/billing/index.web.jsx:
// lista de inscripciones activas del gym (useGymSubscriptions), stats, búsqueda +
// filtro por estado de pago, registrar pago / dar de baja, y modal de alta en 3 pasos
// (socio → actividad → pase).

// React / Next
import { useMemo, useState } from "react";

// Librerías
import {
  Receipt,
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle,
  Clock,
  Trash2,
  X,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Hooks de datos, contextos y helpers
import {
  useGymSubscriptions,
  type GymSubscription,
} from "@gymtrack/core/hooks/activities/use-gym-subscriptions";
import { useGymMembers, type GymMember } from "@gymtrack/core/hooks/users/use-gym-members";
import { useActivities, type Activity, type ActivityPlan } from "@gymtrack/core/hooks/activities/use-activities";
import { paymentBadge, isOverdue } from "@gymtrack/core";
import { ui } from "@gymtrack/core/colors";
import { useActivitySubscriptionMutations } from "@/lib/hooks/use-activity-subscription-mutations";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";

const money = (n: number | string | null | undefined) =>
  `$${Number(n || 0).toLocaleString("es-AR")}`;
const fullName = (p?: { name?: string | null; last_name?: string | null } | null) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Socio";
const freqText = (f: number | null | undefined) => (f == null ? "Libre" : `${f}x/sem`);

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

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "ok", label: "Al día" },
  { key: "overdue", label: "Vencidas" },
];

export default function BillingPage() {
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [altaOpen, setAltaOpen] = useState(false);

  const { data: subs, isLoading } = useGymSubscriptions(gymId);
  const { registerPayment, cancel } = useActivitySubscriptionMutations();

  const stats = useMemo(() => {
    const rows = subs ?? [];
    const revenue = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const overdue = rows.filter((r) => isOverdue(r.due_date)).length;
    return { revenue, total: rows.length, overdue, ok: rows.length - overdue };
  }, [subs]);

  const filtered = useMemo(() => {
    let rows = subs ?? [];
    if (filter === "overdue") rows = rows.filter((r) => isOverdue(r.due_date));
    else if (filter === "ok") rows = rows.filter((r) => !isOverdue(r.due_date));
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => fullName(r.member).toLowerCase().includes(q));
    return rows;
  }, [subs, filter, search]);

  const onRegisterPayment = (sub: GymSubscription) =>
    registerPayment.mutate({ id: sub.id, memberId: sub.user_id });

  const onCancel = (sub: GymSubscription) => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        `¿Dar de baja la membresía de ${fullName(sub.member)} en ${sub.activities?.name ?? "esta actividad"}?`
      )
    ) {
      cancel.mutate({ id: sub.id, memberId: sub.user_id });
    }
  };

  return (
    <div className="p-4 pb-14 md:p-9">
      {/* Header */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-end md:gap-0">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Administración
            </span>
            <span className="text-[11px] text-ui-text-muted">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-amber-600">
              Contabilidad
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Membresías y cobranza
          </h1>
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">
            Inscripciones activas, cuotas y estado de pago de tus socios
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAltaOpen(true)}
          className="flex items-center justify-center gap-2 self-start rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700 md:self-auto"
        >
          <Plus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Agregar membresía
          </span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Receipt} label="Ingreso mensual" value={money(stats.revenue)} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={CheckCircle} label="Al día" value={stats.ok} iconColor="#16a34a" bubble="bg-emerald-50" />
        <StatCard icon={Clock} label="Vencidas" value={stats.overdue} iconColor="#ef4444" bubble="bg-red-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar socio..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-xl border px-3.5 py-2.5 ${active ? "border-brandPrimary-600 bg-brandPrimary-600" : "border-ui-input-border bg-white hover:bg-brandPrimary-50/60"}`}
              >
                <span className={`font-manrope text-xs font-semibold ${active ? "text-white" : "text-ui-text-muted"}`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando membresías...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-amber-50">
            <Receipt size={20} color="#d97706" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {search || filter !== "all" ? "Sin resultados" : "Aún no hay membresías"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {search || filter !== "all" ? "Probá con otro filtro." : "Agregá la primera membresía de un socio."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-ui-input-border bg-white">
          {filtered.map((sub, i) => (
            <SubRow
              key={sub.id}
              sub={sub}
              last={i === filtered.length - 1}
              brandPrimary={brandPrimary}
              onRegisterPayment={() => onRegisterPayment(sub)}
              onCancel={() => onCancel(sub)}
              busy={registerPayment.isPending || cancel.isPending}
            />
          ))}
        </div>
      )}

      {/* Alta modal */}
      {altaOpen && (
        <AltaMembresiaModal onClose={() => setAltaOpen(false)} brandPrimary={brandPrimary} />
      )}
    </div>
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
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconColor: string;
  bubble: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-2xl border border-ui-input-border bg-white p-4">
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

function SubRow({
  sub,
  last,
  brandPrimary,
  onRegisterPayment,
  onCancel,
  busy,
}: {
  sub: GymSubscription;
  last: boolean;
  brandPrimary: Record<number, string>;
  onRegisterPayment: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const badge = paymentBadge(sub.due_date);
  const color = sub.activities?.color ?? brandPrimary[600];
  return (
    <div className={`flex items-center px-4 py-3.5 ${last ? "" : "border-b border-ui-input-border"}`}>
      {/* Socio */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A` }}>
          <Flame size={18} color={color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-jakarta text-[14px] font-bold capitalize text-ui-text-main">
            {fullName(sub.member)}
          </p>
          <p className="truncate font-manrope text-[11px] text-ui-text-muted">
            {sub.activities?.name ?? "Actividad"} · {sub.activity_plans?.label ?? "Pase"} ·{" "}
            {freqText(sub.activity_plans?.frequency_per_week)}
          </p>
        </div>
      </div>

      {/* Cuota */}
      <p className="w-28 text-right font-jakarta text-[14px] font-bold text-ui-text-main">
        {money(sub.price)}
        <span className="font-manrope text-[10px] text-ui-text-muted">/mes</span>
      </p>

      {/* Estado de pago */}
      <div className="flex w-32 flex-col items-center">
        <div className={`rounded-md px-2 py-0.5 ${badge.chip}`}>
          <span className={`font-manrope text-[9px] font-bold uppercase tracking-wider ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <span className="mt-0.5 font-manrope text-[10px] text-ui-text-muted">
          vence {formatDate(sub.due_date)}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex w-44 items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onRegisterPayment}
          className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 hover:bg-green-500/15 disabled:opacity-60"
        >
          <Receipt size={13} color="#16a34a" />
          <span className="font-manrope text-[11px] font-semibold text-green-600">
            Registrar pago
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg bg-red-100 p-2 hover:bg-red-200/70 disabled:opacity-60"
        >
          <Trash2 size={14} color="#ef4444" />
        </button>
      </div>
    </div>
  );
}

// Modal de alta: socio → actividad → pase.
function AltaMembresiaModal({
  onClose,
  brandPrimary,
}: {
  onClose: () => void;
  brandPrimary: Record<number, string>;
}) {
  const { gymId } = useActiveGym();
  const { authUserId } = useAuth();
  const { data: members, isLoading: membersLoading } = useGymMembers(gymId, authUserId, {
    onlyRole: "member",
  });
  const { data: activities, isLoading: activitiesLoading } = useActivities(gymId);
  const { assign } = useActivitySubscriptionMutations();

  const [memberSearch, setMemberSearch] = useState("");
  const [pickedMember, setPickedMember] = useState<GymMember | null>(null);
  const [pickedActivity, setPickedActivity] = useState<Activity | null>(null);

  const close = () => {
    setMemberSearch("");
    setPickedMember(null);
    setPickedActivity(null);
    onClose();
  };

  const assignableActivities = (activities ?? []).filter(
    (a) => a.is_active && (a.activity_plans ?? []).some((p) => p.is_active)
  );

  const filteredMembers = (members ?? []).filter((m) =>
    fullName(m).toLowerCase().includes(memberSearch.trim().toLowerCase())
  );

  const onPickPass = (pass: ActivityPlan) => {
    if (!pickedMember || !pickedActivity) return;
    assign.mutate(
      {
        memberId: pickedMember.id,
        activityId: pickedActivity.id,
        activityPlanId: pass.id,
        price: pass.price,
      },
      { onSuccess: close }
    );
  };

  const step = !pickedMember ? 1 : !pickedActivity ? 2 : 3;
  const title =
    step === 1
      ? "Elegí el socio"
      : step === 2
        ? `Actividad · ${fullName(pickedMember)}`
        : `Pase · ${pickedActivity?.name}`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="max-h-[80%] w-[460px] overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ui-input-border px-5 py-4">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => (step === 3 ? setPickedActivity(null) : setPickedMember(null))}
              >
                <ChevronLeft size={20} color={ui.text.muted} />
              </button>
            )}
            <span className="font-jakarta text-[16px] font-bold text-ui-text-main">
              {title}
            </span>
          </div>
          <button type="button" onClick={close}>
            <X size={18} color={ui.text.muted} />
          </button>
        </div>

        <div className="overflow-y-auto p-3.5" style={{ maxHeight: 420 }}>
          {/* Paso 1: socio */}
          {step === 1 &&
            (membersLoading ? (
              <Loading color={brandPrimary[600]} />
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-2.5">
                  <Search size={15} color={ui.text.muted} />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar socio..."
                    className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
                  />
                </div>
                {filteredMembers.length === 0 ? (
                  <Empty text="No hay socios para mostrar." />
                ) : (
                  filteredMembers.map((m) => (
                    <PickRow
                      key={m.id}
                      title={fullName(m)}
                      subtitle={m.email ?? undefined}
                      onClick={() => setPickedMember(m)}
                    />
                  ))
                )}
              </>
            ))}

          {/* Paso 2: actividad */}
          {step === 2 &&
            (activitiesLoading ? (
              <Loading color={brandPrimary[600]} />
            ) : assignableActivities.length === 0 ? (
              <Empty text="No hay actividades con pases activos." />
            ) : (
              assignableActivities.map((a) => (
                <PickRow
                  key={a.id}
                  color={a.color ?? brandPrimary[600]}
                  title={a.name ?? "Actividad"}
                  subtitle={`${(a.activity_plans ?? []).filter((p) => p.is_active).length} pases`}
                  onClick={() => setPickedActivity(a)}
                />
              ))
            ))}

          {/* Paso 3: pase */}
          {step === 3 &&
            (pickedActivity?.activity_plans ?? [])
              .filter((p) => p.is_active)
              .map((pass) => (
                <PickRow
                  key={pass.id}
                  color={pickedActivity?.color ?? brandPrimary[600]}
                  title={(pass.label as string) ?? "Pase"}
                  subtitle={`${freqText(pass.frequency_per_week as number | null)} · ${money(pass.price)}/mes`}
                  disabled={assign.isPending}
                  onClick={() => onPickPass(pass)}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

function PickRow({
  title,
  subtitle,
  color,
  onClick,
  disabled,
}: {
  title: string;
  subtitle?: string;
  color?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mb-2 flex w-full items-center gap-3 rounded-xl border border-ui-input-border bg-white p-3 text-left hover:border-brandPrimary-600/30 disabled:opacity-60"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: color ? `${color}1A` : "#eef" }}>
        <Flame size={16} color={color ?? "#4A44E4"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-jakarta text-[14px] font-semibold capitalize text-ui-text-main">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate font-manrope text-[11px] text-ui-text-muted">{subtitle}</p>
        ) : null}
      </div>
      <ChevronRight size={15} color={ui.text.muted} />
    </button>
  );
}

function Loading({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={20} color={color} className="animate-spin" />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <span className="font-manrope text-xs text-ui-text-muted">{text}</span>
    </div>
  );
}
