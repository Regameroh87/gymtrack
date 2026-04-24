import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { database } from "../../../../../src/database";
import { equipment } from "../../../../../src/database/schemas";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useForm } from "@tanstack/react-form";
import FormEquipment from "../../../../../src/components/forms/FormEquipment";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { eq } from "drizzle-orm";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function EditEquipmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const results = await database
        .select()
        .from(equipment)
        .where(eq(equipment.id, id))
        .execute();
      return results[0];
    },
  });
  const formEditEquipment = useForm({
    defaultValues: {
      name: item?.name || "",
      image_uri: item?.image_uri || "",
    },
    onSubmit: async ({ value }) => {
      try {
        const trimmedName = (value.name || "").trim();

        await database
          .update(equipment)
          .set({
            name: trimmedName,
            image_uri: value.image_uri,
            sync_status: "pending",
          })
          .where(eq(equipment.id, id));

        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        queryClient.invalidateQueries({ queryKey: ["equipment", id] });
        checkNetInfoAndSync()
          .then(() =>
            queryClient.invalidateQueries({ queryKey: ["equipments"] })
          )
          .catch((err) => console.error("Sync failed", err));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Actualizado!",
          text2: `${trimmedName} se actualizó exitosamente.`,
          position: "bottom",
        });
        router.back();
      } catch (error) {
        console.error("Error al actualizar equipo:", error);
      }
    },
  });

  if (isLoading) return null;

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-6">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark mb-1">
          Editar Máquina o Accesorio
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-4">
          Modifica los detalles del elemento de inventario.
        </Text>
      </View>

      <View className="px-5">
        <FormEquipment form={formEditEquipment} />
      </View>
    </KeyboardAwareScrollView>
  );
}
