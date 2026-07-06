"use client";

// Planes del socio (web). Clon de apps/mobile planes/index.web.jsx: tabs Mis Planes /
// Catálogo, plan actual + historial, y catálogo filtrable por objetivo. El MemberNavbar
// lo pone el layout. La gestión de planes (asignaciones, catálogo) se resuelve contra la
// base local SQLite que no corre en web, así que acá arranca vacío — igual que Expo web.

// React / Next
import { useState } from "react";
import Link from "next/link";

// Contexto, helpers y constantes
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { mediaUrl } from "@/lib/media";
import { PLAN_GENDER_BADGES } from "@/lib/gender-options";

// Iconos
import {
  Dumbbell,
  Calendar,
  BarChart3,
  ChevronRight,
  ClipboardList,
  Clock,
  ScrollText,
  Plus,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";

// ─── Constantes ──
const BRAND_FALLBACK_GRADIENT = "linear-gradient(135deg, #0C0B14, #1e1b4b, #3023cd)";

const OBJECTIVE_CONFIG: Record<string, { Icon: LucideIcon; label: string }> = {
  hipertrofia: { Icon: Dumbbell, label: "Hipertrofia" },
  fuerza: { Icon: Dumbbell, label: "Fuerza" },
  perdida_grasa: { Icon: BarChart3, label: "Pérdida de grasa" },
  resistencia: { Icon: Clock, label: "Resistencia" },
  acondicionamiento: { Icon: ScrollText, label: "Acondicionamiento" },
  rehabilitacion: { Icon: ShieldHalf, label: "Rehabilitación" },
};
const DEFAULT_CONFIG: { Icon: LucideIcon; label: string | null } = { Icon: Dumbbell, label: null };

const MAIN_TABS = [
  { key: "mis_planes", label: "Mis Planes" },
  { key: "catalogo", label: "Catálogo" },
];

type Plan = {
  id: string;
  name: string | null;
  objective: string | null;
  level: string | null;
  target_gender: string | null;
  weekly_days: number | null;
  duration_weeks: number | null;
  cover_image_uri: string | null;
  creator?: { name: string | null; last_name: string | null; image_profile: string | null } | null;
};

export default function PlanesPage() {
  const [activeTab, setActiveTab] = useState("mis_planes");

  return (
    <div className="flex flex-col items-center px-6 py-9">
      <div className="w-full" style={{ maxWidth: 1080 }}>
        {/* Header */}
        <div className="mb-7 flex items-end justify-between">
          <div>
            <div className="mb-2.5 flex items-center gap-1.5">
              <div className="h-[3px] w-7 rounded-full bg-brandSecondary-400" />
              <div className="h-[3px] w-2.5 rounded-full" style={{ backgroundColor: "rgba(42,232,204,0.4)" }} />
            </div>
            <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-[2.4px] text-brandPrimary-600">
              Mi Entrenamiento
            </p>
            <h1 className="font-jakarta font-bold text-ui-text-main" style={{ fontSize: 38, lineHeight: "42px", letterSpacing: -1.4 }}>
              Planes
            </h1>
          </div>

          {activeTab === "mis_planes" && (
            <Link
              href="/planes/builder/custom-plan"
              className="flex items-center gap-2 rounded-2xl bg-brandPrimary-600 px-4 py-[11px] shadow-md shadow-brandPrimary-600/30 transition hover:shadow-brandPrimary-600/45"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                <Plus size={13} color="#fff" />
              </span>
              <span className="font-manrope text-[11px] font-bold uppercase tracking-[1.4px] text-white">
                Crear rutina
              </span>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-7 flex items-center border-b border-ui-input-border">
          {MAIN_TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="relative mr-7 pb-3.5"
              >
                <span className={`text-sm tracking-tight ${active ? "font-jakarta font-bold text-ui-text-main" : "font-manrope font-semibold text-ui-text-muted"}`}>
                  {tab.label}
                </span>
                {active && <span className="absolute inset-x-0 bottom-[-1px] h-[2.5px] rounded-full bg-brandPrimary-600" />}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        {activeTab === "mis_planes" ? (
          <MisPlanesContent onBrowseCatalog={() => setActiveTab("catalogo")} />
        ) : (
          <CatalogoContent />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Mis Planes ──
function MisPlanesContent({ onBrowseCatalog }: { onBrowseCatalog: () => void }) {
  const { brandPrimary } = useGymTheme();
  // La asignación de planes es offline-first (base local): en web no hay datos.
  const currentPlan: Plan | null = null;
  const history: { id: string; plan_id: string; plan_name: string | null; start_date: string; end_date: string | null; status: string }[] = [];

  return (
    <div className="flex items-start gap-5">
      {/* Plan actual */}
      <div style={{ flex: 1.6 }}>
        <p className="mb-3 font-manrope text-[10px] font-bold uppercase tracking-[1.5px] text-ui-text-muted">
          Plan actual
        </p>
        {currentPlan ? (
          <PlanCardWeb plan={currentPlan} index={0} />
        ) : (
          <EmptyCurrentPlan onBrowseCatalog={onBrowseCatalog} />
        )}
      </div>

      {/* Historial */}
      <div className="flex-1">
        <p className="mb-3 font-manrope text-[10px] font-bold uppercase tracking-[1.5px] text-ui-text-muted">
          Historial
        </p>
        {history.length === 0 ? (
          <div className="rounded-[18px] border border-ui-input-border bg-ui-surface-light p-5">
            <div className="mb-2 flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full" style={{ backgroundColor: "rgba(15,13,32,0.25)" }} />
              <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.6px] text-ui-text-muted">
                Sin registros
              </span>
            </div>
            <p className="mb-1 font-jakarta text-sm font-bold tracking-tight text-ui-text-main">
              Tu historial aparecerá acá
            </p>
            <p className="font-manrope text-xs leading-[18px] text-ui-text-muted">
              Cuando completes o abandones un plan, lo vas a ver listado.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-ui-input-border bg-ui-surface-light">
            {history.map((item, idx) => (
              <Link
                key={item.id}
                href={`/planes/plan/${item.plan_id}`}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[rgba(15,13,32,0.025)] ${idx > 0 ? "border-t border-ui-input-border" : ""}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(48,35,205,0.07)", border: "1px solid rgba(48,35,205,0.12)" }}>
                  <Calendar size={15} color={brandPrimary[600]} />
                </div>
                <div className="flex flex-1 flex-col gap-[3px]">
                  <span className="truncate font-jakarta text-[13px] font-bold tracking-tight text-ui-text-main">
                    {item.plan_name ?? "Plan eliminado"}
                  </span>
                  <span className="font-manrope text-[10px] font-semibold text-ui-text-muted">
                    {item.start_date}
                    {item.end_date ? ` → ${item.end_date}` : ""}
                    {"  ·  "}
                    {item.status === "dropped" ? "Abandonado" : "Completado"}
                  </span>
                </div>
                <ChevronRight size={14} color="rgba(15,13,32,0.3)" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Catálogo ──
function CatalogoContent() {
  const { brandPrimary } = useGymTheme();
  // El catálogo se resuelve contra la base local (offline-first): vacío en web.
  const plans: Plan[] = [];
  const [activeObjective, setActiveObjective] = useState<string | null>(null);

  const availableObjectives = Array.from(
    new Set(plans.map((p) => p.objective).filter(Boolean) as string[])
  );
  const filteredPlans = activeObjective
    ? plans.filter((p) => p.objective === activeObjective)
    : plans;

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[22px] border border-ui-input-border bg-ui-surface-light px-9 py-14">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brandPrimary-50">
          <ClipboardList size={26} color={brandPrimary[600]} />
        </div>
        <p className="mb-1.5 font-jakarta text-base font-bold tracking-tight text-ui-text-main">
          Sin planes disponibles
        </p>
        <p className="max-w-[320px] text-center font-manrope text-[13px] leading-5 text-ui-text-muted">
          El gym todavía no publicó planes de entrenamiento.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <ObjectiveChip label="Todos" active={activeObjective === null} onClick={() => setActiveObjective(null)} />
        {availableObjectives.map((obj) => {
          const cfg = OBJECTIVE_CONFIG[obj];
          if (!cfg) return null;
          return (
            <ObjectiveChip
              key={obj}
              label={cfg.label}
              Icon={cfg.Icon}
              active={activeObjective === obj}
              onClick={() => setActiveObjective(activeObjective === obj ? null : obj)}
            />
          );
        })}
      </div>

      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center rounded-[22px] border border-ui-input-border bg-ui-surface-light px-9 py-12">
          <p className="mb-1 font-jakarta text-sm font-bold tracking-tight text-ui-text-main">
            Sin planes para este objetivo
          </p>
          <p className="text-center font-manrope text-[13px] leading-5 text-ui-text-muted">
            Probá seleccionar otro objetivo o &quot;Todos&quot;.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-[18px]">
          {filteredPlans.map((plan, i) => (
            <div key={plan.id} style={{ flexBasis: "calc(50% - 9px)", minWidth: 320 }}>
              <PlanCardWeb plan={plan} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty: sin plan actual ──
function EmptyCurrentPlan({ onBrowseCatalog }: { onBrowseCatalog: () => void }) {
  const { brandPrimary } = useGymTheme();
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-ui-surface-light p-7" style={{ border: "1px solid rgba(48,35,205,0.18)" }}>
      <div className="absolute left-[22px] top-[18px] h-[3px] w-7 rounded-full bg-brandSecondary-400" />
      <div className="absolute left-[54px] top-[18px] h-[3px] w-2.5 rounded-full" style={{ backgroundColor: "rgba(42,232,204,0.35)" }} />

      <div className="mb-3.5 flex items-center gap-3.5 pt-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ backgroundColor: "rgba(48,35,205,0.1)" }}>
          <ClipboardList size={22} color={brandPrimary[600]} />
        </div>
        <div className="flex-1">
          <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-[1.6px] text-brandSecondary-700">
            Sin plan activo
          </p>
          <p className="font-jakarta text-lg font-bold tracking-tight text-ui-text-main">
            Empezá a entrenar con estructura
          </p>
        </div>
      </div>

      <p className="mb-5 font-manrope text-[13px] leading-5 text-ui-text-muted">
        Elegí un plan del catálogo publicado por el gym y empezá hoy mismo.
      </p>

      <button
        type="button"
        onClick={onBrowseCatalog}
        className="flex items-center gap-2 self-start rounded-xl bg-brandPrimary-600 px-3.5 py-2.5 shadow-md shadow-brandPrimary-600/25 transition hover:shadow-brandPrimary-600/40"
      >
        <span className="font-manrope text-[11px] font-bold uppercase tracking-[1.4px] text-white">
          Explorar catálogo
        </span>
        <ChevronRight size={14} color="#fff" />
      </button>
    </div>
  );
}

// ─── PlanCardWeb ──
function PlanCardWeb({ plan, index = 0 }: { plan: Plan; index?: number }) {
  const config = (plan.objective && OBJECTIVE_CONFIG[plan.objective]) || DEFAULT_CONFIG;
  const Icon = config.Icon;
  const imageUrl = mediaUrl(plan.cover_image_uri);
  const planNumber = String(index + 1).padStart(2, "0");
  const genderBadge = plan.target_gender ? PLAN_GENDER_BADGES[plan.target_gender] : undefined;

  return (
    <Link
      href={`/planes/plan/${plan.id}`}
      className="relative block overflow-hidden rounded-[22px] border border-ui-input-border bg-ui-surface-light"
      style={{ boxShadow: "0 8px 18px rgba(74,68,228,0.07)" }}
    >
      {/* Glow */}
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 260, height: 180, background: "linear-gradient(135deg, rgba(74,68,228,0), rgba(74,68,228,0.08))" }} />

      {/* Número editorial */}
      <span className="absolute font-jakarta font-bold" style={{ top: -14, right: -6, fontSize: 140, lineHeight: "140px", color: "rgba(15,13,32,0.04)", letterSpacing: -6 }}>
        {planNumber}
      </span>

      {/* Ticks */}
      <div className="absolute left-5 top-[18px] h-[3px] w-7 rounded-full bg-brandSecondary-400" />
      <div className="absolute left-[52px] top-[18px] h-[3px] w-2.5 rounded-full" style={{ backgroundColor: "rgba(42,232,204,0.4)" }} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-[22px] pt-8">
        <span className="font-manrope text-[10px] font-bold uppercase tracking-[2.4px] text-brandSecondary-700">
          El Programa
        </span>
        {plan.creator && <CreatorChip creator={plan.creator} />}
      </div>

      {/* Body */}
      <div className="flex gap-4 px-[22px] pb-3.5 pt-4">
        <div className="flex flex-1 flex-col gap-2">
          {(config.label || genderBadge) && (
            <div className="flex items-center gap-1.5">
              {config.label && (
                <>
                  <div className="h-1 w-1 rounded-full" style={{ backgroundColor: "rgba(15,13,32,0.4)" }} />
                  <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.6px] text-ui-text-muted">
                    {config.label}
                  </span>
                </>
              )}
              {genderBadge && (
                <div className="rounded-md border border-brandPrimary-500/25 bg-brandPrimary-500/10 px-2 py-0.5">
                  <span className="font-manrope text-[9px] font-bold uppercase tracking-wider text-brandPrimary-600">
                    {genderBadge}
                  </span>
                </div>
              )}
            </div>
          )}
          <span className="line-clamp-3 font-jakarta font-bold text-ui-text-main" style={{ fontSize: 24, lineHeight: "28px", letterSpacing: -0.7 }}>
            {plan.name}
          </span>
        </div>

        {/* Imagen */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="absolute left-[-10px] top-3 h-9 w-[3px] rounded-full bg-brandSecondary-400" />
          <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[18px] bg-brandPrimary-50" style={{ border: "1px solid rgba(15,13,32,0.08)" }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: BRAND_FALLBACK_GRADIENT }}>
                <Icon size={48} color="rgba(255,255,255,0.4)" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="h-px w-3" style={{ backgroundColor: "rgba(15,13,32,0.2)" }} />
            <span className="font-manrope text-[8px] font-bold uppercase tracking-[1.4px]" style={{ color: "rgba(15,13,32,0.4)" }}>
              Cover
            </span>
            <div className="h-px w-3" style={{ backgroundColor: "rgba(15,13,32,0.2)" }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-end gap-[22px] px-[22px] pb-4 pt-1">
        <PlanStat value={plan.weekly_days ?? 0} primaryLabel={plan.weekly_days === 1 ? "día" : "días"} secondaryLabel="por semana" />
        <div className="mb-0.5 h-7 w-px" style={{ backgroundColor: "rgba(15,13,32,0.1)" }} />
        <PlanStat value={plan.duration_weeks ?? 0} primaryLabel={plan.duration_weeks === 1 ? "semana" : "semanas"} secondaryLabel="de duración" />
      </div>

      {/* CTA */}
      <div style={{ borderTop: "1px solid rgba(15,13,32,0.06)" }}>
        <div className="flex items-center justify-between px-[22px] py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ backgroundColor: "rgba(74,68,228,0.1)", border: "1px solid rgba(74,68,228,0.35)" }}>
              <div className="h-1.5 w-1.5 rounded-full bg-brandPrimary-600" />
            </div>
            <span className="font-manrope text-[11px] font-bold uppercase tracking-[1.5px] text-ui-text-main">
              Ver Plan Completo
            </span>
          </div>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brandPrimary-600" style={{ boxShadow: "0 2px 8px rgba(48,35,205,0.45)" }}>
            <ChevronRight size={14} color="#fff" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Helpers UI ──
function ObjectiveChip({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-2"
      style={{
        backgroundColor: active ? "#3023cd" : "rgba(15,13,32,0.04)",
        border: `1px solid ${active ? "transparent" : "rgba(15,13,32,0.1)"}`,
        boxShadow: active ? "0 2px 8px rgba(48,35,205,0.3)" : "none",
      }}
    >
      {Icon && <Icon size={13} color={active ? "#fff" : "rgba(15,13,32,0.45)"} />}
      <span className="font-manrope text-[11px] font-bold uppercase tracking-[1.3px]" style={{ color: active ? "#fff" : "rgba(15,13,32,0.55)" }}>
        {label}
      </span>
    </button>
  );
}

function PlanStat({
  value,
  primaryLabel,
  secondaryLabel,
}: {
  value: number;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <span className="font-jakarta font-bold text-ui-text-main" style={{ fontSize: 30, lineHeight: "30px", letterSpacing: -1.2 }}>
        {value}
      </span>
      <div className="flex flex-col gap-[1px] pb-[3px]">
        <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.6px] text-brandSecondary-700">
          {primaryLabel}
        </span>
        <span className="font-manrope text-[9px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
          {secondaryLabel}
        </span>
      </div>
    </div>
  );
}

function CreatorChip({
  creator,
}: {
  creator: { name: string | null; last_name: string | null; image_profile: string | null };
}) {
  const fullName = [creator.name, creator.last_name].filter(Boolean).join(" ");
  const displayName = fullName.trim() || "—";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = mediaUrl(creator.image_profile);

  return (
    <div className="flex max-w-[180px] items-center gap-2 rounded-full py-1 pl-1 pr-2.5" style={{ backgroundColor: "rgba(15,13,32,0.04)", border: "1px solid rgba(15,13,32,0.06)" }}>
      <div className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: "rgba(48,35,205,0.18)" }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="font-jakarta text-[10px] font-bold text-brandPrimary-700">{initial}</span>
        )}
      </div>
      <span className="flex-shrink truncate font-manrope text-[9px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
        Por {displayName}
      </span>
    </div>
  );
}
