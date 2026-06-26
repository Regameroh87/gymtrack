"use client";

// Dashboard del panel de ADMIN. Clon de apps/mobile admin/index.web.jsx:
// top bar + banner de bienvenida + stats (placeholder "—") + módulos del sistema
// (filtrados por rol) + acciones rápidas + próximamente. Navegación con Link.

// Next
import { useEffect, useState } from "react";
import Link from "next/link";

// Iconos
import {
  Users,
  Dumbbell,
  ClipboardList,
  Receipt,
  Settings,
  BarChart3,
  Lock,
  ChevronRight,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

// Contextos y helpers
import { ui } from "@gymtrack/core/colors";
import { useUserRole } from "@/components/auth/use-user-role";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { canAccessModule } from "@/lib/auth/roles";
import { StatCard } from "@/components/ui/stat-card";

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  dot: string;
  bubble: string;
  iconColor: string;
};

type ModuleItem = {
  icon: LucideIcon;
  label: string;
  sub: string;
  path: string;
  color: string;
  bar: string;
  bubble: string;
};

type QuickAction = {
  label: string;
  sub: string;
  path: string;
  color: string;
  bubble: string;
  icon: LucideIcon;
};

const buildStats = (brandPrimary: Record<number, string>): Stat[] => [
  { label: "Socios activos", value: "—", icon: Users, dot: "bg-brandPrimary-600", bubble: "bg-brandPrimary-50", iconColor: brandPrimary[600] },
  { label: "Sesiones totales", value: "—", icon: ClipboardList, dot: "bg-violet-600", bubble: "bg-violet-50", iconColor: "#7c3aed" },
  { label: "Planes activos", value: "—", icon: ClipboardList, dot: "bg-sky-600", bubble: "bg-sky-50", iconColor: "#0284c7" },
  { label: "Facturación mes", value: "—", icon: Receipt, dot: "bg-amber-600", bubble: "bg-amber-50", iconColor: "#d97706" },
];

const buildModules = (
  brandPrimary: Record<number, string>,
  brandSecondary: Record<number, string>
): ModuleItem[] => [
  { icon: Users, label: "Usuarios", sub: "Socios y Staff", path: "users", color: brandPrimary[600], bar: "bg-brandPrimary-600", bubble: "bg-brandPrimary-600/10" },
  { icon: Dumbbell, label: "Ejercicios", sub: "Catálogo maestro", path: "exercises", color: brandSecondary[500], bar: "bg-brandSecondary-500", bubble: "bg-brandSecondary-500/10" },
  { icon: Dumbbell, label: "Máquinas", sub: "Inventario del gimnasio", path: "equipments", color: "#f43f5e", bar: "bg-rose-500", bubble: "bg-rose-500/10" },
  { icon: ClipboardList, label: "Sesiones", sub: "Armador técnico", path: "sessions", color: "#7c3aed", bar: "bg-violet-600", bubble: "bg-violet-600/10" },
  { icon: ClipboardList, label: "Planes", sub: "Plantillas de entreno", path: "plans", color: "#0284c7", bar: "bg-sky-600", bubble: "bg-sky-600/10" },
  { icon: Receipt, label: "Contabilidad", sub: "Membresías y pagos", path: "billing", color: "#d97706", bar: "bg-amber-600", bubble: "bg-amber-600/10" },
];

const buildQuickActions = (
  brandPrimary: Record<number, string>,
  brandSecondary: Record<number, string>
): QuickAction[] => [
  { label: "Registrar socio", sub: "Nuevo miembro", path: "users/register", color: brandPrimary[600], bubble: "bg-brandPrimary-600/10", icon: UserPlus },
  { label: "Crear ejercicio", sub: "Builder de ejercicios", path: "exercises/builder", color: brandSecondary[500], bubble: "bg-brandSecondary-500/10", icon: Dumbbell },
  { label: "Armar sesión", sub: "Constructor técnico", path: "sessions/builder", color: "#7c3aed", bubble: "bg-violet-600/10", icon: ClipboardList },
  { label: "Crear plan", sub: "Plantilla semanal", path: "plans/builder", color: "#0284c7", bubble: "bg-sky-600/10", icon: ClipboardList },
];

const COMING_SOON = [
  { icon: BarChart3, label: "Reportes", sub: "Estadísticas del gimnasio" },
  { icon: Settings, label: "Ajustes", sub: "Configuración del sistema" },
];

