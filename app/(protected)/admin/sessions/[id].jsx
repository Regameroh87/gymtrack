// React Native
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { eq, asc } from "drizzle-orm";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// Base de datos
import { database } from "../../../../src/database";
import {
  sessions,
  session_exercises,
  exercises_base,
} from "../../../../src/database/schemas";

// Constantes
import { ROUTINE_LEVELS } from "../../../../src/constants/routineOptions";

// Utils
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";

// Hooks
import { useDeleteRoutine } from "../../../../src/hooks/useDeleteRoutine";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";
import {
  Clock,
  Barbell,
  ChartBar,
  Pencil,
  Trash,
} from "../../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia: {
    gradient: ["#1e1580", "#6366f1"],
    accent: "#6366f1",
    label: "Hipertrofia",
  },
  fuerza: {
    gradient: ["#7f1d1d", "#ef4444"],
    accent: "#ef4444",
    label: "Fuerza",
  },
  perdida_grasa: {
    gradient: ["#052e16", "#22c55e"],
    accent: "#22c55e",
    label: "Pérdida de grasa",
  },
  resistencia: {
    gradient: ["#0c4a6e", "#38bdf8"],
    accent: "#38bdf8",
    label: "Resistencia",
  },
  acondicionamiento: {
    gradient: ["#78350f", "#f59e0b"],
    accent: "#f59e0b",
    label: "Acondicionamiento",
  },
  rehabilitacion: {
    gradient: ["#3b0764", "#a855f7"],
    accent: "#a855f7",
    label: "Rehabilitación",
  },
};

const HERO_HEIGHT = 280;

function prescriptionLabel(ex) {
  const sets = ex.sets ?? 3;
  if (ex.prescription_mode === "duration" && ex.duration_seconds) {
    return `${sets} × ${ex.duration_seconds}s`;
  }
  const min = ex.reps_min;
  const max = ex.reps_max;
  if (min != null && max != null && min !== max) {
    return `${sets} × ${min}–${max} reps`;
  }
  if (min != null) return `${sets} × ${min} reps`;
  return `${sets} series`;
}

function intensityLabel(ex) {
  if (ex.intensity_mode === "rir" && ex.rir != null) return `RIR ${ex.rir}`;
  if (ex.intensity_mode === "rpe" && ex.rpe != null) return `RPE ${ex.rpe}`;
  return null;
}

