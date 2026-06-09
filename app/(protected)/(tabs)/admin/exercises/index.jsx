// React
import React, { useState, useRef, useMemo } from "react";

// React Native
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

// Librerías externas
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { eq, inArray } from "drizzle-orm";

// Base de datos
import { database } from "../../../../../src/database";
import {
  exercises_base,
  exercise_equipment,
  session_exercises,
  plan_week_day_exercises,
} from "../../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";
import { supabase } from "../../../../../src/database/supabase";
import {
  planIdsUsingSessionExercises,
  recomputePlanPublishState,
} from "../../../../../src/hooks/plans/plan-publish";

// Hooks
import { useExercises } from "../../../../../src/hooks/exercises/use-exercises";

// Componentes
import Screen from "../../../../../src/components/Screen";
import SearchBar from "../../../../../src/components/SearchBar";
import ExerciseDetailSheet from "../../../../../src/components/sheets/ExerciseDetailSheet";
import ButtonAdd from "../../../../../src/components/buttons/ButtonAdd";

// Assets e iconos
import { Barbell, ChevronRight } from "../../../../../assets/icons";

// Tema y utilidades
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";
import { searchByQuery } from "../../../../../src/utils/searchByQuery";

export default function ExercisesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { brandPrimary, brandSecondary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const detailSheetRef = useRef(null);

  const { data: exercises, isLoading } = useExercises();

  const filteredExercises = useMemo(
    () =>
      searchByQuery({
        query: search,
        options: exercises,
        tag: "name",
      }),
    [search, exercises]
  );

  const handleDelete = async (item) => {
    // Historial de series registrado por los usuarios para este ejercicio.
    // Es data por-usuario; consultamos el total remoto para avisar al admin.
    let logsCount = 0;
    try {
      const { count } = await supabase
        .from("session_set_logs")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", item.id)
        .is("deleted_at", null);
      logsCount = count ?? 0;
    } catch (err) {
      console.error("No se pudo verificar el historial del ejercicio:", err);
    }

    const message =
      logsCount > 0
        ? `"${item.name}" tiene ${logsCount} serie(s) registrada(s) en el historial de entrenamientos. Si lo eliminás, ese historial se borrará y el ejercicio se quitará de las sesiones que lo usan. ¿Continuar?`
        : `¿Estás seguro que deseas eliminar "${item.name}"? También se quitará de las sesiones que lo usen.`;

    Alert.alert("Eliminar Ejercicio", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            // Capturar session_exercise IDs antes de la txn para resolver planes afectados
            const sessionExerciseIdsForPlans = (
              await database
                .select({ id: session_exercises.id })
                .from(session_exercises)
                .where(eq(session_exercises.exercise_id, item.id))
            ).map((r) => r.id);
            const affectedPlanIds = await planIdsUsingSessionExercises(
              sessionExerciseIdsForPlans
            );

            await database.transaction(async (tx) => {
              const now = new Date().toISOString();

              // session_exercises que referencian este ejercicio
              const sessionExerciseIds = (
                await tx
                  .select({ id: session_exercises.id })
                  .from(session_exercises)
                  .where(eq(session_exercises.exercise_id, item.id))
              ).map((r) => r.id);

              // Cascade local: plan_week_day_exercises que dependen de esos
              // session_exercises y los propios session_exercises.
              if (sessionExerciseIds.length) {
                await tx
                  .update(plan_week_day_exercises)
                  .set({ sync_status: "deleted", updated_at: now })
                  .where(
                    inArray(
                      plan_week_day_exercises.session_exercise_id,
                      sessionExerciseIds
                    )
                  );
                await tx
                  .update(session_exercises)
                  .set({ sync_status: "deleted", updated_at: now })
                  .where(inArray(session_exercises.id, sessionExerciseIds));
              }

              await tx
                .update(exercise_equipment)
                .set({ sync_status: "deleted", updated_at: now })
                .where(eq(exercise_equipment.exercise_id, item.id));

              await tx
                .update(exercises_base)
                .set({ sync_status: "deleted", updated_at: now })
                .where(eq(exercises_base.id, item.id));
            });

            await recomputePlanPublishState(affectedPlanIds);

            queryClient.invalidateQueries({ queryKey: ["exercises"] });
            queryClient.invalidateQueries({ queryKey: ["exercise_equipment"] });
            queryClient.invalidateQueries({ queryKey: ["sessions"] });
            queryClient.invalidateQueries({ queryKey: ["session"] });
            queryClient.invalidateQueries({ queryKey: ["session_exercises"] });
            queryClient.invalidateQueries({ queryKey: ["training_plans"] });

            // Refrescar el detalle de cada plan afectado: header (is_published) y rutina.
            for (const planId of affectedPlanIds) {
              queryClient.invalidateQueries({
                queryKey: ["training_plan", planId],
              });
              queryClient.invalidateQueries({
                queryKey: ["plan_detail_weeks", planId],
              });
            }

            checkNetInfoAndSync();

            Toast.show({
              type: "success",
              text1: "Ejercicio eliminado",
              text2: "Se eliminará también en la nube en unos segundos.",
              position: "bottom",
            });
          } catch (error) {
            console.error("Error al borrar el ejercicio:", error);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedExercise(item);
          detailSheetRef.current?.present();
        }}
        className="mx-5 mb-3 active:scale-[0.98]"
      >
        <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center">
          {/* Thumbnail */}
          <View className="w-14 h-14 rounded-xl overflow-hidden items-center justify-center">
            {item.image_uri ? (
              <Image
                source={{
                  uri: getCloudinaryUrl(item.image_uri) ?? `${item.image_uri}`,
                }}
                width={"100%"}
                height={"100%"}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View className="bg-brandSecondary-200/10 items-center justify-center w-full h-full">
                <Barbell size={24} color={brandSecondary[500]} />
              </View>
            )}
          </View>

          {/* Info */}
          <View className="flex-1 ml-3">
            <Text
              className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View className="flex-row items-center mt-1">
              <View className="px-1.5 py-0.5 rounded mr-2 bg-brandSecondary-100 dark:bg-brandSecondary-900">
                <Text className="text-[9px] font-jakarta-semi uppercase text-brandSecondary-700 dark:text-brandSecondary-300">
                  {item.muscle_group || "General"}
                </Text>
              </View>
              <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                {item.category || ""}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <ChevronRight size={16} color={ui.text.muted} />
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="px-6 mb-4">
              <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandSecondary-500 dark:text-brandSecondary-400">
                Catálogo Maestro
              </Text>
              <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
                Ejercicios
              </Text>
            </View>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar ejercicio..."
            />
          </>
        }
        ListEmptyComponent={
          !isLoading && (
            <View className="items-center pt-20 px-10">
              <Barbell size={48} color={ui.text.muted} />
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mt-4">
                {search
                  ? "Sin resultados."
                  : "Comienza agregando tu primer ejercicio."}
              </Text>
            </View>
          )
        }
      />

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-ui-background-light/50 dark:bg-ui-background-dark/50">
          <ActivityIndicator size="large" color={brandPrimary[600]} />
        </View>
      )}

      <ButtonAdd route="/admin/exercises/builder" />

      <ExerciseDetailSheet
        sheetRef={detailSheetRef}
        exercise={selectedExercise}
        onEdit={(item) => router.push(`/admin/exercises/${item.id}`)}
        onDelete={handleDelete}
      />
    </Screen>
  );
}