export default function AdminDashboardPage() {
  const { role } = useUserRole();
  const { brandPrimary, brandSecondary, gymName } = useGymTheme();

  const STATS = buildStats(brandPrimary);
  const QUICK_ACTIONS = buildQuickActions(brandPrimary, brandSecondary);
  const modules = buildModules(brandPrimary, brandSecondary).filter((mod) =>
    canAccessModule(role, mod.path)
  );

  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }));
  }, []);

  return (
    <div className="p-4 pb-14 md:p-9">
      {/* Top bar */}
      <div className="mb-7 flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-end md:gap-0">
        <div>
          <p className="mb-0.5 font-manrope text-xs capitalize text-ui-text-muted">
            {dateStr}
          </p>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Panel de Control
          </h1>
        </div>

        <div className="flex items-center gap-1.5 self-start rounded-xl border border-ui-input-border bg-white px-3.5 py-2 shadow-card-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="font-manrope text-xs font-semibold text-ui-text-main">
            Admin activo
          </span>
        </div>
      </div>

      {/* Welcome banner */}
      <div className="relative mb-6 overflow-hidden rounded-card-lg bg-gradient-to-br from-brandPrimary-800 via-brandPrimary-600 to-brandPrimary-400 p-5 md:p-[30px]">
        <div className="absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full bg-white/5" />
        <div className="absolute -bottom-[50px] right-[100px] h-[140px] w-[140px] rounded-full bg-white/5" />
        <div className="absolute right-2.5 top-2.5 h-20 w-20 rounded-full bg-white/[0.05]" />

        <div className="flex flex-col items-stretch justify-between gap-5 md:flex-row md:items-center md:gap-0">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brandSecondary-400" />
              <span className="font-manrope text-xs font-semibold tracking-wide text-white/65">
                Bienvenido de vuelta
              </span>
            </div>
            <p className="mb-2 font-jakarta text-[28px] font-bold tracking-tight text-white">
              Hola, Administrador
            </p>
            <p className="max-w-[380px] font-manrope text-[13px] leading-5 text-white/55">
              Gestiona tu gimnasio desde aquí. Usuarios, rutinas, equipos y más,
              todo centralizado.
            </p>

            <div className="mt-5 flex gap-5">
              {[
                { label: "Módulos activos", val: "6" },
                { label: "Próximamente", val: "2" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-jakarta text-[22px] font-bold tracking-tight text-white">
                    {s.val}
                  </p>
                  <p className="font-manrope text-[11px] text-white/45">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 self-start rounded-[20px] border border-white/10 bg-white/10 p-4 md:ml-8 md:flex-col md:gap-0 md:self-auto md:p-6">
            <Dumbbell size={36} color="rgba(255,255,255,0.9)" />
            <span className="font-manrope text-[11px] uppercase tracking-widest text-white/55 md:mt-2 md:text-[9px]">
              {gymName ?? "GymTrack"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-7 flex flex-col gap-3.5 md:flex-row">
        {STATS.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            iconColor={stat.iconColor}
            bubble={stat.bubble}
            dot={stat.dot}
          />
        ))}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-stretch gap-5 md:flex-row md:items-start">
        {/* Módulos */}
        <div className="md:flex-[3]">
          <p className="mb-3 font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
            Módulos del sistema
          </p>
          <div className="flex flex-col gap-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.label}
                  href={`/admin/${mod.path}`}
                  className="flex items-center gap-3.5 rounded-card-sm border border-ui-input-border bg-white p-4 shadow-card-brand transition-lift hover:bg-brandPrimary-50/40 active:scale-[0.99]"
                >
                  <span className={`h-[38px] w-[3px] rounded-sm ${mod.bar}`} />
                  <span className={`flex h-[38px] w-[38px] items-center justify-center rounded-icon ${mod.bubble}`}>
                    <Icon size={17} color={mod.color} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-jakarta text-sm font-bold text-ui-text-main">
                      {mod.label}
                    </span>
                    <span className="mt-px block font-manrope text-[11px] text-ui-text-muted">
                      {mod.sub}
                    </span>
                  </span>
                  <ChevronRight size={14} color={ui.text.muted} />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Acciones rápidas + Próximamente */}
        <div className="md:flex-[2]">
          <p className="mb-3 font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
            Acciones rápidas
          </p>
          <div className="mb-6 flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={`/admin/${action.path}`}
                  className="flex items-center gap-3 rounded-card-sm border border-ui-input-border bg-white p-3.5 shadow-card-brand transition-lift hover:bg-brandPrimary-50/40 active:scale-[0.99]"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-icon-sm ${action.bubble}`}>
                    <Icon size={14} color={action.color} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-manrope text-[13px] font-bold text-ui-text-main">
                      {action.label}
                    </span>
                    <span className="block font-manrope text-[11px] text-ui-text-muted">
                      {action.sub}
                    </span>
                  </span>
                  <ChevronRight size={13} color={ui.text.muted} />
                </Link>
              );
            })}
          </div>

          <p className="mb-3 font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-ui-text-muted">
            Próximamente
          </p>
          <div className="flex flex-col gap-2">
            {COMING_SOON.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-card-sm border border-ui-input-border bg-ui-background-light p-3.5 opacity-55"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-icon-sm bg-ui-text-muted/10">
                    <Lock size={13} color={ui.text.muted} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-manrope text-[13px] font-bold text-ui-text-muted">
                      {item.label}
                    </span>
                    <span className="block font-manrope text-[11px] text-ui-text-muted">
                      {item.sub}
                    </span>
                  </span>
                  <span className="rounded-md bg-ui-text-muted/10 px-2 py-0.5">
                    <span className="font-manrope text-[9px] font-semibold uppercase tracking-wider text-ui-text-muted">
                      SOON
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
