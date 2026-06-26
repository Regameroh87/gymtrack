"use client";

// Edición de sesión del gym. Port de apps/mobile admin/sessions/[id].jsx + builder.

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAdminSession } from "@/lib/hooks/use-admin-sessions";
import { AdminSessionForm } from "@/components/admin/admin-session-form";

export default function EditSessionPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { gymId } = useActiveGym();
  const { data: session, isLoading } = useAdminSession(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No se encontró la sesión.
        </p>
      </div>
    );
  }

  return <AdminSessionForm gymId={gymId} initial={session} />;
}
