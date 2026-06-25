"use client";

// Edición de ejercicio del gym. Port de apps/mobile admin/exercises/[id].jsx.

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAdminExercise } from "@/lib/hooks/use-admin-exercises";
import { AdminExerciseForm } from "@/components/admin/admin-exercise-form";

export default function EditExercisePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const { gymId } = useActiveGym();
  const { data: exercise, isLoading } = useAdminExercise(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No se encontró el ejercicio.
        </p>
      </div>
    );
  }

  return <AdminExerciseForm gymId={gymId} initial={exercise} />;
}
