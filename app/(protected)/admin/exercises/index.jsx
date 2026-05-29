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
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "../../../../src/database";
import {
  exercises_base,
  exercise_equipment,
} from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";

// Hooks
import { useExercises } from "../../../../src/hooks/exercises/use-exercises";

// Componentes
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import ExerciseDetailSheet from "../../../../src/components/sheets/ExerciseDetailSheet";
import ButtonAdd from "../../../../src/components/buttons/ButtonAdd";

// Assets e iconos
import { Barbell, ChevronRight } from "../../../../assets/icons";

// Tema y utilidades
import { brandPrimary, brandSecondary, ui } from "../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";
import { searchByQuery } from "../../../../src/utils/searchByQuery";

export default function ExercisesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
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

  const handleDelete = (item) => {
    Alert.alert(
      "Eliminar Ejercicio",
      `¿Estás seguro que deseas eliminar "${item.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await database
                .update(exercises_base)
                .set({ sync_status: "deleted" })
                .where(eq(exercises_base.id, item.id));
              await database
                .update(exercise_equipment)
                .set({ sync_status: "deleted" })
                .where(eq(exercise_equipment.exercise_id, item.id));
              queryClient.invalidateQueries(["exercises"]);
              queryClient.invalidateQueries(["exercise_equipment"]);
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
      ]
    );
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
