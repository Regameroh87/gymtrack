"use client";

// Alta de plan del gym. Port de apps/mobile admin/plans/builder.

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { AdminPlanForm } from "@/components/admin/admin-plan-form";

export default function NewPlanPage() {
  const { gymId } = useActiveGym();
  return <AdminPlanForm gymId={gymId} initial={null} />;
}
