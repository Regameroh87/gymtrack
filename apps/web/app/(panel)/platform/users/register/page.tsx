// Alta de staff de plataforma. Gating server-side igual al resto de /platform
// (getSessionContext + gate de rol + PlatformShell); solo admin-tier crea staff,
// igual que canCreate en users/page.tsx.

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { isPlatformAdminRole } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import { RegisterPlatformStaffForm } from "@/components/platform/register-platform-staff-form";

export default async function RegisterPlatformStaffPage() {
  const ctx = await getSessionContext();
  if (!isPlatformAdminRole(ctx.platformRole)) redirect("/platform/users");

  return (
    <PlatformShell>
      <RegisterPlatformStaffForm />
    </PlatformShell>
  );
}
