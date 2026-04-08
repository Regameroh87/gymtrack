import { Pressable, Text, View } from "react-native";
import { CameraPlus, CloudUpload, Plus, Barbell } from "../../../assets/icons";
import PreviewImage from "../../components/images/PreviewImage";
import { useTheme } from "../../theme/theme";
import { ui } from "../../theme/colors";
import handlePickImage from "../../utils/handlePickImage";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import * as Haptics from "expo-haptics";
import StyledTextInput from "./StyledTextInput";
import { database } from "../../database";
import { equipment } from "../../database/schemas";
import { useForm } from "@tanstack/react-form";
import * as Crypto from "expo-crypto";

export default function AddEquipment({ onAdd, onCancel, initialName = "" }) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();

  const formAddEquipment = useForm({
    defaultValues: {
      name: initialName,
      local_image_uri: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await database.insert(equipment).values({
          id: Crypto.randomUUID(),
          name: value.name.trim(),
          local_image_uri: value.local_image_uri,
          cloudinary_image_public_id: null,
          sync_status: "pending",
        });

        // Notificar al padre con el nombre creado para que pueda
        // seleccionarlo automáticamente en el CustomSelect
        //onAdd?.(value.name.trim());
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

      {/* Imagen + Nombre */}
      <View className="flex-row justify-center items-center gap-4 mt-1">
        {/* Preview imagen */}
        <formAddEquipment.Field name="local_image_uri">
          {(field) => (
            <View className="w-20 h-20 rounded-xl overflow-hidden bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
              <PreviewImage value={field.state.value}>
                <CameraPlus color={ui.text.mutedDark} size={20} />
              </PreviewImage>
            </View>
          )}
        </formAddEquipment.Field>

        {/* Input nombre */}
        <View className="flex-1">
          <formAddEquipment.Field name="name">
            {(field) => (
              <StyledTextInput
                value={field.state.value}
                onChangeText={field.handleChange}
                placeholder="Ej: Barra Z, Polea"
                icon={<Barbell color={ui.text.mutedDark} />}
              />
            )}
          </formAddEquipment.Field>
        </View>
      </View>

      {/* Botones de media */}
      <View className="flex-1 mt-2">
        <formAddEquipment.Field name="local_image_uri">
          {(field) => (
            <View className="flex-row gap-2">
              {/* Galería */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePickImage({
                    pickMedia,
                    source: "gallery",
                    onChange: (uri) => field.handleChange(uri),
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
                    onChange: (uri) => field.handleChange(uri),
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
          )}
        </formAddEquipment.Field>

        {/* Botón confirmar */}
        <formAddEquipment.Subscribe selector={(state) => state.values.name}>
          {(name) => (
            <Pressable
              disabled={!name.trim()}
              onPress={formAddEquipment.handleSubmit}
              className={`flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-3 ${
                name.trim()
                  ? "bg-brandPrimary-600 active:scale-95 transition-all duration-200"
                  : "bg-ui-input-light dark:bg-ui-input-dark opacity-50"
              }`}
            >
              <Plus color={name.trim() ? "white" : ui.text.muted} size={16} />
              <Text
                className={`${name.trim() ? "text-white" : "text-ui-text-muted"} text-sm font-jakarta-bold`}
              >
                CONFIRMAR Y AGREGAR
              </Text>
            </Pressable>
          )}
        </formAddEquipment.Subscribe>
      </View>
    </View>
  );
}
