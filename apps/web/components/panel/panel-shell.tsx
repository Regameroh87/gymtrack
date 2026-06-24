"use client";

// Shell del panel autenticado: sidebar (identidad + rol + gym + logout) + contenido.
// Base mínima de la Fase 2; los ítems de navegación reales (usuarios, ejercicios,
// etc.) se cuelgan al migrar cada módulo. Inspirado en AdminSidebar/PlatformSidebar
// de Expo.

// Contextos y helpers
import { useAuth } from "@/components/auth/auth-provider";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { BRAND } from "@/lib/site";

export function PanelShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { gym, isSuperAdmin, exitGym } = useActiveGym();
  const { role } = useUserRole();

  const title = isSuperAdmin && !gym ? BRAND.name : (gym?.name ?? BRAND.name);
  const displayName =
    [user?.name, user?.last_name].filter(Boolean).join(" ") ||
    (user?.email as string) ||
    "Usuario";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-brandPrimary-950 px-5 py-6 text-white">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-jakarta text-lg font-extrabold tracking-tight">
              {title}
            </span>
            {role && (
              <span className="text-xs font-medium text-brandPrimary-200">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
          </div>

          {/* Modo administrador: super_admin parado en un gym puede volver. */}
          {isSuperAdmin && gym && (
            <button
              type="button"
              onClick={exitGym}
              className="self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
            >
              ← Volver a plataforma
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {user?.email && (
              <span className="truncate text-xs text-brandPrimary-200">
                {user.email as string}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
