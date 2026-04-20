import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import AddEquipment from "../../../../../src/components/forms/AddEquipment";

export default function AddEquipmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <AddEquipment
          onAdd={() => {
            // El componente AddEquipment se encarga de mostrar su propio Toast, nosotros solo volvemos.
            router.back();
          }}
          onCancel={() => {
            router.back();
          }}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
