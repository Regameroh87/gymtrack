"use client";

// Edición de equipo del gym. Port de apps/mobile admin/equipments/edit/[id].

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAdminEquipmentItem } from "@/lib/hooks/use-admin-equipment";
import { AdminEquipmentForm } from "@/components/admin/admin-equipment-form";

export default function EditEquipmentPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { gymId } = useActiveGym();
  const { data: equipment, isLoading } = useAdminEquipmentItem(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No se encontró la máquina.
        </p>
      </div>
    );
  }

  return <AdminEquipmentForm gymId={gymId} initial={equipment} />;
}
