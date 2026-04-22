import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { database } from "../../../../../src/database";
import { equipment } from "../../../../../src/database/schemas";
import { ne } from "drizzle-orm";
import Toast from "react-native-toast-message";
import FormEquipment from "../../../../../src/components/forms/FormEquipment";
import { useEquipmentForm } from "../../../../../src/hooks/useEquipmentForm";

export default function AddEquipmentScreen() {
  //const router = useRouter();
  const insets = useSafeAreaInsets();

  const formAddEquipment = useEquipmentForm({
    onSuccess: (newEquipment) => {
      Toast.show({
        type: "success",
        text1: "¡Listo!",
        text2: `${newEquipment.name} se agregó exitosamente.`,
        position: "bottom",
      });
      formAddEquipment.reset();
    },
  });

  const { data: equipments } = useQuery({
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
        <FormEquipment form={formAddEquipment} dbEquipments={equipments} />
      </View>
    </KeyboardAwareScrollView>
  );
}
