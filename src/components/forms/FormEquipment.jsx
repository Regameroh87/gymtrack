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

export default function FormEquipment({
  form,
  onCancel,
  dbEquipments,
  header = "NUEVA MAQUINA / ACCESORIO",
}) {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();

  const isCompact = !!onCancel;

  const handleDeleteImage = async (field) => {
    const uriToDelete = field.state.value;
    if (!uriToDelete) return;
    try {
      await deleteMediaLocally(uriToDelete);
      field.handleChange("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Error al borrar el archivo:", error);
    }
  };

  const pickFromGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handlePickImage({
      pickMedia,
      source: "gallery",
      onChange: (uri) => form.setFieldValue("image_uri", uri),
    });
  };

  const pickFromCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handlePickImage({
      pickMedia,
      source: "camera",
      onChange: (uri) => form.setFieldValue("image_uri", uri),
    });
  };

  /* ─────────────────────────────────────────────
     MODO COMPACTO — usado inline en FormExercise
  ───────────────────────────────────────────── */
  if (isCompact) {
    return (
      <>
        {/* Header con cancelar */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark uppercase tracking-widest">
            {header}
          </Text>
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
        </View>

        {/* Imagen + Input en fila */}
        <View className="flex-row gap-2 items-center">
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
              <View className="w-20 h-20 rounded-xl bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark border border-ui-input-light dark:border-ui-input-dark">
                <PreviewImage
                  value={field.state.value}
                  sizeIconEdit={12}
                  onPress={() => handleDeleteImage(field)}
                >
                  <CameraPlus color={ui.text.mutedDark} size={20} />
                </PreviewImage>
              </View>
            )}
          </form.Field>

          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value || typeof value !== "string") return undefined;
                const trimmed = value.trim();
                if (trimmed.length > 0 && trimmed.length < 3)
                  return "Mínimo 3 caracteres";
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
              <View className="flex-1">
                <StyledTextInput
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  placeholder="Ej: Barra Z, Polea"
                  icon={<Barbell color={ui.text.mutedDark} />}
                />
              </View>
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
              <View className="px-1 mt-1">
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

        {/* Botones de media (solo si no hay imagen) */}
        <form.Subscribe selector={(state) => [state.values.image_uri]}>
          {([imageUri]) =>
            !imageUri ? (
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={pickFromGallery}
                  className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-3"
                >
                  <CloudUpload color={isDark ? "#62fae3" : "#059669"} size={16} />
                  <Text className="text-brandSecondary-600 dark:text-brandSecondary-400 font-manrope-semi text-xs">
                    Galería
                  </Text>
                </Pressable>
                <Pressable
                  onPress={pickFromCamera}
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

        {/* Botón confirmar */}
        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <Pressable
              disabled={!canSubmit}
              onPress={form.handleSubmit}
              className="flex-row justify-center items-center gap-2 rounded-xl p-3.5 mt-2 bg-brandPrimary-600 active:scale-95"
            >
              <Plus color="white" size={16} />
              <Text className="text-white text-sm font-jakarta-bold">
                AGREGAR
              </Text>
            </Pressable>
          )}
        </form.Subscribe>
      </>
    );
  }

  /* ─────────────────────────────────────────────
     MODO STANDALONE — pantallas add / edit
  ───────────────────────────────────────────── */
  return (
    <View className="gap-5">
      {/* Zona de imagen grande */}
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
          <form.Subscribe selector={(state) => [state.values.image_uri]}>
            {([imageUri]) =>
              imageUri ? (
                <View className="w-full h-52 rounded-2xl overflow-hidden border border-ui-input-light dark:border-ui-input-dark">
                  <PreviewImage
                    value={field.state.value}
                    sizeIconEdit={14}
                    onPress={() => handleDeleteImage(field)}
                  >
                    <CameraPlus color={ui.text.mutedDark} size={28} />
                  </PreviewImage>
                </View>
              ) : (
                <View className="w-full h-52 rounded-2xl border-2 border-dashed border-ui-input-border dark:border-ui-input-dark bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark items-center justify-center gap-4">
                  <View className="items-center gap-1">
                    <View className="w-14 h-14 rounded-2xl bg-ui-input-light dark:bg-ui-input-dark items-center justify-center">
                      <CameraPlus
                        color={isDark ? ui.text.mutedDark : ui.placeholder.light}
                        size={26}
                      />
                    </View>
                    <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope text-xs mt-1">
                      Foto de la máquina
                    </Text>
                  </View>

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={pickFromGallery}
                      className="flex-row items-center gap-2 bg-brandSecondary-600/10 border border-brandSecondary-500/25 rounded-xl px-4 py-2.5 active:scale-95"
                    >
                      <CloudUpload color={isDark ? "#62fae3" : "#059669"} size={15} />
                      <Text className="text-brandSecondary-600 dark:text-brandSecondary-400 font-manrope-semi text-xs">
                        Galería
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={pickFromCamera}
                      className="flex-row items-center gap-2 bg-brandPrimary-600/10 border border-brandPrimary-500/25 rounded-xl px-4 py-2.5 active:scale-95"
                    >
                      <CameraPlus color={isDark ? "#a5b4fc" : "#3023cd"} size={15} />
                      <Text className="text-brandPrimary-600 dark:text-brandPrimary-400 font-manrope-semi text-xs">
                        Cámara
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            }
          </form.Subscribe>
        )}
      </form.Field>

      {/* Input nombre */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value || typeof value !== "string") return undefined;
            const trimmed = value.trim();
            if (trimmed.length > 0 && trimmed.length < 3)
              return "Mínimo 3 caracteres";
            if (Array.isArray(dbEquipments)) {
              const exists = dbEquipments.some(
                (eq) =>
                  typeof eq?.name === "string" &&
                  eq.name.toLowerCase() === trimmed.toLowerCase()
              );
              if (exists) return "Ya existe una máquina con este nombre";
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
          <View className="gap-1.5">
            <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Nombre
            </Text>
            <StyledTextInput
              value={field.state.value}
              onChangeText={field.handleChange}
              placeholder="Ej: Barra Z, Polea alta"
              icon={<Barbell color={ui.text.mutedDark} />}
              error={field.state.meta.errors?.length > 0}
            />
            {field.state.meta.errors?.length > 0 && (
              <Text className="text-red-500 dark:text-red-400 text-xs font-manrope-medium px-1">
                {field.state.meta.errors[0]}
              </Text>
            )}
          </View>
        )}
      </form.Field>

      {/* Error de imagen (solo se muestra al intentar submit) */}
      <form.Subscribe selector={(state) => [state.fieldMeta]}>
        {([fieldMeta]) => {
          const imageErrors = fieldMeta?.image_uri?.errors ?? [];
          if (imageErrors.length === 0) return null;
          return (
            <View className="px-1 -mt-2">
              {imageErrors.map((err, i) => (
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

      {/* Botón confirmar */}
      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Pressable
            disabled={!canSubmit}
            onPress={form.handleSubmit}
            className={`flex-row justify-center items-center gap-2 rounded-2xl py-4 active:scale-95 ${
              canSubmit
                ? "bg-brandPrimary-600"
                : "bg-ui-input-light dark:bg-ui-input-dark"
            }`}
          >
            <Plus color={canSubmit ? "white" : ui.text.mutedDark} size={16} />
            <Text
              className={`text-sm font-jakarta-bold tracking-wider ${
                canSubmit
                  ? "text-white"
                  : "text-ui-text-muted dark:text-ui-text-mutedDark"
              }`}
            >
              AGREGAR MÁQUINA
            </Text>
          </Pressable>
        )}
      </form.Subscribe>
    </View>
  );
}
