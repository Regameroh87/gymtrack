import { View, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";

// Libraries
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { eq } from "drizzle-orm";

// Database
import { database } from "../../database";
import { equipment } from "../../database/schemas";

// Hooks & Utils
import { checkNetInfoAndSync } from "../../database/sync";

// Components
import FormEquipment from "./FormEquipment";

export default function EditEquipment({ id }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      const results = await database
        .select()
        .from(equipment)
        .where(eq(equipment.id, id));
      if (results.length > 0) {
        setInitialData(results[0]);
      }
      setIsLoading(false);
    };
    fetchEquipment();
  }, [id]);

  const formEditEquipment = useForm({
    defaultValues: {
      name: initialData?.name || "",
      local_image_uri:
        initialData?.local_image_uri ||
        initialData?.cloudinary_image_public_id ||
        "",
    },
    onSubmit: async ({ value }) => {
      try {
        const trimmedName = (value.name || "").trim();

        await database
          .update(equipment)
          .set({
            name: trimmedName,
            local_image_uri: value.local_image_uri,
            sync_status: "pending",
          })
          .where(eq(equipment.id, id));

        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        // Ejecuto la sincronización
        checkNetInfoAndSync().catch((err) => console.error("Sync failed", err));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "¡Actualizado!",
          text2: `${trimmedName} se actualizó exitosamente.`,
          position: "bottom",
        });
      } catch (error) {
        console.error("Error al actualizar equipo:", error);
      }
    },
  });

  if (isLoading) {
    return <ActivityIndicator size="large" className="mt-4" />;
  }

  return (
    <View className="gap-y-4 w-full p-4 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl mt-4 border border-ui-border-light dark:border-ui-border-dark shadow-sm">
      <FormEquipment form={formEditEquipment} />
    </View>
  );
}
