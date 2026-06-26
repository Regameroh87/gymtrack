"use client";

// Edición / ficha de plan del gym. Port de apps/mobile admin/plans/[id].

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAdminPlanDetail } from "@/lib/hooks/use-admin-plans";
import { AdminPlanForm } from "@/components/admin/admin-plan-form";

export default function EditPlanPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { gymId } = useActiveGym();
  const { data: plan, isLoading } = useAdminPlanDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No se encontró el plan.
        </p>
      </div>
    );
  }

  return <AdminPlanForm gymId={gymId} initial={plan} />;
}
