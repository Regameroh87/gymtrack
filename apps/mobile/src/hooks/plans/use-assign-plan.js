// React Native
import { Alert } from "react-native";

// React / libs
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eq, and } from "drizzle-orm";
import * as Crypto from "expo-crypto";

// DB
import { database } from "../../database";
import { plan_assignments } from "../../database/schemas";
import { checkNetInfoAndSync } from "../../database/sync";

// Hooks
import { useAuth } from "../../auth/lib/getSession";
import { useActiveGym } from "../../contexts/active-gym-context";

const todayDate = () => new Date().toISOString().split("T")[0];

// onSuccess compartido: refresca la query y dispara el sync offline-first.
// onError compartido: superficie el fallo (antes se tragaba con mutate) para que
// nunca falle en silencio y el usuario pueda reintentar.
const usePlanAssignmentMutation = (mutationFn) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
      checkNetInfoAndSync();
    },
    onError: () => {
      Alert.alert(
        "No se pudo iniciar el plan",
        "Intentá de nuevo en unos segundos."
      );
    },
  });
};

export const useAssignPlan = () => {
  const { userId } = useAuth();
  const { gymId } = useActiveGym();

  return usePlanAssignmentMutation(async ({ planId }) => {
    // Guard: user_id/gym_id son NOT NULL. Si los contextos (perfil / gym activo)
    // aún no resolvieron, un insert con undefined crashea en silencio; fallamos
    // controlado para no insertar filas corruptas.
    if (!userId || !gymId) {
      throw new Error("Perfil o gimnasio todavía no está listo");
    }

    const today = todayDate();

    // Cerrar en un solo UPDATE cualquier asignación activa previa
    await database
      .update(plan_assignments)
      .set({
        status: "completed",
        end_date: today,
        updated_at: new Date().toISOString(),
        sync_status: "dirty",
      })
      .where(
        and(
          eq(plan_assignments.user_id, userId),
          eq(plan_assignments.status, "active")
        )
      );

    // Insertar nueva asignación (created_at/updated_at se autocompletan)
    const newId = Crypto.randomUUID();
    await database.insert(plan_assignments).values({
      id: newId,
      plan_id: planId,
      user_id: userId,
      assigned_by: userId,
      gym_id: gymId,
      start_date: today,
      status: "active",
      sync_status: "pending",
    });

    return newId;
  });
};

export const useDropPlan = () => {
  const { userId } = useAuth();

  return usePlanAssignmentMutation(async ({ assignmentId }) => {
    if (!userId) {
      throw new Error("Perfil todavía no está listo");
    }

    await database
      .update(plan_assignments)
      .set({
        status: "dropped",
        end_date: todayDate(),
        updated_at: new Date().toISOString(),
        sync_status: "dirty",
      })
      .where(
        and(
          eq(plan_assignments.id, assignmentId),
          eq(plan_assignments.user_id, userId)
        )
      );
  });
};
