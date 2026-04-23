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
import Toast from "react-native-toast-message";

import { database } from "../../../../src/database";
import {
  equipment,
  exercise_equipment,
} from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";
import * as Haptics from "expo-haptics";
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import ButtonAdd from "../../../../src/components/buttons/ButtonAdd";
import { Barbell, Trash, Pencil } from "../../../../assets/icons";
import { brandPrimary, brandSecondary, ui } from "../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";
import { eq, ne } from "drizzle-orm";

export default function EquipmentsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: equipments, isLoading } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      // Obtenemos todos los equipos excepto los que están marcados para borrar
      const results = await database
        .select()
        .from(equipment)
        .where(ne(equipment.sync_status, "deleted"))
        .execute();
      return results;
    },
    staleTime: Infinity,
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

              // También marcamos como 'deleted' todas las relaciones en exercise_equipment
              await database
                .update(exercise_equipment)
                .set({ sync_status: "deleted" })
                .where(eq(exercise_equipment.equipment_id, item.id));

              queryClient.invalidateQueries({ queryKey: ["equipments"] });
              queryClient.invalidateQueries({ queryKey: ["exercise_equipment"] });
              checkNetInfoAndSync()
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ["equipments"] });
                })
                .catch((err) => console.error("Sync failed", err));

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
      <ButtonAdd route="/admin/equipments/add" />
    </Screen>
  );
}
