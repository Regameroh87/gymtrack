// Layout del área de SOCIO (web). Siembra los mismos providers que el panel
// (sesión/rol/gym resueltos en server) + QueryProvider, y monta el MemberNavbar.
// Réplica del (protected)/_layout.web.jsx de Expo (logueado → tabs de socio).

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { CoreClientInit } from "@/components/auth/core-client-init";
import { AuthProvider } from "@/components/auth/auth-provider";
import {
  ActiveGymProvider,
  type ActiveGymSeed,
} from "@/components/auth/active-gym-provider";
import { QueryProvider } from "@/components/query-provider";
import { MemberNavbar } from "@/components/member/member-navbar";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx.authUser) redirect("/login");
  // Multi-gym sin gym elegido: primero elegir gimnasio (theme/datos dependen de él).
  if (ctx.needsSelection) redirect("/select-gym");

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
        <ActiveGymProvider seed={gymSeed}>
          <QueryProvider>
            <div className="min-h-screen bg-ui-background-light">
              <MemberNavbar />
              {children}
            </div>
          </QueryProvider>
        </ActiveGymProvider>
      </AuthProvider>
    </CoreClientInit>
  );
}
