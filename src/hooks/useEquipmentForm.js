import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { database } from "../database";
import { equipment } from "../database/schemas";
import { checkNetInfoAndSync } from "../database/sync";

export const useEquipmentForm = ({ onSuccess, initialValues = {} } = {}) => {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: initialValues.name || "",
      image_uri: initialValues.image_uri || "",
    },
    onSubmit: async ({ value }) => {
      try {
        const newId = Crypto.randomUUID();
        const trimmedName = (value.name || "").trim();

        const newEquipment = {
          id: newId,
          name: trimmedName,
          image_uri: value.image_uri,
          sync_status: "pending",
        };

        await database.insert(equipment).values(newEquipment);

        queryClient.invalidateQueries({ queryKey: ["equipments"] });

        // Ejecuto la sincronización en segundo plano y refresco la lista al terminar
        checkNetInfoAndSync()
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["equipments"] });
          })
          .catch((err) => console.error("Sync failed", err));

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (onSuccess) {
          onSuccess(newEquipment);
        }
      } catch (error) {
        console.error("Error al crear equipo:", error);
        throw error;
      }
    },
  });

  return form;
};
