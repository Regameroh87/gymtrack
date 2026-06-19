// Drawer lateral de DETALLE de un ejercicio del catálogo (super_admin, web).
// Read-only sobre el objeto ya cargado por useCatalogExercisesAdmin; Editar/Eliminar
// delegan a los flujos del section padre (modal de edición y DeleteConfirmModal).
// Ver [[project_default_catalog]].
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Image } from "expo-image";

import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../../../../src/constants/exerciseOptions";
import {
  Barbell,
  Pencil,
  Trash,
  X,
  Link,
} from "../../../../../assets/icons";

// Devuelve el label legible de un value crudo; si no hay match usa el value tal cual.
const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label ?? value;

export default function ExerciseDetailDrawer({
  exercise,
  onClose,
  onEdit,
  onDelete,
}) {
  const { brandPrimary } = useGymTheme();
  if (!exercise) return null;

  const heroUrl = exercise.image_uri
    ? getCloudinaryUrl(exercise.image_uri, "w_480,h_480,c_fill,f_auto,q_auto") ||
      exercise.image_uri
    : null;
  const videoUrl = exercise.video_uri
    ? getCloudinaryUrl(exercise.video_uri) || exercise.video_uri
    : null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 flex-row justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.45)", cursor: "auto" }}
      >
        {/* El panel detiene la propagación: tocar adentro no cierra el drawer. */}
        <Pressable
          onPress={() => {}}
          className="h-full bg-white border-l border-ui-input-border w-full"
          style={{ maxWidth: 440, cursor: "auto" }}
        >
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-jakarta-bold text-ui-text-main tracking-tight">
                Detalle
              </Text>
              <Pressable onPress={onClose} style={{ cursor: "pointer" }}>
                <X size={18} color={ui.text.muted} />
              </Pressable>
            </View>

            {/* Hero */}
            {heroUrl ? (
              <Image
                source={{ uri: heroUrl }}
                style={{ width: "100%", aspectRatio: 1, borderRadius: 18 }}
                contentFit="cover"
              />
            ) : (
              <View
                className="w-full rounded-[18px] bg-brandPrimary-50 items-center justify-center"
                style={{ aspectRatio: 1 }}
              >
                <Barbell size={40} color={brandPrimary[600]} />
              </View>
            )}

            {/* Nombre + metadata */}
            <Text className="text-[20px] font-jakarta-bold text-ui-text-main tracking-tight mt-4">
              {exercise.name}
            </Text>
            <Text className="text-[12px] font-manrope text-ui-text-muted mt-1">
              {labelOf(EXERCISE_CATEGORIES, exercise.category)} ·{" "}
              {labelOf(MUSCLE_GROUPS, exercise.muscle_group)}
            </Text>

            {exercise.is_unilateral ? (
              <View className="self-start mt-3 px-2.5 py-1 rounded-full bg-brandPrimary-50">
                <Text className="text-[11px] font-manrope-bold text-brandPrimary-600">
                  Unilateral
                </Text>
              </View>
            ) : null}

            {/* Video propio */}
            {videoUrl ? (
              <View className="mt-6">
                <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                  VIDEO
                </Text>
                <video
                  src={videoUrl}
                  controls
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    borderRadius: 12,
                    background: "#000",
                  }}
                />
              </View>
            ) : null}

            {/* YouTube */}
            {exercise.youtube_video_url ? (
              <View className="mt-6">
                <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                  VIDEO YOUTUBE
                </Text>
                <Pressable
                  onPress={() =>
                    window.open(
                      exercise.youtube_video_url,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="flex-row items-center gap-2 p-3 rounded-xl border border-ui-input-border bg-white hover:bg-ui-background-light"
                  style={{ cursor: "pointer" }}
                >
                  <Link size={14} color={brandPrimary[600]} />
                  <Text
                    className="flex-1 text-[12px] font-manrope-semi text-brandPrimary-600"
                    numberOfLines={1}
                  >
                    {exercise.youtube_video_url}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Instrucciones */}
            {exercise.instructions ? (
              <View className="mt-6">
                <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                  INSTRUCCIONES
                </Text>
                <Text className="text-[13px] font-manrope text-ui-text-main leading-5">
                  {exercise.instructions}
                </Text>
              </View>
            ) : null}

            {/* Acciones */}
            <View className="flex-row gap-3 mt-8">
              <Pressable
                onPress={() => onEdit(exercise)}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700"
                style={{ cursor: "pointer" }}
              >
                <Pencil size={14} color="#fff" />
                <Text className="text-[13px] font-manrope-bold text-white">
                  Editar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(exercise)}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-[11px] bg-red-50 hover:bg-red-100"
                style={{ cursor: "pointer" }}
              >
                <Trash size={14} color="#dc2626" />
                <Text className="text-[13px] font-manrope-bold text-red-600">
                  Eliminar
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
