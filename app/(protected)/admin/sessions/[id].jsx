// React Native
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRef, useState } from "react";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { eq, asc } from "drizzle-orm";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

// Base de datos
import { database } from "../../../../src/database";
import {
  sessions,
  session_exercises,
  exercises_base,
} from "../../../../src/database/schemas";

// Constantes
import { SESSION_LEVELS } from "../../../../src/constants/sessionOptions";

// Utils
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";

// Hooks
import {
  useDeleteSession,
  countPlansUsingSession,
} from "../../../../src/hooks/sessions/use-delete-session";
import { useRecordById } from "../../../../src/hooks/shared/use-record-by-id";

// Componentes
import SessionExerciseRow from "../../../../src/components/cards/SessionExerciseRow";
import VideoPlayerSheet from "../../../../src/components/videos/VideoPlayerSheet";

// Tema / assets
import { brandPrimary, gradient } from "../../../../src/theme/colors";
import { Barbell, ChartBar, Pencil, Trash } from "../../../../assets/icons";

const HERO_HEIGHT = 280;

export default function SessionDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();

  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const handleVideoPress = ({ url, kind, title }) => {
    setActiveVideo({ url, kind, title });
    videoSheetRef.current?.present();
  };

  const confirmAndDelete = () => {
    deleteSession(id, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: "success",
          text1: "Sesión eliminada",
          text2: `"${data?.name}" fue eliminada correctamente.`,
          position: "bottom",
        });
        router.replace("/admin/sessions");
      },
    });
  };

  const handleDelete = async () => {
    const plansUsing = await countPlansUsingSession(id);

    const title = "Eliminar sesión";
    const message =
      plansUsing > 0
        ? `Esta sesión está usada en ${plansUsing} ${plansUsing === 1 ? "plan" : "planes"}. Si la eliminás, esos planes perderán los ejercicios programados de los días que la usaban. ¿Continuar?`
        : `¿Seguro que querés eliminar "${data?.name}"? Esta acción no se puede deshacer.`;

    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: confirmAndDelete,
      },
    ]);
  };

  const { data: session, isLoading } = useRecordById("session", sessions, id);

  const { data: sessionExercises = [] } = useQuery({
    queryKey: ["session", id, "exercises"],
    enabled: !!id,
    queryFn: () =>
      database
        .select({
          id: session_exercises.id,
          position: session_exercises.position,
          exercise_name: exercises_base.name,
          exercise_muscle: exercises_base.muscle_group,
          image_uri: exercises_base.image_uri,
          video_uri: exercises_base.video_uri,
          youtube_video_url: exercises_base.youtube_video_url,
        })
        .from(session_exercises)
        .innerJoin(
          exercises_base,
          eq(session_exercises.exercise_id, exercises_base.id)
        )
        .where(eq(session_exercises.session_id, id))
        .orderBy(asc(session_exercises.position)),
  });

  const data = session ? { ...session, exercises: sessionExercises } : null;

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
          Sesión no encontrada
        </Text>
      </View>
    );
  }

  const levelLabel = SESSION_LEVELS.find((l) => l.value === data.level)?.label;

  const imageUri = data.cover_image_uri
    ? (getCloudinaryUrl(data.cover_image_uri) ?? data.cover_image_uri)
    : null;

  return (
    <>
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
              colors={gradient.primary}
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
              style={{
                borderWidth: 0.5,
                borderColor: "rgba(196,190,230,0.12)",
              }}
            >
              <Barbell size={28} color="rgba(196,190,230,0.4)" />
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-3 text-center">
                Esta sesión no tiene ejercicios asignados.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {data.exercises.map((ex, idx) => (
                <SessionExerciseRow
                  key={ex.id}
                  exercise={ex}
                  position={idx + 1}
                  onVideoPress={handleVideoPress}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Acciones ── */}
        <View className="px-5 mt-8" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/admin/sessions/builder?id=${id}`);
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
              <Text className="text-white font-jakarta-semi">
                Editar sesión
              </Text>
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
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Trash size={17} color="#ef4444" />
            )}
            <Text
              style={{
                color: "#ef4444",
                fontFamily: "PlusJakartaSans_600SemiBold",
                fontSize: 15,
              }}
            >
              {isDeleting ? "Eliminando…" : "Eliminar sesión"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <VideoPlayerSheet
        sheetRef={videoSheetRef}
        videoUrl={activeVideo?.url}
        title={activeVideo?.title}
      />
    </>
  );
}