export default function RoutineDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { mutate: deleteSession, isPending: isDeleting } = useDeleteRoutine();

  const handleDelete = () => {
    Alert.alert(
      "Eliminar sesión",
      `¿Seguro que querés eliminar "${data?.name}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteSession(id, { onSuccess: () => router.back() }),
        },
      ]
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ["routine", id],
    queryFn: async () => {
      const [routine] = await database
        .select()
        .from(sessions)
        .where(eq(sessions.id, id));

      if (!routine) return null;

      const exercises = await database
        .select({
          id: session_exercises.id,
          position: session_exercises.position,
          sets: session_exercises.sets,
          prescription_mode: session_exercises.prescription_mode,
          reps_min: session_exercises.reps_min,
          reps_max: session_exercises.reps_max,
          duration_seconds: session_exercises.duration_seconds,
          rest_seconds: session_exercises.rest_seconds,
          intensity_mode: session_exercises.intensity_mode,
          rir: session_exercises.rir,
          rpe: session_exercises.rpe,
          notes: session_exercises.notes,
          exercise_name: exercises_base.name,
          exercise_muscle: exercises_base.muscle_group,
        })
        .from(session_exercises)
        .innerJoin(
          exercises_base,
          eq(session_exercises.exercise_id, exercises_base.id)
        )
        .where(eq(session_exercises.session_id, id))
        .orderBy(asc(session_exercises.position));

      return { ...routine, exercises };
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[500]} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope">
          Rutina no encontrada
        </Text>
      </View>
    );
  }

  const config =
    OBJECTIVE_CONFIG[data.objective] ?? OBJECTIVE_CONFIG.hipertrofia;
  const levelLabel = ROUTINE_LEVELS.find((l) => l.value === data.level)?.label;

  const imageUri = data.cover_image_uri
    ? (getCloudinaryUrl(data.cover_image_uri) ?? data.cover_image_uri)
    : null;

  return (
    <ScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={{ height: HERO_HEIGHT }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            <View
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 280,
                height: 280,
                borderRadius: 140,
                backgroundColor: "rgba(255,255,255,0.07)",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 50,
                right: 80,
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -30,
                left: -40,
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: "rgba(0,0,0,0.15)",
              }}
            />
            <View
              style={{
                position: "absolute",
                right: 24,
                top: 30,
                opacity: 0.12,
                transform: [{ rotate: "-12deg" }],
              }}
            >
              <Barbell size={96} color="white" />
            </View>
          </LinearGradient>
        )}

        {/* Overlay oscuro inferior */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: HERO_HEIGHT * 0.7,
          }}
        />

        {/* Objetivo tag — top left */}
        {config.label && (
          <View style={{ position: "absolute", top: 14, left: 14 }}>
            <View
              style={{
                backgroundColor: config.accent + "33",
                borderWidth: 0.5,
                borderColor: config.accent + "66",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: config.accent,
                  fontSize: 11,
                  fontFamily: "Manrope_600SemiBold",
                }}
              >
                {config.label}
              </Text>
            </View>
          </View>
        )}

        {/* Nombre + nivel — bottom overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          {levelLabel && (
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontFamily: "Manrope_600SemiBold",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {levelLabel}
            </Text>
          )}
          <Text
            style={{
              color: "white",
              fontSize: 26,
              fontFamily: "PlusJakartaSans_700Bold",
              lineHeight: 32,
            }}
            numberOfLines={2}
          >
            {data.name}
          </Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View
        className="bg-ui-surface-light dark:bg-ui-surface-dark"
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingVertical: 14,
          gap: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: "rgba(196,190,230,0.15)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Clock size={14} color="rgba(196,190,230,0.55)" />
          <Text
            className="text-ui-text-main dark:text-ui-text-mainDark"
            style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
          >
            {data.estimated_duration_min != null
              ? `${data.estimated_duration_min} min`
              : "—"}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: "rgba(196,190,230,0.2)" }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Barbell size={14} color="rgba(196,190,230,0.55)" />
          <Text
            className="text-ui-text-main dark:text-ui-text-mainDark"
            style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
          >
            {data.exercises.length > 0
              ? `${data.exercises.length} ejercicios`
              : "Sin ejercicios"}
          </Text>
        </View>

        {levelLabel && (
          <>
            <View
              style={{ width: 1, backgroundColor: "rgba(196,190,230,0.2)" }}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <ChartBar size={14} color="rgba(196,190,230,0.55)" />
              <Text
                className="text-ui-text-main dark:text-ui-text-mainDark"
                style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
              >
                {levelLabel}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ── Descripción ── */}
      {data.description ? (
        <View className="px-5 pt-5">
          <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
            Descripción
          </Text>
          <Text className="text-sm font-manrope leading-relaxed text-ui-text-main dark:text-ui-text-mainDark">
            {data.description}
          </Text>
        </View>
      ) : null}

      {/* ── Ejercicios ── */}
      <View className="px-5 pt-6">
        <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest text-ui-text-muted dark:text-ui-text-mutedDark mb-4">
          Ejercicios
        </Text>

        {data.exercises.length === 0 ? (
          <View
            className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl p-6 items-center"
            style={{ borderWidth: 0.5, borderColor: "rgba(196,190,230,0.12)" }}
          >
            <Barbell size={28} color="rgba(196,190,230,0.4)" />
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-3 text-center">
              Esta rutina no tiene ejercicios asignados.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {data.exercises.map((ex, idx) => {
              const intensity = intensityLabel(ex);
              return (
                <View
                  key={ex.id}
                  className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderWidth: 0.5,
                    borderColor: "rgba(196,190,230,0.12)",
                    gap: 12,
                  }}
                >
                  {/* Número de posición */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: config.accent + "22",
                      borderWidth: 1,
                      borderColor: config.accent + "44",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        color: config.accent,
                        fontSize: 13,
                        fontFamily: "Manrope_700Bold",
                      }}
                    >
                      {idx + 1}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      className="text-ui-text-main dark:text-ui-text-mainDark"
                      style={{
                        fontSize: 14,
                        fontFamily: "PlusJakartaSans_700Bold",
                        marginBottom: 3,
                      }}
                    >
                      {ex.exercise_name}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{
                          color: config.accent,
                          fontSize: 12,
                          fontFamily: "Manrope_700Bold",
                        }}
                      >
                        {prescriptionLabel(ex)}
                      </Text>

                      {ex.rest_seconds != null && (
                        <>
                          <Text
                            style={{
                              color: "rgba(196,190,230,0.35)",
                              fontSize: 10,
                            }}
                          >
                            ·
                          </Text>
                          <Text
                            className="text-ui-text-muted dark:text-ui-text-mutedDark"
                            style={{
                              fontSize: 12,
                              fontFamily: "Manrope_600SemiBold",
                            }}
                          >
                            {ex.rest_seconds}s descanso
                          </Text>
                        </>
                      )}

                      {intensity && (
                        <>
                          <Text
                            style={{
                              color: "rgba(196,190,230,0.35)",
                              fontSize: 10,
                            }}
                          >
                            ·
                          </Text>
                          <Text
                            style={{
                              color: config.accent,
                              fontSize: 12,
                              fontFamily: "Manrope_600SemiBold",
                              opacity: 0.75,
                            }}
                          >
                            {intensity}
                          </Text>
                        </>
                      )}
                    </View>

                    {ex.notes ? (
                      <Text
                        numberOfLines={1}
                        className="text-ui-text-muted dark:text-ui-text-mutedDark"
                        style={{
                          fontSize: 11,
                          fontFamily: "Manrope_400Regular",
                          marginTop: 3,
                        }}
                      >
                        {ex.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Acciones ── */}
      <View className="px-5 mt-8" style={{ gap: 12 }}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/admin/routines/builder?id=${id}`);
          }}
          className="active:scale-[0.97]"
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-2xl items-center flex-row justify-center"
            style={{ gap: 8 }}
          >
            <Pencil size={17} color="white" />
            <Text className="text-white font-jakarta-semi">Editar rutina</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={isDeleting}
          className="active:scale-[0.97]"
          style={{
            borderWidth: 1,
            borderColor: "#ef444466",
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: isDeleting ? 0.5 : 1,
          }}
        >
          <Trash size={17} color="#ef4444" />
          <Text
            style={{
              color: "#ef4444",
              fontFamily: "PlusJakartaSans_600SemiBold",
              fontSize: 15,
            }}
          >
            {isDeleting ? "Eliminando…" : "Eliminar rutina"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
