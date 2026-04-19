import { Pressable, Text, View, ActivityIndicator } from "react-native";
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
import { useTheme } from "../../theme/theme";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import handlePickImage from "../../utils/handlePickImage";
import { checkNetInfoAndSync } from "../../database/sync";

// Components
import PreviewImage from "../../components/images/PreviewImage";
import StyledTextInput from "./StyledTextInput";

// Icons & Theme
import {
  CameraPlus,
  CloudUpload,
  Barbell,
  Pencil,
} from "../../../assets/icons";
import { ui } from "../../theme/colors";

export default function EditEquipment({ id, onUpdate, onCancel }) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();
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

        if (onUpdate) onUpdate();
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

  // Need to update form defaults when data is loaded
  useEffect(() => {
    if (initialData) {
      formEditEquipment.setFieldValue("name", initialData.name);
      formEditEquipment.setFieldValue(
        "local_image_uri",
        initialData.local_image_uri ||
          initialData.cloudinary_image_public_id ||
          ""
      );
    }
  }, [initialData]);

  if (isLoading) {
    return <ActivityIndicator size="large" className="mt-4" />;
  }

  return (
    <View className="gap-y-4 w-full p-4 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl mt-4 border border-ui-border-light dark:border-ui-border-dark shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark uppercase tracking-widest">
          EDITAR MÁQUINA
        </Text>
        {onCancel && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
          >
            <Text className="text-red-500 font-manrope-medium text-xs">
              Cancelar
            </Text>
          </Pressable>
        )}
      </View>

      <View className=" flex-row gap-2 items-center">
        {/* Preview imagen */}
        <formEditEquipment.Field
          name="local_image_uri"
          validators={{
            onSubmit: ({ value }) => {
              if (!value) return "La imagen es requerida";
              return undefined;
            },
          }}
        >
          {(imageField) => (
            <View>
              <View className="w-20 h-20 rounded-xl bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
                <PreviewImage
                  value={imageField.state.value}
                  sizeIconEdit={12}
                  onPress={async () => {
                    const uriToDelete = imageField.state.value;
                    if (uriToDelete) {
                      try {
                        imageField.handleChange("");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } catch (error) {
                        console.error("Error al quitar la imagen:", error);
                      }
                    }
                  }}
                >
                  <CameraPlus color={ui.text.mutedDark} size={20} />
                </PreviewImage>
              </View>
            </View>
          )}
        </formEditEquipment.Field>
        {/* Input name */}
        <formEditEquipment.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || typeof value !== "string") return undefined;
              const trimmed = value.trim();
              if (trimmed.length > 0 && trimmed.length < 3) {
                return "Mínimo 3 caracteres";
              }
              return undefined;
            },
            onSubmit: ({ value }) => {
              if (!value || typeof value !== "string")
                return "El nombre es requerido";
              return undefined;
            },
          }}
        >
          {(field) => (
            <View className=" flex-1">
              <StyledTextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Barra Z, Polea"
                icon={<Barbell color={ui.text.mutedDark} />}
              />
            </View>
          )}
        </formEditEquipment.Field>
      </View>

      <formEditEquipment.Subscribe selector={(state) => [state.fieldMeta]}>
        {([fieldMeta]) => {
          const allErrors = Object.values(fieldMeta)
            .flatMap((meta) => meta.errors)
            .filter(Boolean);

          if (allErrors.length === 0) return null;

          return (
            <View className=" px-1">
              {allErrors.map((err, i) => (
                <Text
                  key={i}
                  className="text-red-500 dark:text-red-400 text-xs font-manrope-medium"
                >
                  • {err}
                </Text>
              ))}
            </View>
          );
        }}
      </formEditEquipment.Subscribe>

      <formEditEquipment.Subscribe
        selector={(state) => [state.values.local_image_uri]}
      >
        {([localImageUri]) =>
          !localImageUri ? (
            <View className=" flex-row gap-2 mt-4">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePickImage({
                    pickMedia,
                    source: "gallery",
                    onChange: (uri) =>
                      formEditEquipment.setFieldValue("local_image_uri", uri),
                  });
                }}
                className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-3"
              >
                <CloudUpload color={isDark ? "#62fae3" : "#059669"} size={16} />
                <Text className="text-brandSecondary-600 dark:text-brandSecondary-400 font-manrope-semi text-xs">
                  Galería
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handlePickImage({
                    pickMedia,
                    source: "camera",
                    onChange: (uri) =>
                      formEditEquipment.setFieldValue("local_image_uri", uri),
                  });
                }}
                className="flex-1 flex-row border border-brandPrimary-500/20 justify-center items-center gap-2 bg-brandPrimary-600/10 rounded-xl p-3"
              >
                <CameraPlus color={isDark ? "#a5b4fc" : "#3023cd"} size={16} />
                <Text className="text-brandPrimary-600 dark:text-brandPrimary-400 font-manrope-semi text-xs">
                  Cámara
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      </formEditEquipment.Subscribe>

      <formEditEquipment.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Pressable
            disabled={!canSubmit}
            onPress={formEditEquipment.handleSubmit}
            className="flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-2 bg-brandPrimary-600 active:scale-95"
          >
            <Pencil color="white" size={16} />
            <Text className="text-white text-sm font-jakarta-bold">
              ACTUALIZAR
            </Text>
          </Pressable>
        )}
      </formEditEquipment.Subscribe>
    </View>
  );
}
