// React Native
import { useMemo } from "react";
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
import { asc, eq, inArray } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Base de datos
import { database } from "../../../../src/database";
import {
  exercises_base,
  session_exercises,
  sessions,
  training_plan_days,
  training_plans,
} from "../../../../src/database/schemas";

// Hooks
import { useRecordById } from "../../../../src/hooks/useRecordById";

// Componentes
import Screen from "../../../../src/components/Screen";
import SessionExerciseRow from "../../../../src/components/cards/SessionExerciseRow";

// Constantes
import { SESSION_OBJECTIVES } from "../../../../src/constants/sessionOptions";

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

const OBJECTIVE_LABELS = Object.fromEntries(
  SESSION_OBJECTIVES.map((o) => [o.value, o.label])
);

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
        })
        .from(training_plan_days)
        .innerJoin(sessions, eq(training_plan_days.session_id, sessions.id))
        .where(eq(training_plan_days.plan_id, id))
        .orderBy(asc(training_plan_days.day_number)),
  });

  const sessionIds = useMemo(
    () => Array.from(new Set(days.map((d) => d.session_id))),
    [days]
  );

  const { data: exercisesBySession = {} } = useQuery({
    queryKey: ["training_plan", id, "session_exercises", sessionIds],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const rows = await database
        .select({
          id: session_exercises.id,
          session_id: session_exercises.session_id,
          position: session_exercises.position,
          exercise_name: exercises_base.name,
          image_uri: exercises_base.image_uri,
          video_uri: exercises_base.video_uri,
          youtube_video_url: exercises_base.youtube_video_url,
        })
        .from(session_exercises)
        .innerJoin(
          exercises_base,
          eq(session_exercises.exercise_id, exercises_base.id)
        )
        .where(inArray(session_exercises.session_id, sessionIds))
        .orderBy(asc(session_exercises.position));

      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.session_id]) grouped[row.session_id] = [];
        grouped[row.session_id].push(row);
      }
      return grouped;
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
            {OBJECTIVE_LABELS[plan.objective] ? (
              <View className="mt-2 self-start">
                <View
                  className="rounded-full border-[0.5px] px-2.5 py-1"
                  style={{
                    backgroundColor:
                      (OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1") + "22",
                    borderColor:
                      (OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1") + "55",
                  }}
                >
                  <Text
                    className="font-manrope-semi text-[11px]"
                    style={{
                      color: OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1",
                    }}
                  >
                    {OBJECTIVE_LABELS[plan.objective]}
                  </Text>
                </View>
              </View>
            ) : null}
            {plan.description ? (
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-2 leading-5">
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
              const dayAccent = OBJECTIVE_ACCENT[plan.objective] ?? "#6366f1";
              const dayExercises = exercisesBySession[day.session_id] ?? [];
              return (
                <View
                  key={day.id}
                  className="mb-3 p-3 rounded-xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark"
                >
                  <View className="flex-row items-center">
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
                    <View className="flex-1">
                      <Text
                        className="font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
                        numberOfLines={1}
                      >
                        {day.session_name}
                      </Text>
                      <Text
                        className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
                        numberOfLines={1}
                      >
                        {dayExercises.length > 0
                          ? `${dayExercises.length} ejercicios`
                          : "Sin ejercicios"}
                      </Text>
                    </View>
                  </View>

                  {dayExercises.length > 0 && (
                    <View className="mt-3" style={{ gap: 6 }}>
                      {dayExercises.map((ex, idx) => (
                        <SessionExerciseRow
                          key={ex.id}
                          exercise={ex}
                          position={idx + 1}
                          accent={dayAccent}
                          compact
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
