import { useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "../../../../src/auth/lib/getSession";
import { database } from "../../../../src/database";
import {
  exercises_base,
  exercise_equipment,
} from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";
import FormExercise from "../../../../src/components/forms/FormExercise";
import { brandPrimary } from "../../../../src/theme/colors";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

export default function UserExerciseBuilder() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["exercise", id],
    enabled: isEdit,
    queryFn: async () => {
      const [ex] = await database
        .select()
        .from(exercises_base)
        .where(eq(exercises_base.id, id));
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
            .update(exercises_base)
            .set({ ...exerciseValues, updated_at: new Date().toISOString() })
            .where(eq(exercises_base.id, id));
        } else {
          const exerciseId = Crypto.randomUUID();
          await database.insert(exercises_base).values({
            id: exerciseId,
            gym_id: GYM_ID,
            created_by: userId ?? null,
            ...exerciseValues,
          });

          if (value.equipments?.length > 0) {
            for (const eq of value.equipments) {
              await database.insert(exercise_equipment).values({
                id: Crypto.randomUUID(),
                exercise_id: exerciseId,
                equipment_id: eq.id,
              });
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        if (isEdit)
          queryClient.invalidateQueries({ queryKey: ["exercise", id] });
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
  );
}
