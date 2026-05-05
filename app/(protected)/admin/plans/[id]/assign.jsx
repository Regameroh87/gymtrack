// React Native
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Base de datos
import { database } from "../../../../../src/database";
import { plan_assignments } from "../../../../../src/database/schemas";
import { supabase } from "../../../../../src/database/supabase";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";

// Componentes
import Screen from "../../../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../../../src/theme/colors";

export default function AssignPlan() {
  const { id: planId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Alumnos (profiles donde is_admin = false)
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, last_name, email")
        .eq("is_admin", false)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Asignaciones actuales para este plan (local)
  const { data: assignedIds = new Set(), isLoading: loadingAssignments } =
    useQuery({
      queryKey: ["plan_assignments", planId],
      enabled: !!planId,
      queryFn: async () => {
        const rows = await database
          .select({ user_id: plan_assignments.user_id })
          .from(plan_assignments)
          .where(eq(plan_assignments.plan_id, planId));
        return new Set(rows.map((r) => r.user_id));
      },
      select: (data) => data,
    });

  const handleToggle = async (student) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isAssigned = assignedIds.has(student.id);

    if (isAssigned) {
      // Quitar asignación: marcar como deleted
      await database
        .update(plan_assignments)
        .set({ sync_status: "deleted" })
        .where(
          eq(plan_assignments.plan_id, planId) &&
            eq(plan_assignments.user_id, student.id)
        );
    } else {
      // Agregar asignación
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await database.insert(plan_assignments).values({
        id: Crypto.randomUUID(),
        plan_id: planId,
        user_id: student.id,
        assigned_by: session?.user?.id ?? null,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    queryClient.invalidateQueries({ queryKey: ["plan_assignments", planId] });
    checkNetInfoAndSync().catch(console.error);
  };

  const isLoading = loadingStudents || loadingAssignments;

  return (
    <Screen>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
          renderItem={({ item }) => {
            const isAssigned = assignedIds.has(item.id);
            return (
              <Pressable
                onPress={() => handleToggle(item)}
                className="mx-5 mb-2 flex-row items-center p-4 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-70"
              >
                {/* Avatar inicial */}
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor: isAssigned
                      ? brandPrimary[500] + "22"
                      : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Text
                    className="font-jakarta-bold text-[14px]"
                    style={{
                      color: isAssigned ? brandPrimary[500] : "#9ca3af",
                    }}
                  >
                    {item.name?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>

                {/* Nombre y email */}
                <View className="flex-1">
                  <Text className="font-manrope-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark">
                    {item.name ?? ""} {item.last_name ?? ""}
                  </Text>
                  <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                    {item.email ?? ""}
                  </Text>
                </View>

                {/* Toggle visual */}
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: isAssigned
                      ? brandPrimary[500] + "22"
                      : "transparent",
                    borderWidth: 1,
                    borderColor: isAssigned
                      ? brandPrimary[500]
                      : "rgba(0,0,0,0.12)",
                  }}
                >
                  <Text
                    className="text-[11px] font-manrope-semi"
                    style={{
                      color: isAssigned ? brandPrimary[500] : "#9ca3af",
                    }}
                  >
                    {isAssigned ? "Asignado" : "Sin asignar"}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-16 px-8">
              <Text className="font-manrope text-sm text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                No hay alumnos registrados todavía.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
