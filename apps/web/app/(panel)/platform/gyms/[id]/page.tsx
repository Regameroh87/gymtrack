// Detalle / edición de un gimnasio (panel de plataforma, solo super_admin). El
// gym y su dueño se resuelven en el servidor (cliente Supabase por request); el
// form es cliente (guardar, suspender, borrar). El borrado va por edge function.

// Next
import { redirect } from "next/navigation";

// Iconos
import { X } from "lucide-react";

// Sesión, Supabase y tipos
import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import { canAccessPlatformModule } from "@/lib/auth/roles";
import { type Gym, type GymOwner } from "@/lib/gyms";

// Shell y form
import { PlatformShell } from "@/components/platform/platform-shell";
import { EditGymForm } from "@/components/platform/edit-gym-form";

export default async function EditGymPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "gyms")) redirect("/dashboard");

  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: gym } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!gym) {
    return (
      <PlatformShell>
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-red-50">
            <X size={20} color="#dc2626" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-gray-900">
            No se pudo cargar el gimnasio
          </p>
          <p className="font-manrope text-xs text-gray-400">
            Es posible que ya no exista.
          </p>
        </div>
      </PlatformShell>
    );
  }

  // Dueño: lookup en profiles por owner_id (= user_id).
  let owner: GymOwner | null = null;
  if ((gym as Gym).owner_id) {
    const { data: ownerRow } = await supabase
      .from("profiles")
      .select("user_id, name, last_name, email")
      .eq("user_id", (gym as Gym).owner_id as string)
      .maybeSingle();
    owner = (ownerRow as GymOwner) ?? null;
  }

  return (
    <PlatformShell>
      <EditGymForm gym={gym as Gym} owner={owner} />
    </PlatformShell>
  );
}
