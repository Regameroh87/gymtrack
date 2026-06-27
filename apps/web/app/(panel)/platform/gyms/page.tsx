// Lista de gimnasios (panel de plataforma, solo super_admin). Data fetch en el
// servidor (cliente Supabase por request): gyms + sus dueños (profiles), porque
// PostgREST no puede joinear gyms→profiles directo (la FK apunta a auth.users).

// Next
import Link from "next/link";
import { redirect } from "next/navigation";

// Iconos
import { Plus } from "lucide-react";

// Sesión, Supabase y tipos
import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import { type Gym, type GymOwner } from "@/lib/gyms";

// Shell y lista
import { PlatformShell } from "@/components/platform/platform-shell";
import { GymsList, type GymWithOwner } from "@/components/platform/gyms-list";

export default async function GymsPage() {
  const ctx = await getSessionContext();
  if (!ctx.isSuperAdmin) redirect("/dashboard");

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("gyms")
    .select("*")
    .order("created_at", { ascending: false });

  const gyms = (data as Gym[]) ?? [];

  // Dueños: lookup en profiles por owner_id (= user_id).
  const ownerIds = [...new Set(gyms.map((g) => g.owner_id).filter(Boolean))];
  let ownersByUserId: Record<string, GymOwner> = {};
  if (ownerIds.length) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("user_id, name, last_name, email")
      .in("user_id", ownerIds as string[]);
    ownersByUserId = Object.fromEntries(
      ((owners as GymOwner[]) ?? []).map((o) => [o.user_id, o])
    );
  }

  const rows: GymWithOwner[] = gyms.map((g) => ({
    ...g,
    owner: g.owner_id ? (ownersByUserId[g.owner_id] ?? null) : null,
  }));

  return (
    <PlatformShell>
      <div className="p-4 pb-10 md:p-9 md:pb-14">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
                Plataforma
              </span>
              <span className="text-[11px] text-gray-400">·</span>
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandSecondary-500">
                Gimnasios
              </span>
            </div>
            <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
              Gimnasios
            </h1>
            <p className="mt-1 font-manrope text-xs text-gray-400">
              Gestión de los gimnasios de la plataforma (solo super admin)
            </p>
          </div>

          <Link
            href="/platform/gyms/new"
            className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-700 px-4 py-2.5 shadow-md shadow-brandPrimary-700/30 transition hover:bg-brandPrimary-600"
          >
            <Plus size={15} color="#fff" />
            <span className="font-manrope text-[13px] font-bold text-white">
              Crear gimnasio
            </span>
          </Link>
        </div>

        <GymsList gyms={rows} />
      </div>
    </PlatformShell>
  );
}
