// Alta de gimnasio (panel de plataforma, solo super_admin). El listado de
// candidatos a dueño se resuelve en el servidor (cliente Supabase por request);
// el form es cliente porque sube logos a Cloudinary e invoca la edge function.

// Next
import { redirect } from "next/navigation";

// Sesión, Supabase y tipos
import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import { type OwnerCandidate } from "@/lib/gyms";

// Shell y form
import { PlatformShell } from "@/components/platform/platform-shell";
import { NewGymForm } from "@/components/platform/new-gym-form";

export default async function NewGymPage() {
  const ctx = await getSessionContext();
  if (!ctx.isSuperAdmin) redirect("/dashboard");

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, name, last_name, email")
    .order("name", { ascending: true });

  const owners = (data as OwnerCandidate[]) ?? [];

  return (
    <PlatformShell>
      <NewGymForm owners={owners} />
    </PlatformShell>
  );
}
