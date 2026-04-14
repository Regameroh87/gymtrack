import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";

import { database } from "../../../../src/database";
import { exercises_base } from "../../../../src/database/schemas";
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import FilterChips from "../../../../src/components/FilterChips";
import { Plus, ChevronRight, Barbell } from "../../../../assets/icons";
import { brandPrimary, brandSecondary, ui } from "../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  function useExercises() {
    return useQuery({
      queryKey: ["exercises"],
      queryFn: async () => {
        return await database.select().from(exercises_base);
      },
    });
  }

  const { data: exercises, isLoading } = useExercises();

  const renderItem = ({ item }) => {
    console.log(item);
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        className="mx-5 mb-3 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center active:scale-[0.98]"
      >
        {/* Thumbnail */}
        <View className="w-14 h-14 rounded-xl overflow-hidden items-center justify-center ">
          {item.cloudinary_image_public_id || item.local_image_uri ? (
            <Image
              source={{
                uri: (() => {
                  const cloudinaryUrl = getCloudinaryUrl(
                    item.cloudinary_image_public_id
                  );
                  console.log("cloudinaryUrl", cloudinaryUrl);
                  if (cloudinaryUrl) return cloudinaryUrl;

                  if (item.local_image_uri) {
                    // Parche para iOS: extraemos la ruta relativa después de 'Documents/' o similar
                    // y la unimos al directorio actual de la aplicación.
                    const parts = item.local_image_uri.split("Documents/");
                    const relativePath =
                      parts.length > 1
                        ? parts[1]
                        : item.local_image_uri.split("/").pop();
                    return FileSystem.documentDirectory + relativePath;
                  }
                  return null;
                })(),
              }}
              width={"100%"}
              height={"100%"}
              contentFit="cover"
              transition={200}
              onLoad={(e) => console.log("Imagen cargada:", e.source.uri)}
              onError={(e) => console.log("Error cargando imagen:", e.error)}
            />
          ) : (
            <Barbell size={24} color={brandSecondary[500]} />
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

        <ChevronRight
          size={14}
          className="text-ui-text-muted dark:text-ui-text-mutedDark"
        />
      </Pressable>
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
