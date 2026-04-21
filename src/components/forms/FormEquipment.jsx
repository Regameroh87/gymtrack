import { Pressable, Text, View } from "react-native";

// Libraries
import * as Haptics from "expo-haptics";

// Hooks & Utils
import { useTheme } from "../../theme/theme";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import handlePickImage from "../../utils/handlePickImage";
import { deleteMediaLocally } from "../../utils/saveMediaLocally";

// Components
import PreviewImage from "../images/PreviewImage";
import StyledTextInput from "./StyledTextInput";

// Icons & Theme
import { CameraPlus, CloudUpload, Plus, Barbell } from "../../../assets/icons";
import { ui } from "../../theme/colors";

export default function FormEquipment({ form, onCancel, dbEquipments }) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();
  return (
    <>
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
        <form.Field
          name="image_uri"
          validators={{
            onSubmit: ({ value }) => {
              if (!value) return "La imagen es requerida";
              return undefined;
            },
          }}
        >
          {(field) => (
            <View>
              <View className="w-20 h-20 rounded-xl bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
                <PreviewImage
                  value={field.state.value}
                  sizeIconEdit={12}
                  onPress={async () => {
                    // 2. Obtenemos la URI actual antes de borrarla
                    const uriToDelete = field.state.value;

                    if (uriToDelete) {
                      try {
                        // 3. Borramos el archivo físico del dispositivo
                        await deleteMediaLocally(uriToDelete);

                        // 4. Limpiamos el estado del formulario de forma reactiva
                        field.handleChange("");

                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } catch (error) {
                        console.error("Error al borrar el archivo:", error);
                      }
                    }
                  }}
                >
                  <CameraPlus color={ui.text.mutedDark} size={20} />
                </PreviewImage>
              </View>
            </View>
          )}
        </form.Field>
        {/* Input name */}
        <form.Field
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
        </form.Field>
      </View>
      {/* Errores */}
      <form.Subscribe selector={(state) => [state.fieldMeta]}>
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
      </form.Subscribe>

      {/* Botones de media */}
      <form.Subscribe selector={(state) => [state.values.image_uri]}>
        {([imageUri]) =>
          !imageUri ? (
            <View className=" flex-row gap-2 mt-4">
              {/* Galería */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handlePickImage({
                    pickMedia,
                    source: "gallery",
                    onChange: (uri) => form.setFieldValue("image_uri", uri),
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
                      form.setFieldValue("local_image_uri", uri),
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
      </form.Subscribe>

      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {/* Botón confirmar */}
        {([canSubmit]) => (
          <Pressable
            disabled={!canSubmit}
            onPress={form.handleSubmit}
            className="flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-2 bg-brandPrimary-600 active:scale-95"
          >
            <Plus color="white" size={16} />
            <Text className="text-white text-sm font-jakarta-bold">
              CONFIRMAR Y AGREGAR
            </Text>
          </Pressable>
        )}
      </form.Subscribe>
    </>
  );
}
