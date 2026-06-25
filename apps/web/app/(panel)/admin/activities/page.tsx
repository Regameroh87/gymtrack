"use client";

// Actividades del gimnasio (admin). Clon de apps/mobile admin/activities/index.web.jsx:
// lee actividades + pases embebidos (hook de core useActivities), stats, búsqueda,
// grid de cards con precio "desde $X" y estado.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import {
  Flame,
  Search,
  ChevronRight,
  Plus,
  Receipt,
  CheckCircle,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Hook de datos (core), contextos y helpers
import {
  useActivities,
  type Activity,
  type ActivityPlan,
} from "@gymtrack/core/hooks/activities/use-activities";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";

const PAGE_SIZE = 18;

// Precio mínimo entre los pases activos con precio (para "desde $X").
const minActivePrice = (plans: ActivityPlan[] = []) => {
  const prices = plans
    .filter((p) => p.is_active && p.price != null)
    .map((p) => Number(p.price));
  return prices.length ? Math.min(...prices) : null;
};

export default function ActivitiesListPage() {
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: activities, isLoading } = useActivities(gymId);

  const stats = useMemo(() => {
    if (!activities) return { total: 0, active: 0, activePlans: 0 };
    const active = activities.filter((a) => a.is_active);
    const activePlans = activities.reduce(
      (sum, a) => sum + (a.activity_plans ?? []).filter((p) => p.is_active).length,
      0
    );
    return { total: activities.length, active: active.length, activePlans };
  }, [activities]);

  const filtered = useMemo(() => {
    if (!activities) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name?.toLowerCase().includes(q));
  }, [activities, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <div className="p-4 pb-14 md:p-9">
      {/* Header */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-end md:gap-0">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Oferta
            </span>
            <span className="text-[11px] text-ui-text-muted">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-teal-500">
              Actividades
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Actividades del gimnasio
          </h1>
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">
            Disciplinas y cuotas mensuales que ofrecés a tus socios
          </p>
        </div>

        <Link
          href="/admin/activities/add"
          className="flex items-center justify-center gap-2 self-start rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700 md:self-auto"
        >
          <Plus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Agregar actividad
          </span>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Flame} label="Total" value={stats.total} iconColor="#14b8a6" bubble="bg-teal-500/10" />
        <StatCard icon={CheckCircle} label="Activas" value={stats.active} iconColor="#10b981" bubble="bg-emerald-50" />
        <StatCard icon={Receipt} label="Pases activos" value={stats.activePlans} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nombre..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando actividades...
          </p>
        </div>
      ) : pageRows.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-teal-500/10">
            <Flame size={20} color="#14b8a6" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {search ? "Sin resultados" : "Aún no hay actividades"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {search ? "Probá con otro nombre." : "Agregá la primera disciplina de tu gimnasio."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} brandPrimary={brandPrimary} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
          <p className="font-manrope text-xs text-ui-text-muted">
            Mostrando{" "}
            <span className="font-bold text-ui-text-main">
              {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}
            </span>{" "}
            de {filtered.length}
          </p>

          <div className="flex gap-2">
            <PageBtn label="Anterior" disabled={currentPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} />
            <PageBtn label="Siguiente" disabled={currentPage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} />
          </div>
        </div>
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
  value: number;
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

function ActivityCard({
  activity,
  brandPrimary,
}: {
  activity: Activity;
  brandPrimary: Record<number, string>;
}) {
  const color = activity.color ?? brandPrimary[600];
  const plans = activity.activity_plans ?? [];
  const min = minActivePrice(plans);

  return (
    <Link
      href={`/admin/activities/edit/${activity.id}`}
      className="overflow-hidden rounded-[16px] border border-ui-input-border bg-white transition hover:border-brandPrimary-600/30 active:scale-[0.99]"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${color}1A` }}>
              <Flame size={17} color={color} />
            </div>
            <span className="flex-1 truncate font-jakarta text-[14px] font-bold tracking-tight text-ui-text-main">
              {activity.name}
            </span>
          </div>
          <ChevronRight size={14} color={ui.text.muted} />
        </div>

        {activity.description ? (
          <p className="mb-2 line-clamp-2 font-manrope text-[11px] leading-4 text-ui-text-muted">
            {activity.description}
          </p>
        ) : null}

        {activity.coach && (
          <p className="mb-3 truncate font-manrope text-[11px] font-semibold text-ui-text-muted">
            Coach: {[activity.coach.name, activity.coach.last_name].filter(Boolean).join(" ")}
          </p>
        )}

        <div className="flex items-center justify-between">
          {!plans.length ? (
            <span className="font-manrope text-[12px] font-semibold text-ui-text-muted">
              Sin pases
            </span>
          ) : (
            <div>
              <span className="font-jakarta text-[15px] font-bold text-ui-text-main">
                {min != null ? `desde $${min.toLocaleString("es-AR")}` : "—"}
                {min != null && (
                  <span className="font-manrope text-[11px] text-ui-text-muted"> /mes</span>
                )}
              </span>
              <p className="mt-0.5 font-manrope text-[10px] text-ui-text-muted">
                {plans.length} {plans.length === 1 ? "pase" : "pases"}
              </p>
            </div>
          )}

          <div className={`rounded-md px-2 py-0.5 ${activity.is_active ? "bg-emerald-50" : "bg-ui-background-light"}`}>
            <span className={`font-manrope text-[9px] font-bold uppercase tracking-wider ${activity.is_active ? "text-emerald-600" : "text-ui-text-muted"}`}>
              {activity.is_active ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PageBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[9px] border border-ui-input-border px-3.5 py-2 ${disabled ? "bg-ui-background-light opacity-50" : "bg-white hover:bg-brandPrimary-50/60"}`}
    >
      <span className={`font-manrope text-xs font-semibold ${disabled ? "text-ui-text-muted" : "text-ui-text-main"}`}>
        {label}
      </span>
    </button>
  );
}
