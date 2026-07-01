// Catálogo central de la plataforma (super_admin). Gating por rol en el server;
// el shell con tabs (Ejercicios/Sesiones/Planes) es cliente. Migrado de Expo
// platform/catalog/index.web.jsx. Ver [[project_default_catalog]].
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import { CatalogTabs } from "@/components/platform/catalog/catalog-tabs";

export default async function PlatformCatalogPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "catalog")) redirect("/dashboard");

  return (
    <PlatformShell>
      <CatalogTabs />
    </PlatformShell>
  );
}
