// React Native
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Base de datos
import { database } from "../../../../src/database";
import {
  sessions,
  training_plan_days,
  training_plans,
} from "../../../../src/database/schemas";
import { supabase } from "../../../../src/database/supabase";

// Hooks
import { useRecordById } from "../../../../src/hooks/useRecordById";

// Componentes
import Screen from "../../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";
import { Pencil, Trash, Users } from "../../../../assets/icons";

const OBJECTIVE_ACCENT = {
  hipertrofia: "#6366f1",
  fuerza: "#ef4444",
  perdida_grasa: "#22c55e",
  resistencia: "#38bdf8",
  acondicionamiento: "#f59e0b",
  rehabilitacion: "#a855f7",
};

export default function PlanDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useRecordById(
    "training_plan",
    training_plans,
    id
  );

  const { data: days = [] } = useQuery({
    queryKey: ["training_plan", id, "days"],
    enabled: !!id,
    queryFn: () =>
      database
        .select({
          id: training_plan_days.id,
          day_number: training_plan_days.day_number,
          session_id: training_plan_days.session_id,
          session_name: sessions.name,
          session_objective: sessions.objective,
        })
        .from(training_plan_days)
        .innerJoin(sessions, eq(training_plan_days.session_id, sessions.id))
        .where(eq(training_plan_days.plan_id, id))
        .orderBy(asc(training_plan_days.day_number)),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["plan_assignments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_assignments")
        .select("*, profiles(id, name, last_name, email)")
        .eq("plan_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleDelete = () => {
    Alert.alert(
      "Eliminar plantilla",
      "¿Estás seguro? Se eliminará el plan y sus días asignados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await database
              .update(training_plans)
              .set({ sync_status: "deleted" })
              .where(eq(training_plans.id, id));
            queryClient.invalidateQueries({ queryKey: ["training_plans"] });
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || !plan) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  const accent = OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-5 flex-row items-start justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
              {plan.name}
            </Text>
            {plan.description ? (
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1 leading-5">
                {plan.description}
              </Text>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/admin/plans/builder?id=${id}`);
              }}
              className="p-2.5 rounded-xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:opacity-70"
            >
              <Pencil size={18} color={brandPrimary[500]} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 active:opacity-70"
            >
              <Trash size={18} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* ── Días ── */}
        <View className="px-5 mb-8">
          <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
            Días del plan · {days.length}
          </Text>

          {days.length === 0 ? (
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark italic">
              Sin días configurados.
            </Text>
          ) : (
            days.map((day) => {
              const dayAccent =
                OBJECTIVE_ACCENT[day.routine_objective] ?? "#6366f1";
              return (
                <View
                  key={day.id}
                  className="mb-2.5 flex-row items-center p-3 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark"
                >
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                    style={{ backgroundColor: dayAccent + "22" }}
                  >
                    <Text
                      className="text-[10px] font-manrope-semi"
                      style={{ color: dayAccent }}
                    >
                      Día
                    </Text>
                    <Text
                      className="text-[13px] font-jakarta-bold leading-tight"
                      style={{ color: dayAccent }}
                    >
                      {day.day_number}
                    </Text>
                  </View>
                  <Text
                    className="flex-1 font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
                    numberOfLines={1}
                  >
                    {day.routine_name}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* ── Alumnos asignados ── */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-brandPrimary-500 dark:text-brandPrimary-400">
              Alumnos asignados · {assignments.length}
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/admin/plans/${id}/assign`);
              }}
              className="flex-row items-center gap-1.5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border px-3 py-2 rounded-xl active:opacity-70"
            >
              <Users size={14} color={brandPrimary[500]} />
              <Text className="text-xs font-manrope-semi text-brandPrimary-500 dark:text-brandPrimary-400">
                Gestionar
              </Text>
            </Pressable>
          </View>

          {assignments.length === 0 ? (
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark italic">
              Ningún alumno tiene asignada esta plantilla aún.
            </Text>
          ) : (
            assignments.map((a) => (
              <View
                key={a.id}
                className="mb-2 flex-row items-center p-3 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark"
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: accent + "22" }}
                >
                  <Text
                    className="font-jakarta-bold text-[13px]"
                    style={{ color: accent }}
                  >
                    {a.profiles?.name?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View>
                  <Text className="font-manrope-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark">
                    {a.profiles?.name ?? ""} {a.profiles?.last_name ?? ""}
                  </Text>
                  <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                    {a.profiles?.email ?? ""}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
