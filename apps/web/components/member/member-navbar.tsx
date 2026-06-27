"use client";

// Navbar del área de socio (web). Clon de apps/mobile/src/components/web/MemberNavbar.jsx:
// logo + links (Inicio / Planes) + identidad y logout. En Next el home de socio vive
// en /home (la raíz "/" es la landing pública), así que los links apuntan ahí.
//
// Responsive: top bar compacto en mobile + bottom tab bar fijo (md:hidden).

// React / Next
import Link from "next/link";
import { usePathname } from "next/navigation";

// Iconos
import { Dumbbell, ClipboardList, Home, LogOut, type LucideIcon } from "lucide-react";

// Contextos
import { useAuth } from "@/components/auth/auth-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";

const NAV: { label: string; icon: LucideIcon; path: string }[] = [
  { label: "Inicio", icon: Home, path: "/home" },
  { label: "Planes", icon: ClipboardList, path: "/planes" },
];

const isActivePath = (itemPath: string, currentPath: string) => {
  if (itemPath === "/home") return currentPath === "/home";
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
};

export function MemberNavbar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { brandPrimary } = useGymTheme();

  const email = (user?.email as string) || "";
  const firstName = ((user?.name as string) ?? "").split(" ")[0] || "";
  const initial = ((user?.name as string)?.[0] ?? email[0] ?? "A").toUpperCase();
  const imageProfile = user?.image_profile as string | undefined;

  return (
    <>
      {/* ── TOP BAR ── */}
      <div
        className="sticky top-0 z-[100] flex h-[56px] items-center border-b border-ui-input-border bg-ui-surface-light px-4 md:h-[60px] md:px-7"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2.5 md:mr-9">
          <span
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
            style={{ background: `linear-gradient(135deg, ${brandPrimary[700]}, ${brandPrimary[600]})` }}
          >
            <Dumbbell size={16} color="#fff" />
          </span>
          <span className="flex flex-col">
            <span className="font-jakarta text-[15px] font-bold tracking-tight text-ui-text-main">
              GymTrack
            </span>
            <span className="font-manrope text-[9px] font-semibold uppercase tracking-[1.2px] text-ui-text-muted">
              Mi espacio
            </span>
          </span>
        </Link>

        {/* Nav links — desktop only */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path, pathname);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition hover:bg-[rgba(15,13,32,0.04)] ${
                  active ? "bg-brandPrimary-600/10" : ""
                }`}
              >
                <Icon size={14} color={active ? brandPrimary[600] : "#6e6b8a"} />
                <span
                  className={`text-[13px] ${
                    active
                      ? "font-manrope font-bold text-brandPrimary-600"
                      : "font-manrope text-ui-text-muted"
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="h-1 w-1 rounded-full bg-brandSecondary-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer mobile */}
        <div className="flex-1 md:hidden" />

        {/* User section — desktop */}
        <div className="hidden items-center gap-2.5 md:flex">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px]"
              style={{
                background: `linear-gradient(135deg, ${brandPrimary[700]}, ${brandPrimary[600]})`,
              }}
            >
              {imageProfile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageProfile}
                  alt=""
                  className="h-8 w-8 rounded-[10px] object-cover"
                />
              ) : (
                <span className="font-jakarta text-[13px] font-bold text-white">
                  {initial}
                </span>
              )}
            </span>
            {!!firstName && (
              <span className="font-manrope text-[13px] font-semibold text-ui-text-main">
                {firstName}
              </span>
            )}
          </div>

          <span className="h-[22px] w-px bg-ui-input-border" />

          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-red-500/10"
          >
            <LogOut size={14} color="#ef4444" />
            <span className="font-manrope text-xs font-semibold text-red-500">
              Salir
            </span>
          </button>
        </div>

        {/* Logout compacto — mobile only */}
        <button
          type="button"
          onClick={signOut}
          aria-label="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/8 transition active:bg-red-500/15 md:hidden"
        >
          <LogOut size={16} color="#ef4444" />
        </button>
      </div>

      {/* ── BOTTOM TAB BAR — mobile only ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-ui-input-border bg-white md:hidden"
        style={{
          boxShadow: "0 -2px 16px rgba(0,0,0,0.07)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex h-[58px] items-center">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path, pathname);
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-1 flex-col items-center justify-center gap-[3px] py-2"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition ${
                    active ? "bg-brandPrimary-600/12" : ""
                  }`}
                >
                  <Icon
                    size={18}
                    color={active ? brandPrimary[600] : "#9997b3"}
                  />
                </span>
                <span
                  className={`font-manrope text-[10px] font-semibold leading-none ${
                    active ? "text-brandPrimary-600" : "text-ui-text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
