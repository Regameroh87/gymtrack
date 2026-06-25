"use client";

// Home del socio (web). Clon de apps/mobile (home)/index.web.jsx: banner de
// bienvenida, stats del mes, últimas sesiones e accesos rápidos. El MemberNavbar lo
// pone el layout. Los registros de entrenamiento viven en la app móvil (la base
// local SQLite no corre en web), así que acá la lista arranca vacía — igual que en
// Expo web.

// React / Next
import { useEffect, useState } from "react";
import Link from "next/link";

// Contextos, hooks y helpers
import { useAuth } from "@/components/auth/auth-provider";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { formatDuration } from "@gymtrack/core/format-date";
import { brandPrimary, brandSecondary, ui } from "@gymtrack/core/colors";

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

// ─── Tokens ──
const P600 = brandPrimary[600];
const P700 = brandPrimary[700];
const MINT = brandSecondary[400];
const MINT_DARK = brandSecondary[700];
const BG = ui.background.light;
const SURFACE = ui.surface.light;
const TEXT_MAIN = ui.text.main;
const TEXT_MUTED = ui.text.muted;
const BORDER = "rgba(196,190,230,0.25)";

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
  const isMobile = useIsMobile();

  // En web el detalle de entrenamientos vive en la app móvil (SQLite local no corre
  // en navegador). La lista arranca vacía, igual que el Expo web.
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

  const STATS: { label: string; value: string; Icon: LucideIcon; dot: string; bubble: string }[] = [
    { label: "Sesiones este mes", value: logsLoading ? "—" : String(sessionsThisMonth), Icon: ClipboardList, dot: P600, bubble: "rgba(48,35,205,0.08)" },
    { label: "Tiempo total este mes", value: logsLoading ? "—" : formatDuration(timeThisMonth), Icon: Clock, dot: "#7c3aed", bubble: "rgba(124,58,237,0.08)" },
    { label: "Última sesión", value: logsLoading ? "—" : (lastSessionLabel ?? "—"), Icon: ScrollText, dot: MINT_DARK, bubble: "rgba(0,80,71,0.08)" },
  ];

  return (
    <div style={{ backgroundColor: BG }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 36,
          paddingBottom: 36,
          paddingLeft: isMobile ? 16 : 24,
          paddingRight: isMobile ? 16 : 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 1080 }}>
          {/* ── BANNER DE BIENVENIDA ── */}
          <div
            style={{
              position: "relative",
              borderRadius: 22,
              padding: 32,
              marginBottom: 22,
              overflow: "hidden",
              background: "linear-gradient(135deg, #2518b8, #4a44e4, #6366f1)",
            }}
          >
            <div style={{ position: "absolute", right: -30, top: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.05)" }} />
            <div style={{ position: "absolute", right: 120, bottom: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", right: 12, top: 12, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" }} />

            <div style={{ position: "relative", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: isMobile ? 20 : 0 }}>
              <div style={{ flex: 1 }}>
                {/* Ticks */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: MINT }} />
                  <div style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: "rgba(42,232,204,0.4)" }} />
                </div>

                {/* Kicker */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: MINT, boxShadow: `0 0 5px ${MINT}` }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: 1.8, textTransform: "uppercase" }} className="font-manrope font-semibold">
                    {greeting}
                  </span>
                </div>

                <p style={{ fontSize: 36, color: "#fff", letterSpacing: -1.2, lineHeight: "42px", marginBottom: 6 }} className="font-jakarta font-bold">
                  {firstName}.
                </p>

                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }} className="font-manrope">
                  {dateLine} · {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                </p>
              </div>

              {/* Icono decorativo */}
              <div style={{ marginLeft: isMobile ? 0 : 32, width: 88, height: 88, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", alignSelf: isMobile ? "flex-start" : "center" }}>
                <Dumbbell size={38} color="rgba(255,255,255,0.85)" />
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }} className="font-manrope font-semibold">
                  Atleta
                </span>
              </div>
            </div>
          </div>

          {/* ── FILA DE STATS ── */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 14, marginBottom: 22 }}>
            {STATS.map((stat, i) => {
              const Icon = stat.Icon;
              return (
                <div key={i} style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 18, padding: 20, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: stat.bubble, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={16} color={stat.dot} />
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stat.dot, opacity: 0.35 }} />
                  </div>
                  <p style={{ fontSize: 28, color: TEXT_MAIN, letterSpacing: -0.8 }} className="font-jakarta font-bold">
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }} className="font-manrope">
                    {stat.label}
                  </p>
                  <div style={{ height: 2, borderRadius: 1, marginTop: 14, width: "35%", backgroundColor: stat.dot, opacity: 0.25 }} />
                </div>
              );
            })}
          </div>

          {/* ── LAYOUT 2 COLUMNAS ── */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: "flex-start" }}>
            {/* Hero — Últimas sesiones */}
            <div style={{ flex: isMobile ? undefined : 1.6, width: isMobile ? "100%" : undefined, marginBottom: isMobile ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase" }} className="font-manrope font-semibold">
                  Últimas sesiones
                </span>
              </div>

              <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", backgroundColor: SURFACE, border: `1px solid ${BORDER}`, boxShadow: `0 8px 24px rgba(74,68,228,0.08)` }}>
                {/* Ticks firma editorial */}
                <div style={{ position: "absolute", top: 18, left: 22, width: 28, height: 3, backgroundColor: MINT, borderRadius: 2 }} />
                <div style={{ position: "absolute", top: 18, left: 54, width: 10, height: 3, backgroundColor: "rgba(42,232,204,0.35)", borderRadius: 2 }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 22, paddingRight: 22, paddingTop: 32, paddingBottom: 18 }}>
                  <span style={{ fontSize: 10, color: MINT_DARK, letterSpacing: 2.4, textTransform: "uppercase" }} className="font-manrope font-bold">
                    Entrenamientos recientes
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MINT, boxShadow: `0 0 6px ${MINT}` }} />
                    <span style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 2, textTransform: "uppercase" }} className="font-jakarta font-bold">
                      Historial
                    </span>
                  </div>
                </div>

                {/* Body: en web siempre vacío (logs viven en la app móvil) */}
                {logsLoading ? (
                  <div style={{ paddingLeft: 22, paddingRight: 22, paddingTop: 60, paddingBottom: 60, display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }} className="font-manrope">
                      Cargando registros...
                    </span>
                  </div>
                ) : recentLogs.length === 0 ? (
                  <div style={{ paddingLeft: 22, paddingRight: 22, paddingTop: 8, paddingBottom: 32, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(15,13,32,0.25)" }} />
                      <span style={{ fontSize: 9, color: TEXT_MUTED, letterSpacing: 1.6, textTransform: "uppercase" }} className="font-manrope font-bold">
                        Sin registros aún
                      </span>
                    </div>
                    <p style={{ fontSize: 28, lineHeight: "33px", letterSpacing: -1, color: TEXT_MAIN, whiteSpace: "pre-line" }} className="font-jakarta font-bold">
                      {"Todavía no\nregistraste entrenamientos."}
                    </p>
                    <p style={{ fontSize: 13, lineHeight: "20px", color: TEXT_MUTED, maxWidth: 380 }} className="font-manrope">
                      Cuando termines una sesión en el móvil, vas a ver acá tu progreso reciente.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Acceso rápido */}
            <div style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined }}>
              <span style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, display: "block" }} className="font-manrope font-semibold">
                Acceso Rápido
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <QuickCard
                  kicker="Catálogo"
                  title="Explorar rutinas"
                  description="Planes y sesiones publicados por el gym."
                  icon={<ClipboardList size={18} color="#fff" />}
                  iconBubble="rgba(48,35,205,0.09)"
                  iconBorder="rgba(48,35,205,0.28)"
                  variant="primary"
                  href="/planes"
                />
                <QuickCard
                  kicker="Personalizado"
                  title="Crear mi rutina"
                  description="Armá tu propia rutina eligiendo ejercicios."
                  icon={<Plus size={18} color={MINT_DARK} />}
                  iconBubble="rgba(0,80,71,0.09)"
                  iconBorder="rgba(0,80,71,0.28)"
                  variant="ghost"
                  href="/planes/builder"
                />
              </div>

              {/* Tip card */}
              <div style={{ marginTop: 14, backgroundColor: "rgba(48,35,205,0.05)", borderRadius: 16, padding: 16, border: "1px solid rgba(48,35,205,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: MINT }} />
                  <span style={{ fontSize: 9, color: MINT_DARK, letterSpacing: 1.6, textTransform: "uppercase" }} className="font-manrope font-bold">
                    Tip del día
                  </span>
                </div>
                <p style={{ fontSize: 13, color: TEXT_MAIN, letterSpacing: -0.2, marginBottom: 4 }} className="font-jakarta font-bold">
                  Consistencia ante todo.
                </p>
                <p style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: "18px" }} className="font-manrope">
                  El entrenamiento más efectivo es el que hacés seguido, no el que hacés perfecto.
                </p>
              </div>
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
  icon,
  iconBubble,
  iconBorder,
  variant,
  href,
}: {
  kicker: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBubble: string;
  iconBorder: string;
  variant: "primary" | "ghost";
  href: string;
}) {
  const isPrimary = variant === "primary";
  return (
    <Link
      href={href}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: isPrimary ? "rgba(48,35,205,0.07)" : SURFACE,
        border: `1px solid ${isPrimary ? "rgba(48,35,205,0.22)" : BORDER}`,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
      className="transition hover:opacity-95"
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          backgroundColor: isPrimary ? P600 : iconBubble,
          border: `1px solid ${isPrimary ? "rgba(255,255,255,0.3)" : iconBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isPrimary ? `0 3px 10px ${P600}66` : "none",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 9, color: isPrimary ? MINT_DARK : "rgba(15,13,32,0.38)", letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 2 }} className="font-manrope font-bold">
          {kicker}
        </p>
        <p style={{ fontSize: 14, color: TEXT_MAIN, letterSpacing: -0.2 }} className="font-jakarta font-bold">
          {title}
        </p>
        <p style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: "16px", marginTop: 1 }} className="truncate font-manrope">
          {description}
        </p>
      </div>
      <div style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: isPrimary ? "#fff" : "rgba(15,13,32,0.04)", border: isPrimary ? "none" : "1px solid rgba(15,13,32,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ChevronRight size={13} color={isPrimary ? P600 : "rgba(15,13,32,0.45)"} />
      </div>
    </Link>
  );
}
