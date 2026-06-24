import { View, Text, Platform, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { supabase } from "../../../../../../src/database/supabase";
import { useGymTheme } from "../../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../../src/contexts/active-gym-context";
import FormActivity from "../../../../../../src/components/forms/FormActivity";
import ActivityPlansManager from "../../../../../../src/components/admin/ActivityPlansManager";
import { useActivityMutations } from "@gymtrack/core/hooks/activities/use-activity-mutations";
import { Trash } from "../../../../../../assets/icons";

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams();
  const { brandPrimary } = useGymTheme();

  const { data: item, isLoading } = useQuery({
    queryKey: ["activity", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !item) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="small" color={brandPrimary[600]} />
      </View>
    );
  }

  return <EditActivityForm item={item} />;
}

function EditActivityForm({ item }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gymId } = useActiveGym();
  const { update, remove } = useActivityMutations(gymId);

  const form = useForm({
    defaultValues: {
      name: item.name ?? "",
      description: item.description ?? "",
      color: item.color ?? null,
      coach_id: item.coach_id ?? null,
      is_active: item.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      try {
        const updated = await update.mutateAsync({ id: item.id, ...value });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Actualizado!",
          text2: `${updated.name} se actualizó exitosamente.`,
          position: "bottom",
        });
        router.back();
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "No se pudo actualizar",
          text2: error.message ?? "Intentá de nuevo.",
          position: "bottom",
        });
      }
    },
  });

  const doDelete = async () => {
    try {
      await remove.mutateAsync(item.id);
      Toast.show({
        type: "success",
        text1: "Actividad eliminada",
        position: "bottom",
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "No se pudo eliminar",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  const confirmDelete = () => {
    const message = `¿Seguro que querés eliminar "${item.name}"? Se quitarán también sus pases y las inscripciones de socios a esta actividad.`;
    // RN Web no soporta Alert.alert con botones: usar el confirm del browser.
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) doDelete();
      return;
    }
    Alert.alert("Eliminar actividad", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: doDelete },
    ]);
  };

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
          Editar Actividad
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
          Modificá los detalles y la cuota de la disciplina.
        </Text>
      </View>

      <View className="px-5 pt-4">
        <FormActivity form={form} submitLabel="GUARDAR CAMBIOS" />

        {/* Pases (frecuencia + precio) */}
        <View className="h-px bg-ui-input-border my-6" />
        <ActivityPlansManager activityId={item.id} />

        <Pressable
          onPress={confirmDelete}
          className="flex-row justify-center items-center gap-2 rounded-2xl py-4 mt-8 bg-red-500/10 border border-red-500/20 active:scale-95"
        >
          <Trash size={15} color="#ef4444" />
          <Text className="text-red-500 text-sm font-jakarta-bold tracking-wider">
            ELIMINAR ACTIVIDAD
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}
