import React from "react";
import { View, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import EditEquipment from "../../../../../src/components/forms/EditEquipment";

export default function EditEquipmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

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
        <EditEquipment
          id={id}
          onUpdate={() => {
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
