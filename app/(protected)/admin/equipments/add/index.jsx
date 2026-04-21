import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useForm } from "@tanstack/react-form";
import { database } from "../../../../../src/database";
import { equipment } from "../../../../../src/database/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Toast from "react-native-toast-message";
import FormEquipment from "../../../../../src/components/forms/FormEquipment";

export default function AddEquipmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const formAddEquipment = useForm({
    defaultValues: {
      name: "",
      image_uri: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const newId = Crypto.randomUUID();
        const trimmedName = (value.name || "").trim();

        await database.insert(equipment).values({
          id: newId,
          name: trimmedName,
          image_uri: value.image_uri,
          sync_status: "pending",
        });
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        //Ejecuto la sincronización
        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Listo!",
          text2: `${trimmedName} se agregó exitosamente.`,
          position: "bottom",
        });
        formAddEquipment.reset();
      } catch (error) {
        console.error("Error al guardar equipo:", error);
      }
    },
  });

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pt-6">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark mb-1">
          Agregar Máquina
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-4">
          Registra un nuevo elemento para el inventario de tu gimnasio. Podrás
          asignarlo a los ejercicios después.
        </Text>
      </View>

      <View className="px-5">
        <FormEquipment
          onAdd={() => {
            // El componente AddEquipment se encarga de mostrar su propio Toast, nosotros solo volvemos.
            router.back();
          }}
          onCancel={() => {
            router.back();
          }}
          form={formAddEquipment}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
