"use client";

// Home del socio (web). Clon de apps/mobile (home)/index.web.jsx: banner de
// bienvenida, stats del mes, últimas sesiones e accesos rápidos. El MemberNavbar lo
// pone el layout. Los registros de entrenamiento viven en la app móvil (la base
// local SQLite no corre en web), así que acá la lista arranca vacía.

// React / Next
import { useEffect, useState } from "react";
import Link from "next/link";

// Contextos, hooks y helpers
import { useAuth } from "@/components/auth/auth-provider";
import { formatDuration } from "@gymtrack/core/format-date";
import { brandSecondary } from "@gymtrack/core/colors";

// Iconos
import {
  Dumbbell,
  ChevronRight,
  ClipboardList,
  Clock,
  ScrollText,
  Plus,
  type LucideIcon,
} from "lucide-react";

const MINT = brandSecondary[400];
const MINT_DARK = brandSecondary[700];

const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAYS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function formatDateLine(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_ES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}
function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomePage() {
  const { user } = useAuth();

  const logs: never[] = [];
  const logsLoading = false;

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);

  const dateLine = now ? formatDateLine(now) : "";
  const dayName = now ? DAYS_ES[now.getDay()] : "";
  const greeting = now ? greetingFor(now) : "¡Bienvenido";
  const firstName = ((user?.name as string) ?? "").split(" ")[0] || "Atleta";

  const sessionsThisMonth = 0;
  const timeThisMonth = 0;
  const lastSessionLabel: string | null = null;
  const recentLogs = logs;

  const STATS: { label: string; value: string; Icon: LucideIcon; dot: string; bubble: string; dotColor: string }[] = [
    { label: "Sesiones este mes", value: logsLoading ? "—" : String(sessionsThisMonth), Icon: ClipboardList, dot: "bg-brandPrimary-600", bubble: "bg-brandPrimary-50", dotColor: "bg-brandPrimary-600" },
    { label: "Tiempo total este mes", value: logsLoading ? "—" : formatDuration(timeThisMonth), Icon: Clock, dot: "bg-violet-600", bubble: "bg-violet-50", dotColor: "bg-violet-600" },
    { label: "Última sesión", value: logsLoading ? "—" : (lastSessionLabel ?? "—"), Icon: ScrollText, dot: "bg-brandSecondary-700", bubble: "bg-brandSecondary-50", dotColor: "bg-brandSecondary-700" },
  ];

  return (
    <div className="bg-ui-background-light">
      <div className="mx-auto flex max-w-[1080px] flex-col px-4 py-9 md:px-6">
        {/* ── BANNER DE BIENVENIDA ── */}
        <div className="relative mb-6 overflow-hidden rounded-card-lg bg-gradient-to-br from-[#2518b8] via-brandPrimary-700 to-brandPrimary-500 p-8">
          <div className="absolute -right-8 -top-8 h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-50px] right-[120px] h-[150px] w-[150px] rounded-full bg-white/[0.04]" />
          <div className="absolute right-3 top-3 h-20 w-20 rounded-full bg-white/[0.04]" />

          <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-0">
            <div className="flex-1">
              {/* Ticks decorativos */}
              <div className="mb-3.5 flex items-center gap-1.5">
                <div className="h-[3px] w-7 rounded-sm bg-brandSecondary-400" />
                <div className="h-[3px] w-2.5 rounded-sm bg-brandSecondary-400/40" />
              </div>

              {/* Kicker */}
              <div className="mb-1.5 flex items-center gap-2">
                <div
                  className="h-[5px] w-[5px] rounded-sm bg-brandSecondary-400"
                  style={{ boxShadow: `0 0 5px ${MINT}` }}
                />
                <span className="font-manrope text-[10px] font-semibold uppercase tracking-[1.8px] text-white/55">
                  {greeting}
                </span>
              </div>

              <p className="mb-1.5 font-jakarta text-[36px] font-bold leading-[42px] tracking-tight text-white">
                {firstName}.
              </p>

              <p className="font-manrope text-[13px] text-white/50">
                {dateLine} · {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
              </p>
            </div>

            {/* Icono decorativo */}
            <div className="flex h-[88px] w-[88px] flex-col items-center justify-center self-start rounded-card-sm border border-white/12 bg-white/10 md:self-auto">
              <Dumbbell size={38} color="rgba(255,255,255,0.85)" />
              <span className="mt-1.5 font-manrope text-[8px] font-semibold uppercase tracking-[1.5px] text-white/45">
                Atleta
              </span>
            </div>
          </div>
        </div>

        {/* ── FILA DE STATS ── */}
        <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
          {STATS.map((stat) => {
            const Icon = stat.Icon;
            return (
              <div
                key={stat.label}
                className="flex-1 rounded-card border border-ui-input-border bg-white p-5 shadow-card-brand"
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-icon ${stat.bubble}`}>
                    <Icon size={16} color="currentColor" className={stat.dot.replace("bg-", "text-")} />
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full opacity-35 ${stat.dotColor}`} />
                </div>
                <p className="font-jakarta text-[28px] font-bold tracking-tight text-ui-text-main">
                  {stat.value}
                </p>
                <p className="mt-1 font-manrope text-[11px] text-ui-text-muted">
                  {stat.label}
                </p>
                <div className={`mt-3.5 h-0.5 w-[35%] rounded-sm opacity-25 ${stat.dotColor}`} />
              </div>
            );
          })}
        </div>

        {/* ── LAYOUT 2 COLUMNAS ── */}
        <div className="flex flex-col items-start gap-5 md:flex-row">
          {/* Hero — Últimas sesiones */}
          <div className="w-full md:flex-[1.6]">
            <span className="mb-3 block font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
              Últimas sesiones
            </span>

            <div className="relative overflow-hidden rounded-card border border-ui-input-border bg-white shadow-card-brand">
              {/* Ticks firma editorial */}
              <div className="absolute left-[22px] top-[18px] h-[3px] w-7 rounded-sm bg-brandSecondary-400" />
              <div className="absolute left-[54px] top-[18px] h-[3px] w-2.5 rounded-sm bg-brandSecondary-400/35" />

              {/* Header */}
              <div className="flex items-center justify-between px-[22px] pb-[18px] pt-8">
                <span className="font-manrope text-[10px] font-bold uppercase tracking-[2.4px]" style={{ color: MINT_DARK }}>
                  Entrenamientos recientes
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-brandSecondary-400"
                    style={{ boxShadow: `0 0 6px ${MINT}` }}
                  />
                  <span className="font-jakarta text-[10px] font-bold uppercase tracking-[2px] text-ui-text-muted">
                    Historial
                  </span>
                </div>
              </div>

              {/* Body */}
              {logsLoading ? (
                <div className="flex justify-center px-[22px] py-15">
                  <span className="font-manrope text-xs text-ui-text-muted">
                    Cargando registros...
                  </span>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="flex flex-col items-start gap-3.5 px-[22px] pb-8">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-sm bg-ui-text-main/25" />
                    <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.6px] text-ui-text-muted">
                      Sin registros aún
                    </span>
                  </div>
                  <p className="font-jakarta text-[28px] font-bold leading-[33px] tracking-tight text-ui-text-main">
                    Todavía no<br />registraste entrenamientos.
                  </p>
                  <p className="font-manrope text-[13px] leading-5 text-ui-text-muted" style={{ maxWidth: 380 }}>
                    Cuando termines una sesión en el móvil, vas a ver acá tu progreso reciente.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Acceso rápido */}
          <div className="w-full md:flex-1">
            <span className="mb-3 block font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
              Acceso Rápido
            </span>

            <div className="flex flex-col gap-2.5">
              <QuickCard
                kicker="Catálogo"
                title="Explorar rutinas"
                description="Planes y sesiones publicados por el gym."
                iconNode={<ClipboardList size={18} color="#fff" />}
                variant="primary"
                href="/planes"
              />
              <QuickCard
                kicker="Personalizado"
                title="Crear mi rutina"
                description="Armá tu propia rutina eligiendo ejercicios."
                iconNode={<Plus size={18} color={MINT_DARK} />}
                variant="ghost"
                href="/planes/builder"
              />
            </div>

            {/* Tip card */}
            <div className="mt-3.5 rounded-2xl border border-brandPrimary-600/12 bg-brandPrimary-600/5 p-4">
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="h-[5px] w-[5px] rounded-sm bg-brandSecondary-400" />
                <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.6px]" style={{ color: MINT_DARK }}>
                  Tip del día
                </span>
              </div>
              <p className="mb-1 font-jakarta text-[13px] font-bold tracking-tight text-ui-text-main">
                Consistencia ante todo.
              </p>
              <p className="font-manrope text-[12px] leading-[18px] text-ui-text-muted">
                El entrenamiento más efectivo es el que hacés seguido, no el que hacés perfecto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QuickCard ──
