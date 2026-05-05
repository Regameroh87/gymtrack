// React Native
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";

// Librerías externas
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { count, eq } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Base de datos
import { database } from "../../../src/database";
import {
  plan_assignments,
  training_plan_days,
  training_plans,
} from "../../../src/database/schemas";
import { supabase } from "../../../src/database/supabase";

// Hooks
import { setActivePlan } from "../../../src/hooks/useActivePlan";
import { useAuth } from "../../../src/auth/lib/getSession";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import { CheckMail, Plus } from "../../../assets/icons";

const OBJECTIVE_ACCENT = {
  hipertrofia: "#6366f1",
  fuerza: "#ef4444",
  perdida_grasa: "#22c55e",
  resistencia: "#38bdf8",
  acondicionamiento: "#f59e0b",
  rehabilitacion: "#a855f7",
};

const ACTIVE_PLAN_KEY = "active_plan_id";

function PlanItem({ plan, isActive, onActivate, onEdit }) {
  const accent = OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1";

  return (
    <View
      className="mx-5 mb-3 p-4 rounded-2xl border bg-ui-surface-light dark:bg-ui-surface-dark"
      style={{ borderColor: isActive ? accent : "rgba(0,0,0,0.08)" }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text
            className="font-jakarta-semi text-[15px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {plan.name}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
            {plan.day_count ?? 0} {plan.day_count === 1 ? "día" : "días"}
          </Text>
        </View>

        {isActive ? (
          <View
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: accent + "22" }}
          >
            <CheckMail size={12} color={accent} />
            <Text
              className="text-[11px] font-manrope-semi ml-1"
              style={{ color: accent }}
            >
              Activo
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onActivate}
            className="px-3 py-1.5 rounded-full border active:opacity-70"
            style={{ borderColor: accent }}
          >
            <Text
              className="text-[11px] font-manrope-semi"
              style={{ color: accent }}
            >
              Activar
            </Text>
          </Pressable>
        )}
      </View>

      {onEdit && !isActive && (
        <Pressable
          onPress={onEdit}
          className="mt-3 pt-3 border-t border-ui-input-border active:opacity-70"
        >
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
            Editar →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function SelectPlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, user } = useAuth();

  // Plan activo actual
  const { data: activePlanId } = useQuery({
    queryKey: ["active_plan_id_raw"],
    queryFn: () => AsyncStorage.getItem(ACTIVE_PLAN_KEY),
  });

  // Planes personales del alumno
  const { data: personalPlans = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ["training_plans", "personal", userId],
    enabled: !!userId,
    queryFn: () =>
      database
        .select({
          id: training_plans.id,
          name: training_plans.name,
          objective: training_plans.objective,
          level: training_plans.level,
          status: training_plans.status,
          day_count: count(training_plan_days.id),
        })
        .from(training_plans)
        .leftJoin(
          training_plan_days,
          eq(training_plans.id, training_plan_days.plan_id)
        )
        .where(eq(training_plans.owner_user_id, userId))
        .groupBy(training_plans.id),
  });

  // Plantillas asignadas al alumno (referencia — via plan_assignments)
  const { data: assignedPlans = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ["assigned_plans", userId],
    enabled: !!userId,
    queryFn: async () => {
      const assignments = await database
        .select({ plan_id: plan_assignments.plan_id })
        .from(plan_assignments)
        .where(eq(plan_assignments.user_id, userId));

      if (assignments.length === 0) return [];

      const planIds = assignments.map((a) => a.plan_id);

      // Fetch cada plan individualmente (SQLite no tiene IN array en drizzle fácilmente sin inArray)
      const results = [];
      for (const planId of planIds) {
        const [plan] = await database
          .select({
            id: training_plans.id,
            name: training_plans.name,
            objective: training_plans.objective,
            level: training_plans.level,
            status: training_plans.status,
            day_count: count(training_plan_days.id),
          })
          .from(training_plans)
          .leftJoin(
            training_plan_days,
            eq(training_plans.id, training_plan_days.plan_id)
          )
          .where(eq(training_plans.id, planId))
          .groupBy(training_plans.id);
        if (plan) results.push(plan);
      }
      return results;
    },
  });

  const handleActivate = async (planId) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setActivePlan({ planId, userId, queryClient });
    queryClient.invalidateQueries({ queryKey: ["active_plan_id_raw"] });
    router.back();
  };

  const isLoading = loadingPersonal || loadingAssigned;

  const sections = [
    ...(assignedPlans.length > 0
      ? [{ title: "Asignados por tu entrenador", data: assignedPlans, type: "assigned" }]
      : []),
    ...(personalPlans.length > 0
      ? [{ title: "Mis planes personales", data: personalPlans, type: "personal" }]
      : []),
  ];

  return (
    <Screen>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
          renderSectionHeader={({ section }) => (
            <Text className="px-5 mb-2 mt-4 text-[10px] font-jakarta-semi uppercase tracking-widest text-brandPrimary-500 dark:text-brandPrimary-400">
              {section.title}
            </Text>
          )}
          renderItem={({ item, section }) => (
            <PlanItem
              plan={item}
              isActive={activePlanId === item.id}
              onActivate={() => handleActivate(item.id)}
              onEdit={
                section.type === "personal"
                  ? () => router.push(`/rutinas/builder?id=${item.id}`)
                  : null
              }
            />
          )}
          ListEmptyComponent={
            <View className="mx-5 mt-4 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
              <Text className="font-jakarta text-lg text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
                Sin planes disponibles
              </Text>
              <Text className="font-manrope text-[13px] text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
                Tu entrenador todavía no te asignó ningún plan. Podés crear uno propio.
              </Text>
            </View>
          }
          ListFooterComponent={
            <Pressable
              onPress={() => router.push("/rutinas/builder")}
              className="mx-5 mt-4 active:scale-[0.98]"
            >
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <Plus size={18} color="white" />
                <Text className="text-white font-jakarta-semi text-sm ml-2">
                  Crear mi plan
                </Text>
              </LinearGradient>
            </Pressable>
          }
        />
      )}
    </Screen>
  );
}
