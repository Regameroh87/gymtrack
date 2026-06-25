"use client";

// Shell del panel de PLATAFORMA del super_admin. Réplica del PlatformSidebar.web.jsx
// de Expo: marca fija GymTrack (no el theme de ningún gym), nav de plataforma con
// el ítem activo resaltado, status card y footer con identidad + logout.
// Estética "Editorial Pass": surface oscuro sólido, brand colors, acento mint.

// React / Next
import { usePathname } from "next/navigation";
import Link from "next/link";

// Iconos
import {
  ShieldHalf,
  LayoutDashboard,
  Dumbbell,
  Receipt,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

// Contextos y constantes
import { useAuth } from "@/components/auth/auth-provider";
import { BRAND } from "@/lib/site";

// Ítems del nav. `comingSoon` deja los módulos aún no migrados como placeholders
// deshabilitados (todos los módulos de plataforma ya están migrados).
type NavItem = {
  icon: typeof ShieldHalf;
  label: string;
  href: string;
  comingSoon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/platform" },
  { icon: ShieldHalf, label: "Gimnasios", href: "/platform/gyms" },
  { icon: Dumbbell, label: "Catálogo", href: "/platform/catalog" },
  { icon: Receipt, label: "Facturación", href: "/platform/billing" },
  { icon: Users, label: "Usuarios globales", href: "/platform/users" },
  { icon: Settings, label: "Ajustes", href: "/platform/settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/platform") return pathname === "/platform";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const email = (user?.email as string) || "";
  const initial = (email[0] || "A").toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ── */}
      <aside className="flex h-screen w-[248px] shrink-0 flex-col bg-[#0C0B14] sticky top-0">
        {/* Brand GymTrack (plataforma) */}
        <div className="bg-gradient-to-b from-brandPrimary-800 to-[#0C0B14] px-5 pb-6 pt-7">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-gradient-to-br from-brandPrimary-800 to-brandPrimary-600">
              <ShieldHalf size={18} color="#fff" />
            </div>
            <div>
              <p className="font-jakarta text-base font-bold tracking-tight text-white">
                {BRAND.name}
              </p>
              <p className="font-manrope text-[10px] tracking-wide text-white/40">
                Plataforma
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto pt-2">
          <p className="mb-1.5 mt-1 px-[18px] font-manrope text-[9px] font-semibold uppercase tracking-[1.5px] text-white/25">
            Plataforma
          </p>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            const disabled = item.comingSoon || active;

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
                ? "bg-brandPrimary-700"
                : item.comingSoon
                  ? "opacity-40"
                  : "hover:bg-white/5"
            }`;

            return disabled ? (
              <div key={item.href} className={className}>
                {content}
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={className}>
                {content}
              </Link>
            );
          })}

          <div className="mx-4 my-4 h-px bg-white/5" />

          {/* Status card */}
          <div className="mx-4 mb-3 rounded-xl border border-brandSecondary-400/10 bg-brandSecondary-400/[0.07] p-3.5">
            <p className="mb-0.5 font-manrope text-[11px] font-semibold text-brandSecondary-400">
              Modo plataforma
            </p>
            <p className="font-manrope text-[10px] leading-[15px] text-white/35">
              Estás administrando todos los gimnasios
            </p>
          </div>
        </nav>

        {/* Footer user */}
        <div className="border-t border-white/5 p-3.5">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-gradient-to-br from-brandPrimary-800 to-brandPrimary-600">
              <span className="font-jakarta text-sm font-bold text-white">
                {initial}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-manrope text-xs font-bold text-white/90">
                Super Admin
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
      </aside>

      {/* ── Contenido ── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