function QuickCard({
  kicker,
  title,
  description,
  iconNode,
  variant,
  href,
}: {
  kicker: string;
  title: string;
  description: string;
  iconNode: React.ReactNode;
  variant: "primary" | "ghost";
  href: string;
}) {
  const isPrimary = variant === "primary";
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-2xl border p-3.5 transition hover:opacity-95",
        isPrimary
          ? "border-brandPrimary-600/22 bg-brandPrimary-600/7 shadow-card-brand"
          : "border-ui-input-border bg-white shadow-card-brand",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-icon border",
          isPrimary
            ? "btn-gradient border-white/30 shadow-btn-brand"
            : "border-brandSecondary-700/28 bg-brandSecondary-700/9",
        ].join(" ")}
      >
        {iconNode}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={[
            "mb-0.5 font-manrope text-[9px] font-bold uppercase tracking-[1.6px]",
            isPrimary ? "text-brandSecondary-700" : "text-ui-text-main/38",
          ].join(" ")}
        >
          {kicker}
        </p>
        <p className="font-jakarta text-[14px] font-bold tracking-tight text-ui-text-main">
          {title}
        </p>
        <p className="mt-0.5 truncate font-manrope text-[11px] leading-4 text-ui-text-muted">
          {description}
        </p>
      </div>
      <div
        className={[
          "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border",
          isPrimary ? "border-transparent bg-white" : "border-ui-text-main/9 bg-ui-text-main/4",
        ].join(" ")}
      >
        <ChevronRight
          size={13}
          className={isPrimary ? "text-brandPrimary-600" : "text-ui-text-main/45"}
        />
      </div>
    </Link>
  );
}
