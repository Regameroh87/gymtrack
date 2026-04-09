import { Pressable, Text, View } from "react-native";

// Libraries
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Database
import { database } from "../../database";
import { equipment } from "../../database/schemas";

// Hooks & Utils
import { useTheme } from "../../theme/theme";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import handlePickImage from "../../utils/handlePickImage";

// Components
import PreviewImage from "../../components/images/PreviewImage";
import StyledTextInput from "./StyledTextInput";

// Icons & Theme
import { CameraPlus, CloudUpload, Plus, Barbell } from "../../../assets/icons";
import { ui } from "../../theme/colors";

export default function AddEquipment({ onAdd, onCancel, initialName = "" }) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();
  const queryClient = useQueryClient();

  const { data: dbEquipments = [] } = useQuery({
    queryKey: ["equipments"],
    queryFn: async () => {
      const results = await database.select().from(equipment);
      return results || [];
    },
    staleTime: Infinity,
  });

  const formAddEquipment = useForm({
    defaultValues: {
      name: initialName,
      local_image_uri: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const newId = Crypto.randomUUID();
        const trimmedName = (value.name || "").trim();

        await database.insert(equipment).values({
          id: newId,
          name: trimmedName,
          local_image_uri: value.local_image_uri,
          cloudinary_image_public_id: null,
          sync_status: "pending",
        });
        queryClient.invalidateQueries({ queryKey: ["equipments"] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Notificar al padre si existe, sino damos feedback visual y limpiamos el formulario
        if (onAdd) {
          onAdd({
            id: newId,
            name: trimmedName,
            local_image_uri: value.local_image_uri,
            image_public_id: value.local_image_uri,
            isNew: true,
          });
        } else {
          Toast.show({
            type: "success",
            text1: "¡Listo!",
            text2: `${trimmedName} se agregó exitosamente.`,
            position: "bottom",
          });
          formAddEquipment.reset();
        }
      } catch (error) {
        console.error("Error al guardar equipo:", error);
      }
    },
  });

  return (
    <View className="gap-y-4 w-full p-4 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl mt-4 border border-ui-border-light dark:border-ui-border-dark shadow-sm">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark uppercase tracking-widest">
          NUEVA MÁQUINA / ACCESORIO
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
        <formAddEquipment.Field
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
              <View className="w-20 h-20 rounded-xl overflow-hidden bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
                <PreviewImage value={imageField.state.value}>
                  <CameraPlus color={ui.text.mutedDark} size={20} />
                </PreviewImage>
              </View>
            </View>
          )}
        </formAddEquipment.Field>
        {/* Input name */}
        <formAddEquipment.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || typeof value !== "string") return undefined;
              const trimmed = value.trim();
              if (trimmed.length > 0 && trimmed.length < 3) {
                return "Mínimo 3 caracteres";
              }
              if (Array.isArray(dbEquipments)) {
                const exists = dbEquipments.some(
                  (eq) =>
                    typeof eq?.name === "string" &&
                    eq.name.toLowerCase() === trimmed.toLowerCase()
                );
                if (exists) return "Ya existe máquina con este nombre";
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
            <>
              {/* Input nombre */}
              <View className=" flex-1">
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Barra Z, Polea"
                  icon={<Barbell color={ui.text.mutedDark} />}
                />
              </View>
            </>
          )}
        </formAddEquipment.Field>
      </View>

      <formAddEquipment.Subscribe selector={(state) => [state.fieldMeta]}>
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
      </formAddEquipment.Subscribe>

      {/* Botones de media */}
      <formAddEquipment.Subscribe
        selector={(state) => [state.values.local_image_uri]}
      >
        {([localImageUri]) =>
          !localImageUri ? (
            <View className=" flex-row gap-2 mt-4">
              {/* Galería */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePickImage({
                    pickMedia,
                    source: "gallery",
                    onChange: (uri) =>
                      formAddEquipment.setFieldValue("local_image_uri", uri),
                  });
                }}
                className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-3"
              >
                <CloudUpload color={isDark ? "#62fae3" : "#059669"} size={16} />
                <Text className="text-brandSecondary-600 dark:text-brandSecondary-400 font-manrope-semi text-xs">
                  Galería
                </Text>
              </Pressable>

              {/* Cámara */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handlePickImage({
                    pickMedia,
                    source: "camera",
                    onChange: (uri) =>
                      formAddEquipment.setFieldValue("local_image_uri", uri),
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
      </formAddEquipment.Subscribe>

      <formAddEquipment.Subscribe selector={(state) => [state.canSubmit]}>
        {/* Botón confirmar */}
        {([canSubmit]) => (
          <Pressable
            onPress={formAddEquipment.handleSubmit}
            className="flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-2 bg-brandPrimary-600 active:scale-95"
          >
            <Plus color="white" size={16} />
            <Text className="text-white text-sm font-jakarta-bold">
              CONFIRMAR Y AGREGAR
            </Text>
          </Pressable>
        )}
      </formAddEquipment.Subscribe>
    </View>
  );
}
