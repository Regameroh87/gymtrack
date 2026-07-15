import { useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { HeaderBackButton } from "@react-navigation/elements";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "../../../../../../src/auth/lib/getSession";
import { database } from "../../../../../../src/database";
import { custom_exercises } from "../../../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../../../src/database/sync";
import FormExercise from "../../../../../../src/components/forms/FormExercise";
import Screen from "../../../../../../src/components/Screen";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../../src/contexts/gym-theme-context";

export default function UserExerciseBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["custom_exercise", id],
    enabled: isEdit,
    queryFn: async () => {
      const [ex] = await database
        .select()
        .from(custom_exercises)
        .where(eq(custom_exercises.id, id));
      return ex ?? null;
    },
  });

  const form = useForm({
    defaultValues: {
      name: existing?.name ?? "",
      category: existing?.category ?? "",
      muscle_group: existing?.muscle_group ?? "",
      equipments: [],
      youtube_video_url: existing?.youtube_video_url ?? "",
      image_uri: existing?.image_uri ?? "",
      video_uri: existing?.video_uri ?? "",
      instructions: existing?.instructions ?? "",
      is_unilateral: existing?.is_unilateral ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        const exerciseValues = {
          name: value.name.trim(),
          category: value.category,
          muscle_group: value.muscle_group,
          video_uri: value.video_uri,
          image_uri: value.image_uri,
          youtube_video_url: value.youtube_video_url,
          instructions: value.instructions,
          is_unilateral: value.is_unilateral ? 1 : 0,
        };

        if (isEdit) {
          await database
            .update(custom_exercises)
            .set({
              ...exerciseValues,
              updated_at: new Date().toISOString(),
              sync_status: "pending",
            })
            .where(eq(custom_exercises.id, id));
        } else {
          const exerciseId = Crypto.randomUUID();
          await database.insert(custom_exercises).values({
            id: exerciseId,
            user_id: userId,
            ...exerciseValues,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["custom_exercises"] });
        if (isEdit)
          queryClient.invalidateQueries({ queryKey: ["custom_exercise", id] });
        checkNetInfoAndSync().catch(() => {});

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: isEdit ? "Ejercicio actualizado" : "¡Ejercicio creado!",
          text2: isEdit
            ? "Los cambios fueron guardados."
            : "El ejercicio fue agregado a tu biblioteca.",
          position: "bottom",
        });

        router.back();
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error al guardar",
          text2: error.message,
          position: "bottom",
        });
      }
    },
  });

  if (isEdit && loadingExisting) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  return (
    <Screen safe={Platform.OS === "android"}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <View style={{ marginLeft: -16 }}>
              <HeaderBackButton
                displayMode="minimal"
                tintColor={isDark ? ui.text.mainDark : ui.text.main}
                onPress={() => router.back()}
              />
            </View>
          ),
        }}
      />
      <FormExercise
        ref={formRef}
        form={form}
        simplified
        onBack={() => router.back()}
        headerTitle={isEdit ? "Editar Ejercicio" : "Nuevo Ejercicio"}
        headerDescription={
          isEdit
            ? "Modificá los datos del ejercicio."
            : "Completá los datos para agregar un ejercicio a tu biblioteca."
        }
      />
    </Screen>
  );
}
