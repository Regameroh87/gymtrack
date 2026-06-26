"use client";

// Alta de sesión del gym. Port de apps/mobile admin/sessions/builder.jsx.

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { AdminSessionForm } from "@/components/admin/admin-session-form";

export default function NewSessionPage() {
  const { gymId } = useActiveGym();
  return <AdminSessionForm gymId={gymId} initial={null} />;
}
