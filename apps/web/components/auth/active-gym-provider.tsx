"use client";

// Contexto de gym activo del lado cliente. Espeja la API de useActiveGym() de Expo.
// La resolución (qué gym, qué rol, si hace falta selección) la hace el servidor
// (getSessionContext) y se siembra acá. switchGym/exitGym persisten en cookie vía
// server action y refrescan el server, que vuelve a sembrar el contexto.

// React
import { createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// Acciones, roles y tipos
import { setActiveGym } from "@/lib/auth/actions";
import { type Role } from "@/lib/auth/roles";
import { type GymEmbed, type GymOption, type Membership } from "@/lib/auth/session";

interface ActiveGymContextValue {
  gymId: string | null;
  role: Role | null;
  gym: GymEmbed | null;
  memberships: Membership[];
  gymOptions: GymOption[];
  isSuperAdmin: boolean;
  needsSelection: boolean;
  switchGym: (gymId: string) => Promise<void>;
  exitGym: () => Promise<void>;
}

const ActiveGymContext = createContext<ActiveGymContextValue | null>(null);

export interface ActiveGymSeed {
  gymId: string | null;
  role: Role | null;
  gym: GymEmbed | null;
  memberships: Membership[];
  gymOptions: GymOption[];
  isSuperAdmin: boolean;
  needsSelection: boolean;
}

export function ActiveGymProvider({
  seed,
  children,
}: {
  seed: ActiveGymSeed;
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Elegir un gym: persiste la cookie y entra al panel del gym.
  const switchGym = useCallback(
    async (gymId: string) => {
      // El early-return solo evita reescribir la cookie si ya apunta al gym; la
      // navegación a /admin debe ocurrir SIEMPRE. Si no, al "Entrar" a un gym que
      // ya es el activo (cookie persistida), el caller queda sin navegar y colgado.
      if (gymId !== seed.gymId) {
        await setActiveGym(gymId);
      }
      router.replace("/admin");
      router.refresh();
    },
    [seed.gymId, router]
  );

  // Volver al selector / plataforma sin desloguear (modo administrador del super_admin).
  const exitGym = useCallback(async () => {
    await setActiveGym(null);
    router.replace(seed.isSuperAdmin ? "/platform" : "/select-gym");
    router.refresh();
  }, [seed.isSuperAdmin, router]);

  const value = useMemo<ActiveGymContextValue>(
    () => ({
      gymId: seed.gymId,
      role: seed.role,
      gym: seed.gym,
      memberships: seed.memberships,
      gymOptions: seed.gymOptions,
      isSuperAdmin: seed.isSuperAdmin,
      needsSelection: seed.needsSelection,
      switchGym,
      exitGym,
    }),
    [seed, switchGym, exitGym]
  );

  return <ActiveGymContext.Provider value={value}>{children}</ActiveGymContext.Provider>;
}

export function useActiveGym(): ActiveGymContextValue {
  const ctx = useContext(ActiveGymContext);
  if (!ctx) throw new Error("useActiveGym debe usarse dentro de <ActiveGymProvider>");
  return ctx;
}
