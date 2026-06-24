import { View, Text, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useForm } from "@tanstack/react-form";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import FormActivity from "../../../../../../src/components/forms/FormActivity";
import { useActivityMutations } from "@gymtrack/core/hooks/activities/use-activity-mutations";
import { useActiveGym } from "../../../../../../src/contexts/active-gym-context";
import { DEFAULT_ACTIVITY_COLOR } from "../../../../../../src/constants/activity-options";

export default function AddActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useActiveGym();
  const { create } = useActivityMutations(gymId);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      color: DEFAULT_ACTIVITY_COLOR,
      coach_id: null,
      is_active: true,
    },
    onSubmit: async ({ value }) => {
      try {
        const created = await create.mutateAsync(value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "Actividad creada",
          text2: `Agregá los pases (frecuencia y precio) de ${created.name}.`,
          position: "bottom",
        });
        // Continúa en la edición para cargar los pases enseguida.
        router.replace(`/admin/activities/edit/${created.id}`);
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "No se pudo crear",
          text2: error.message ?? "Intentá de nuevo.",
          position: "bottom",
        });
      }
    },
  });

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{
        paddingTop: Platform.OS === "android" ? insets.top : 0,
        paddingBottom: insets.bottom + 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-2">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark mb-1">
          Agregar Actividad
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
          Definí una disciplina de tu gimnasio y su cuota mensual.
        </Text>
      </View>

      <View className="px-5 pt-4">
        <FormActivity form={form} submitLabel="AGREGAR ACTIVIDAD" />
      </View>
    </KeyboardAwareScrollView>
  );
}
