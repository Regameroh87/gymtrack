// Facturación de la plataforma (super_admin): kill switch de registros
// self-service + estado de la suscripción SaaS de cada gimnasio. Data fetch en
// el servidor (RLS de super_admin lee todas las suscripciones); gating por rol.
import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";
import { SignupToggle } from "@/components/platform/signup-toggle";
import {
  SaasSubscriptionsTable,
  type SaasSubscriptionRow,
} from "@/components/platform/saas-subscriptions-table";

export default async function PlatformBillingPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "billing")) redirect("/dashboard");

  const supabase = await createServerSupabase();

  // El precio y los días de prueba se editan en /platform/subscriptions, que es
  // el ABM de planes. Acá solo se mira el estado de cada gimnasio.
  const [{ data: settings }, { data: subs }] = await Promise.all([
    supabase
      .from("platform_settings")
      .select("self_service_signup_enabled")
      .maybeSingle(),
    supabase
      .from("gym_saas_subscriptions")
      // El hint !gym_saas_subscriptions_plan_id_fkey no es opcional: desde que
      // existe pending_plan_id hay DOS foreign keys de esta tabla a saas_plans y
      // PostgREST no puede elegir sola — sin él contesta 300 y la página no
      // carga ninguna suscripción.
      .select(
        "id, status, trial_ends_at, current_period_end, payer_email, created_at, cancel_at_period_end, access_until, cancel_reason, gyms ( name, created_via, is_test ), saas_plans!gym_saas_subscriptions_plan_id_fkey ( name, price, currency )"
      )
      .order("created_at", { ascending: false }),
  ]);

  const rows: SaasSubscriptionRow[] = ((subs as unknown as Array<
    Omit<SaasSubscriptionRow, "gym" | "plan"> & {
      gyms: SaasSubscriptionRow["gym"];
      saas_plans: SaasSubscriptionRow["plan"];
    }
  >) ?? []).map(({ gyms, saas_plans, ...rest }) => ({
    ...rest,
    gym: gyms,
    plan: saas_plans,
  }));

  return (
    <PlatformShell>
      <div className="p-4 pb-10 md:p-9 md:pb-14">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
                Plataforma
              </span>
              <span className="text-[11px] text-gray-400">·</span>
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandSecondary-500">
                Facturación
              </span>
            </div>
            <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
              Facturación y suscripciones
            </h1>
            <p className="mt-1 font-manrope text-xs text-gray-400">
              Estado de la suscripción SaaS de cada gimnasio y control de los
              registros self-service
            </p>
          </div>

          <Link
            href="/platform/subscriptions"
            className="flex items-center gap-2 rounded-xl bg-brandPrimary-700 px-4 py-2.5 shadow-md shadow-brandPrimary-700/20 transition hover:bg-brandPrimary-600"
          >
            <Layers size={16} className="text-white" />
            <span className="font-manrope text-xs font-bold text-white">
              Gestionar Planes SaaS
            </span>
            <ArrowRight size={14} className="text-white/80" />
          </Link>
        </div>

        <SignupToggle
          initialEnabled={settings?.self_service_signup_enabled === true}
        />

        <SaasSubscriptionsTable rows={rows} />
      </div>
    </PlatformShell>
  );
}
