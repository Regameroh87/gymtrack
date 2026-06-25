"use client";

// Alta de equipo del gym. Port de apps/mobile admin/equipments/add.

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { AdminEquipmentForm } from "@/components/admin/admin-equipment-form";

export default function NewEquipmentPage() {
  const { gymId } = useActiveGym();
  return <AdminEquipmentForm gymId={gymId} initial={null} />;
}
