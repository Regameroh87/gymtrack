// Panel de configuración de suscripciones SaaS de la plataforma (super_admin).
// Define los planes que el owner de cada gimnasio ve al suscribirse: nombre,
// precio, moneda, días de prueba, tope de socios y texto de venta.
//
// El fetch va en el servidor (la RLS de super_admin lee todo saas_plans); las
// escrituras las hace el componente cliente por RLS, igual que el resto del
// panel de plataforma.
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  SaasSubscriptionsConfig,
  type SaasSubscriptionPlan,
} from "@/components/platform/saas-subscriptions-config";

export default async function PlatformSubscriptionsPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "subscriptions")) redirect("/dashboard");

  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("saas_plans")
    .select(
      "id, name, description, price, currency, trial_days, max_members, is_active, is_featured, is_default, badge_text, features, sort_order, created_at"
    )
    .order("sort_order")
    .order("created_at");

  // price es numeric: PostgREST lo puede devolver como string. Se normaliza acá
  // para que el cliente no tenga que desconfiar de su propio tipo.
  const plans: SaasSubscriptionPlan[] = (data ?? []).map((p) => ({
    ...p,
    price: p.price != null ? Number(p.price) : null,
    description: p.description ?? "",
    features: p.features ?? [],
  }));

  return (
    <PlatformShell>
      <SaasSubscriptionsConfig initialPlans={plans} />
    </PlatformShell>
  );
}
