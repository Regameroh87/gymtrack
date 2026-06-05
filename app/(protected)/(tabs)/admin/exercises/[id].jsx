// React Native
import { View, ActivityIndicator } from "react-native";

// Expo
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";

// Librerías de terceros
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { eq } from "drizzle-orm";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../../../../../src/database";
import {
  exercises_base,
  equipment,
  exercise_equipment,
} from "../../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";

// Hooks
import { useRecordById } from "../../../../../src/hooks/shared/use-record-by-id";

// Componentes
import FormExercise from "../../../../../src/components/forms/FormExercise";

export default function EditExercise() {
  const { id } = useLocalSearchParams();

  const { data: exerciseRecord, isLoading } = useRecordById(
    "exercise",
    exercises_base,
    id
  );

  const { data: exerciseEquipments, isLoading: isLoadingEquipments } = useQuery(
    {
      queryKey: ["exercise", id, "equipments"],
      enabled: !!id,
      queryFn: async () => {
        const rows = await database
          .select({
            id: equipment.id,
            name: equipment.name,
            image_uri: equipment.image_uri,
          })
          .from(exercise_equipment)
          .innerJoin(
            equipment,
            eq(exercise_equipment.equipment_id, equipment.id)
          )
          .where(eq(exercise_equipment.exercise_id, id));
        const seen = new Set();
        return rows
          .filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          })
          .map((item) => ({ ...item, isNew: false }));
      },
    }
  );

  if (isLoading || isLoadingEquipments || !exerciseRecord) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <EditExerciseForm
      data={{ ...exerciseRecord, equipments: exerciseEquipments ?? [] }}
    />
  );
}

function EditExerciseForm({ data }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const editExerciseForm = useForm({
    defaultValues: {
      name: data.name || "",
      category: data.category || "",
      muscle_group: data.muscle_group || "",
      equipments: data.equipments || [],
      youtube_video_url: data.youtube_video_url || "",
      image_uri: data.image_uri || "",
      video_uri: data.video_uri || "",
      instructions: data.instructions || "",
      is_unilateral: data.is_unilateral || false,
    },
    onSubmit: async ({ value }) => {
      try {
        await database
          .update(exercises_base)
          .set({
            name: value.name.trim(),
            category: value.category,
            muscle_group: value.muscle_group,
            video_uri: value.video_uri,
            image_uri: value.image_uri,
            youtube_video_url: value.youtube_video_url,
            instructions: value.instructions,
            is_unilateral: value.is_unilateral ? 1 : 0,
            sync_status: "pending",
          })
          .where(eq(exercises_base.id, data.id));

        await database
          .delete(exercise_equipment)
          .where(eq(exercise_equipment.exercise_id, data.id));

        const uniqueEquipments = (value.equipments ?? []).filter(
          (item, index, self) =>
            self.findIndex((e) => e.id === item.id) === index
        );
        for (const item of uniqueEquipments) {
          await database.insert(exercise_equipment).values({
            id: Crypto.randomUUID(),
            exercise_id: data.id,
            equipment_id: item.id,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["exercises"] });
        queryClient.invalidateQueries({ queryKey: ["exercise", data.id] });
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Éxito!",
          text2: "El ejercicio fue editado exitosamente.",
          position: "bottom",
        });
        router.back();
      } catch (error) {
        console.error("Error al insertar un ejercicio", error.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Error al guardar, intente nuevamente.",
          text2: error.message,
          position: "bottom",
        });
      }
    },
  });

  return (
    <FormExercise
      headerTitle="Editar Ejercicio"
      headerDescription="Modifica los datos del ejercicio"
      form={editExerciseForm}
      exercise={data}
    />
  );
}
