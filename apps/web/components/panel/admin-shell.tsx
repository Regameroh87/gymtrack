"use client";

// Shell del panel de ADMIN de un gym. Clon de apps/mobile AdminSidebar.web.jsx +
// el chrome responsive de admin/_layout.web.jsx: sidebar oscuro en desktop, header
// con drawer en mobile. Marca del gym (logo/nombre), nav filtrado por rol,
// "volver a plataforma" para super_admin, footer con identidad + logout.

// React / Next
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Iconos
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  Flame,
  Receipt,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  UserCog,
  type LucideIcon,
} from "lucide-react";

// Contextos y helpers
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { canAccessModule } from "@/lib/auth/roles";
import { mediaUrl } from "@/lib/media";

type NavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  comingSoon?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

// Nav agrupado por naturaleza: operación diaria (Socios) separada del catálogo
// de contenido que se arma una vez (Entrenamiento), más General y Sistema.
const NAV_SECTIONS: NavSection[] = [
  {
    title: "General",
    items: [{ icon: LayoutDashboard, label: "Dashboard", path: "" }],
  },
  {
    title: "Socios",
    items: [
      { icon: Users, label: "Usuarios", path: "users" },
      { icon: UserCog, label: "Equipo", path: "team" },
      { icon: Flame, label: "Actividades", path: "activities" },
      { icon: QrCode, label: "Asistencias", path: "attendance" },
      { icon: Receipt, label: "Contabilidad", path: "billing" },
    ],
  },
  {
    title: "Entrenamiento",
    items: [
      { icon: Dumbbell, label: "Ejercicios", path: "exercises" },
      { icon: Dumbbell, label: "Máquinas", path: "equipments" },
      { icon: ClipboardList, label: "Sesiones", path: "sessions" },
      { icon: ClipboardList, label: "Planes", path: "plans" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { icon: BarChart3, label: "Reportes", path: "reports", comingSoon: true },
      { icon: Settings, label: "Ajustes", path: "settings", comingSoon: true },
    ],
  },
];

function isActive(pathname: string, itemPath: string): boolean {
  const href = itemPath ? `/admin/${itemPath}` : "/admin";
  if (itemPath === "") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { gym, isSuperAdmin, exitGym } = useActiveGym();

  // Dashboard siempre visible; el resto según permisos del rol. Se descartan
  // secciones que quedan sin ítems visibles para el rol.
  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.path === "" || canAccessModule(role, item.path)
    ),
  })).filter((section) => section.items.length > 0);

  const gymName = gym?.name ?? "GymTrack";
  const logo = mediaUrl(gym?.logo_url ?? null);
  const email = (user?.email as string) || "";
  const initial = (email[0] || "A").toUpperCase();

  return (
    <div className="flex h-screen w-[248px] shrink-0 flex-col bg-[#0C0B14]">
      {/* Brand */}
      <div className="bg-gradient-to-b from-brandPrimary-800 to-[#0C0B14] px-5 pb-6 pt-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-[38px] w-[38px] rounded-[9px] object-cover"
              />
            ) : (
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-gradient-to-br from-brandPrimary-700 to-brandPrimary-600">
                <Dumbbell size={18} color="#fff" />
              </div>
            )}
            <div>
              <p className="font-jakarta text-base font-bold tracking-tight text-white">
                {gymName}
              </p>
              <p className="font-manrope text-[10px] tracking-wide text-white/40">
                Panel de Control
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
            >
              <X size={16} color="rgba(255,255,255,0.7)" />
            </button>
          )}
        </div>
      </div>

      {/* Volver a plataforma (solo super_admin) */}
      {isSuperAdmin && (
        <button
          type="button"
          onClick={() => {
            exitGym();
            onClose?.();
          }}
          className="mx-2 mt-2 flex items-center gap-2 rounded-[10px] bg-white/5 px-2.5 py-2 hover:bg-white/10"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
          </span>
          <span className="flex-1 text-left font-manrope text-[12px] font-semibold text-white/70">
            Volver a plataforma
          </span>
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-2 scrollbar-hide">
        {navSections.map((section, sectionIdx) => (
          <div key={section.title}>
            <p
              className={`mb-1.5 px-[18px] font-manrope text-[9px] font-semibold uppercase tracking-[1.5px] text-white/25 ${
                sectionIdx === 0 ? "mt-1" : "mt-4"
              }`}
            >
              {section.title}
            </p>

            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.path);
              const disabled = item.comingSoon || active;
              const href = item.path ? `/admin/${item.path}` : "/admin";

              const content = (
                <>
                  {active && (
                    <span className="absolute -left-2 h-[22px] w-[3px] rounded-sm bg-brandSecondary-400" />
                  )}
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      active ? "bg-white/20" : "bg-white/5"
                    }`}
                  >
                    <Icon
                      size={14}
                      color={active ? "#fff" : "rgba(255,255,255,0.55)"}
                    />
                  </span>
                  <span
                    className={`flex-1 text-[13px] ${
                      active
                        ? "font-manrope font-bold text-white"
                        : "font-manrope text-white/55"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.comingSoon && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-manrope text-[8px] font-semibold tracking-wider text-white/30">
                      SOON
                    </span>
                  )}
                </>
              );

              const className = `relative mx-2 mb-0.5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 ${
                active
                  ? "bg-brandPrimary-600"
                  : item.comingSoon
                    ? "opacity-40"
                    : "hover:bg-white/5"
              }`;

              return disabled ? (
                <div key={item.label} className={className}>
                  {content}
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={href}
                  onClick={onClose}
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mx-4 my-4 h-px bg-white/5" />

        {/* Status card */}
        <div className="mx-4 mb-3 rounded-xl border border-brandSecondary-400/10 bg-brandSecondary-400/[0.07] p-3.5">
          <p className="mb-0.5 font-manrope text-[11px] font-semibold text-brandSecondary-400">
            Sistema activo
          </p>
          <p className="font-manrope text-[10px] leading-[15px] text-white/35">
            Todos los módulos operativos
          </p>
        </div>
      </nav>

      {/* Footer user */}
      <div className="border-t border-white/5 p-3.5">
        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-brandPrimary-700 to-brandPrimary-600">
            <span className="font-jakarta text-sm font-bold text-white">
              {initial}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-manrope text-xs font-bold text-white/90">
              Administrador
            </p>
            <p className="truncate font-manrope text-[10px] text-white/30">
              {email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-red-500/20 bg-red-500/10 py-2 transition hover:bg-red-500/15"
        >
          <LogOut size={13} color="#ef4444" />
          <span className="font-manrope text-xs font-semibold text-red-500">
            Cerrar sesión
          </span>
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { gym } = useActiveGym();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gymName = gym?.name ?? "GymTrack";

  return (
    <div className="flex h-screen bg-ui-background-light">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Columna mobile: header + contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <div className="flex h-[56px] items-center justify-between border-b border-white/5 bg-[#0C0B14] px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
          >
            <Menu size={20} color="#fff" />
          </button>
          <span className="font-jakarta text-sm font-bold tracking-tight text-white">
            {gymName}
          </span>
          <span className="w-9" />
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Drawer mobile */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[999] bg-black/50 md:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-[1000] md:hidden">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
