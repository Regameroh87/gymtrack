// Drawer lateral de DETALLE de una sesión del catálogo (super_admin, web).
// Read-only: muestra metadata de la sesión y su lista de ejercicios (traída con
// useCatalogSessionExercises). Editar/Eliminar delegan a los flujos del section padre.
// Espeja _exercise-detail-web.jsx. Ver [[project_default_catalog]].
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";

import { useCatalogSessionExercises } from "../../../../../src/hooks/catalog/use-catalog-sessions-admin";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { SESSION_LEVELS } from "../../../../../src/constants/sessionOptions";
import { Barbell, Pencil, Trash, X } from "../../../../../assets/icons";

// Devuelve el label legible de un value crudo; si no hay match usa el value tal cual.
const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label ?? value;

export default function SessionDetailDrawer({
  session,
  onClose,
  onEdit,
  onDelete,
}) {
  const { brandPrimary } = useGymTheme();
  const { data: exercises = [], isLoading } = useCatalogSessionExercises(
    session?.id
  );
  if (!session) return null;

  const heroUrl = session.cover_image_uri
    ? getCloudinaryUrl(
        session.cover_image_uri,
        "w_480,h_480,c_fill,f_auto,q_auto"
      ) || session.cover_image_uri
    : null;
  const count = session.exercise_count ?? exercises.length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
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
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          >
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
              {session.name}
            </Text>
            <Text className="text-[12px] font-manrope text-ui-text-muted mt-1">
              {count} ejercicio{count === 1 ? "" : "s"}
              {session.level
                ? ` · ${labelOf(SESSION_LEVELS, session.level)}`
                : ""}
            </Text>

            {/* Descripción */}
            {session.description ? (
              <View className="mt-6">
                <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                  DESCRIPCIÓN
                </Text>
                <Text className="text-[13px] font-manrope text-ui-text-main leading-5">
                  {session.description}
                </Text>
              </View>
            ) : null}

            {/* Ejercicios */}
            <View className="mt-6">
              <Text className="text-[11px] font-manrope-bold text-ui-text-muted mb-2">
                EJERCICIOS
              </Text>
              {isLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color={brandPrimary[600]} />
                </View>
              ) : exercises.length === 0 ? (
                <Text className="text-[12px] font-manrope text-ui-text-muted py-2">
                  Esta sesión no tiene ejercicios.
                </Text>
              ) : (
                <View className="gap-y-2">
                  {exercises.map((ex, idx) => {
                    const thumb = ex.image_uri
                      ? getCloudinaryUrl(
                          ex.image_uri,
                          "w_72,h_72,c_fill,f_auto,q_auto"
                        ) || ex.image_uri
                      : null;
                    return (
                      <View
                        key={ex.id}
                        className="flex-row items-center gap-3 px-3 py-2 rounded-xl border border-ui-input-light bg-ui-background-light"
                      >
                        <Text className="text-[12px] font-manrope-bold text-ui-text-muted w-4">
                          {idx + 1}
                        </Text>
                        {thumb ? (
                          <Image
                            source={{ uri: thumb }}
                            style={{ width: 34, height: 34, borderRadius: 8 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="w-[34px] h-[34px] rounded-lg bg-brandPrimary-50 items-center justify-center">
                            <Barbell size={14} color={brandPrimary[600]} />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                            {ex.name}
                          </Text>
                          <Text className="text-[11px] font-manrope text-ui-text-muted capitalize">
                            {ex.muscle_group}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Acciones */}
            <View className="flex-row gap-3 mt-8">
              <Pressable
                onPress={() => onEdit(session)}
                className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700"
                style={{ cursor: "pointer" }}
              >
                <Pencil size={14} color="#fff" />
                <Text className="text-[13px] font-manrope-bold text-white">
                  Editar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(session)}
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
