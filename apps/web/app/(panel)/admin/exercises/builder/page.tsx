"use client";

// Alta de ejercicio del gym. Port de apps/mobile admin/exercises/builder.jsx.

import { useActiveGym } from "@/components/auth/active-gym-provider";
import { AdminExerciseForm } from "@/components/admin/admin-exercise-form";

export default function NewExercisePage() {
  const { gymId } = useActiveGym();
  return <AdminExerciseForm gymId={gymId} initial={null} />;
}
