import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { database } from "../../../../src/database";
import {
  exercises_base,
  exercise_equipment,
} from "../../../../src/database/schemas";
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import FilterChips from "../../../../src/components/FilterChips";
import { Plus, Barbell, Pencil, Trash } from "../../../../assets/icons";
import { brandPrimary, brandSecondary, ui } from "../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";
import { checkNetInfoAndSync } from "../../../../src/database/sync";
import Toast from "react-native-toast-message";
import { eq } from "drizzle-orm";

const CATEGORY_FILTERS = [
  "Todos",
  "Fuerza",
  "Cardio",
  "Flexibilidad",
  "Potencia",
];

export default function ExercisesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  function useExercises() {
    return useQuery({
      queryKey: ["exercises"],
      queryFn: async () => {
        const results = await database.select().from(exercises_base).execute();
        return results.filter((ex) => ex.sync_status !== "deleted");
      },
    });
  }

  const { data: exercises, isLoading } = useExercises();

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
      <View className="mx-5 mb-3 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center">
        {/* Thumbnail */}
        <View className="w-14 h-14 rounded-xl overflow-hidden items-center justify-center ">
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
            <View className=" bg-brandSecondary-200/10 items-center justify-center w-full h-full">
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
              {item.equipment || "Peso libre"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-2 ml-2">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/admin/exercises/edit/${item.id}`);
            }}
            className="p-3 bg-brandPrimary-100 dark:bg-brandPrimary-900/30 rounded-xl active:scale-95"
          >
            <Pencil
              size={16}
              className="text-brandPrimary-500"
              color="#3b82f6"
            />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              handleDelete(item);
            }}
            className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl active:scale-95"
          >
            <Trash size={16} className="text-red-500" color="#ef4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <FlatList
        data={exercises}
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
            <FilterChips
              options={CATEGORY_FILTERS}
              selected={filter}
              onSelect={setFilter}
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

      {/* FAB */}
      <View
        className="absolute bottom-0 right-0 pr-5"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push("/admin/exercises/add");
          }}
          className="active:scale-95"
        >
          <LinearGradient
            colors={[brandSecondary[500], brandSecondary[400]]}
            className="w-14 h-14 rounded-2xl items-center justify-center shadow-xl shadow-brandSecondary-600/30"
          >
            <Plus size={28} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}
