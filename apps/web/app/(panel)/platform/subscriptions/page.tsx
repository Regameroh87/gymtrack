// Panel de configuración de suscripciones SaaS de la plataforma (super_admin / superadmin_admin).
// Permite definir nombres, precios, monedas y límite de socios permitidos por gimnasio.
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import { SaasSubscriptionsConfig } from "@/components/platform/saas-subscriptions-config";

export default async function PlatformSubscriptionsPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "subscriptions")) redirect("/dashboard");

  return (
    <PlatformShell>
      <SaasSubscriptionsConfig />
    </PlatformShell>
  );
}
