"use client";

// Edición de actividad del gym (datos + pases + borrar). Port de apps/mobile
// admin/activities/edit/[id].

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import {
  AdminActivityForm,
  type ActivityInitial,
} from "@/components/admin/admin-activity-form";

export default function EditActivityPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { gymId } = useActiveGym();

  const { data: item, isLoading } = useQuery({
    queryKey: ["activity", id],
    enabled: !!id,
    queryFn: async (): Promise<ActivityInitial | null> => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("activities")
        .select("id, name, description, color, coach_id, is_active")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as ActivityInitial) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No se encontró la actividad.
        </p>
      </div>
    );
  }

  return <AdminActivityForm gymId={gymId} initial={item} />;
}
