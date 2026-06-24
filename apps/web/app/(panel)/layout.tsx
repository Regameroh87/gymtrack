// Layout del panel autenticado. Guard de defensa en profundidad (el middleware ya
// redirige sin sesión) + siembra de los providers cliente con la sesión/rol/gym
// resueltos en el servidor. Las pantallas hijas deciden su chrome (shell o no).

// Next
import { redirect } from "next/navigation";

// Sesión y providers
import { getSessionContext } from "@/lib/auth/session";
import { CoreClientInit } from "@/components/auth/core-client-init";
import { AuthProvider } from "@/components/auth/auth-provider";
import {
  ActiveGymProvider,
  type ActiveGymSeed,
} from "@/components/auth/active-gym-provider";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx.authUser) redirect("/login");

  const gymSeed: ActiveGymSeed = {
    gymId: ctx.activeGymId,
    role: ctx.role,
    gym: ctx.activeGym,
    memberships: ctx.memberships,
    gymOptions: ctx.gymOptions,
    isSuperAdmin: ctx.isSuperAdmin,
    needsSelection: ctx.needsSelection,
  };

  return (
    <CoreClientInit>
      <AuthProvider
        initialProfile={ctx.profile}
        initialAuthUserId={ctx.authUser.id}
      >
        <ActiveGymProvider seed={gymSeed}>{children}</ActiveGymProvider>
      </AuthProvider>
    </CoreClientInit>
  );
}
