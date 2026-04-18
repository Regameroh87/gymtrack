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
import * as FileSystem from "expo-file-system/legacy";
import Toast from "react-native-toast-message";

import { database } from "../../../../src/database";
import { equipment } from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import { Plus, Barbell, Trash, Pencil } from "../../../../assets/icons";
import { brandPrimary, brandSecondary, ui } from "../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";
import { eq } from "drizzle-orm";

export default function EquipmentsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: equipments, isLoading } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      const results = await database
        .select()
        .from(equipment)
        .where(eq(equipment.sync_status, "synced"))
        .execute();
      // También podríamos querer mostrar los pending/dirty
      const allResults = await database.select().from(equipment).execute();
      return allResults.filter((eq) => eq.sync_status !== "deleted");
    },
  });

  const handleDelete = (item) => {
    Alert.alert(
      "Eliminar máquina",
      `¿Estás seguro que deseas eliminar "${item.name}"? Los ejercicios que la utilicen perderán esta referencia.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Soft delete: actualizar el sync_status a 'deleted'
              await database
                .update(equipment)
                .set({ sync_status: "deleted" })
                .where(eq(equipment.id, item.id));

              queryClient.invalidateQueries(["equipments"]);
              checkNetInfoAndSync(); // Sube el cambio y dispara el borrado en Supabase y Cloudinary

              Toast.show({
                type: "success",
                text1: "Equipo eliminado",
                text2: "Se eliminará también en la nube en unos segundos.",
                position: "bottom",
              });
            } catch (error) {
              console.error("Error al borrar el equipo:", error);
            }
          },
        },
      ]
    );
  };

  const filteredEquipments =
    equipments?.filter((eq) =>
      eq.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const renderItem = ({ item }) => {
    return (
      <View className="mx-5 mb-3 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center">
        {/* Thumbnail */}
        <View className="w-14 h-14 rounded-xl overflow-hidden items-center justify-center bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark">
          {item.cloudinary_image_public_id || item.local_image_uri ? (
            <Image
              source={{
                uri: (() => {
                  const cloudinaryUrl = getCloudinaryUrl(
                    item.cloudinary_image_public_id
                  );
                  if (cloudinaryUrl) return cloudinaryUrl;

                  if (item.local_image_uri) {
                    const parts = item.local_image_uri.split("gymtrack/media/");
                    const relativePath =
                      parts.length > 1
                        ? parts[1]
                        : item.local_image_uri.split("/").pop();
                    return `${FileSystem.documentDirectory}gymtrack/media/${relativePath}`;
                  }
                  return null;
                })(),
              }}
              width={"100%"}
              height={"100%"}
              contentFit="cover"
              transition={200}
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
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1">
            {item.sync_status === "pending" ? "Sincronizando..." : "Conectado"}
          </Text>
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-2 ml-2">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/admin/equipments/edit/${item.id}`);
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
        data={filteredEquipments}
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
                Inventario
              </Text>
              <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
                Equipamiento
              </Text>
            </View>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar máquina o accesorio..."
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
                  : "Comienza inventariando tu primer máquina o equipo."}
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
            router.push("/admin/equipments/add");
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
