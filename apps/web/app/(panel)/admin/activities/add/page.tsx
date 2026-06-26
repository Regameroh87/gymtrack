"use client";

// Alta de actividad del gym. Port de apps/mobile admin/activities/add.

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { AdminActivityForm } from "@/components/admin/admin-activity-form";

export default function NewActivityPage() {
  const { gymId } = useActiveGym();
  return <AdminActivityForm gymId={gymId} initial={null} />;
}
