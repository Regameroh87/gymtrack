import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

import { brandPrimary, brandSecondary, ui } from "../../../src/theme/colors.js";
import {
  ChevronRight,
  Youtube,
  Play,
  Barbell,
} from "../../../assets/icons.jsx";

import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary";
import { usePlanDayExercises } from "../../../src/hooks/plans/use-plan-day-exercises";
import { sessionDraftKey } from "../../../src/hooks/sessions/use-session-draft";
import { getCloudinaryUrl } from "../../../src/utils/cloudinary";
import { formatShortDate } from "../../../src/utils/format-date";
import Screen from "../../../src/components/Screen.jsx";
import VideoPlayerSheet from "../../../src/components/videos/VideoPlayerSheet";

const BRAND_PRIMARY = brandPrimary[700];
const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 20;
const GAP = 12;
const CARD_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

function resolveVideoLink(exercise) {
  const cloudVideo = exercise.video_uri
    ? (getCloudinaryUrl(exercise.video_uri) ?? exercise.video_uri)
    : null;
  if (cloudVideo) return { url: cloudVideo, kind: "video" };
  if (exercise.youtube_video_url)
    return { url: exercise.youtube_video_url, kind: "youtube" };
  return null;
}

function ExerciseMiniCard({ exercise, position, onVideoPress, isDark }) {
  const MINT = brandSecondary[400];
  const imageUri = exercise.image_uri
    ? (getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;
  const videoLink = resolveVideoLink(exercise);
  const seriesLabel = `${exercise.sets.length} ${exercise.sets.length === 1 ? "serie" : "series"}`;

  return (
    <Screen safe>
      <View
        style={{
          width: CARD_W,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: isDark ? "#1a1828" : "#f5f4fb",
          borderWidth: 0.5,
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,13,32,0.08)",
        }}
      >
        {/* Thumbnail */}
        <View style={{ height: CARD_W * 0.72, position: "relative" }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: MINT + "18",
              }}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 24,
                  color: isDark ? MINT : brandSecondary[700],
                }}
              >
                {position}
              </Text>
            </View>
          )}

          {imageUri && (
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 36,
              }}
            />
          )}

          {videoLink ? (
            <Pressable
              onPress={() =>
                onVideoPress?.({
                  url: videoLink.url,
                  title: exercise.exercise_name,
                })
              }
              hitSlop={8}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  videoLink.kind === "youtube"
                    ? "rgba(255,0,0,0.22)"
                    : MINT + "33",
                borderWidth: 1,
                borderColor:
                  videoLink.kind === "youtube"
                    ? "rgba(255,0,0,0.7)"
                    : MINT + "99",
              }}
            >
              {videoLink.kind === "youtube" ? (
                <Youtube size={12} color="#ff4d4d" />
              ) : (
                <Play size={11} color={MINT} />
              )}
            </Pressable>
          ) : null}

          {!imageUri && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,13,32,0.06)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Manrope_700Bold",
                  fontSize: 10,
                  color: isDark
                    ? "rgba(255,255,255,0.4)"
                    : "rgba(15,13,32,0.4)",
                }}
              >
                {position}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={{ padding: 10, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 13,
              color: isDark ? "#f5f4fb" : "#0f0d20",
            }}
          >
            {exercise.exercise_name}
          </Text>
          {exercise.exercise_muscle ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "Manrope_600SemiBold",
                fontSize: 11,
                color: isDark
                  ? "rgba(255,255,255,0.45)"
                  : "rgba(15,13,32,0.45)",
              }}
            >
              {exercise.exercise_muscle}
            </Text>
          ) : null}
          <Text
            style={{
              fontFamily: "Manrope_700Bold",
              fontSize: 11,
              color: isDark ? MINT : brandSecondary[700],
              marginTop: 1,
            }}
          >
            {seriesLabel}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

export default function SesionOverview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const videoSheetRef = useRef(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const { data: summary, isLoading: loadingSummary } = useActivePlanSummary();
  const currentDay = summary?.currentDay ?? null;
  const { data: dayExercises = [], isLoading: loadingExercises } =
    usePlanDayExercises(currentDay?.id);

  const [draftChecked, setDraftChecked] = useState(false);
  useEffect(() => {
    if (!currentDay?.id) return;
    AsyncStorage.getItem(sessionDraftKey(currentDay.id)).then((raw) => {
      if (raw) {
        router.replace("/(protected)/sesion-active/activa");
      } else {
        setDraftChecked(true);
      }
    });
  }, [currentDay?.id]);

  const session = useMemo(() => {
    if (!summary || !currentDay) return null;
    const estimatedMinutes = Math.round(
      dayExercises.reduce((acc, ex) => {
        const perSet = (ex.rest_seconds ?? 90) + 45;
        return acc + ex.sets.length * perSet;
      }, 0) / 60
    );
    const rawCover = dayExercises.find((e) => e.image_uri)?.image_uri;
    return {
      planName: summary.plan.name,
      dayLabel: `Día ${currentDay.day_number}`,
      weekNumber: currentDay.week_number,
      sessionName: currentDay.session?.name ?? summary.plan.name,
      exercises: dayExercises,
      estimatedMinutes,
      coverUri: rawCover ? (getCloudinaryUrl(rawCover) ?? rawCover) : null,
    };
  }, [summary, currentDay, dayExercises]);

  const totalSets = useMemo(
    () => (session?.exercises ?? []).reduce((s, ex) => s + ex.sets.length, 0),
    [session]
  );

  const handleVideoPress = ({ url, title }) => {
    setActiveVideo({ url, title });
    videoSheetRef.current?.present();
  };

  const dateLabel = formatShortDate();

  if (
    loadingSummary ||
    (currentDay && loadingExercises) ||
    (!draftChecked && currentDay)
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center px-10 bg-ui-background-light dark:bg-ui-background-dark">
        <Text className="font-jakarta-bold text-center text-lg mb-1.5 text-ui-text-main dark:text-ui-text-mainDark">
          No tenés una sesión pendiente
        </Text>
        <Text className="font-manrope text-center text-sm text-ui-text-muted dark:text-ui-text-mutedDark">
          {summary?.isCompleted
            ? "Completaste todo el plan. ¡Buen trabajo!"
            : "Cuando tengas un plan activo, tu próxima sesión va a aparecer acá."}
        </Text>
      </View>
    );
  }

  if (session.exercises.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-10 bg-ui-background-light dark:bg-ui-background-dark">
        <Barbell size={32} color={isDark ? ui.text.mutedDark : ui.text.muted} />
        <Text className="font-jakarta-bold text-center text-lg mt-3.5 text-ui-text-main dark:text-ui-text-mainDark">
          {session.sessionName}
        </Text>
        <Text className="font-manrope text-center text-sm mt-1.5 text-ui-text-muted dark:text-ui-text-mutedDark">
          Esta sesión todavía no tiene ejercicios cargados.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Caratula / Cover card ── */}
        <View
          style={{
            margin: H_PAD,
            borderRadius: 28,
            overflow: "hidden",
            height: 230,
          }}
        >
          {session.coverUri ? (
            <Image
              source={{ uri: session.coverUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[brandPrimary[500], brandPrimary[800]]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{ flex: 1 }}
            />
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: 20,
              justifyContent: "space-between",
            }}
          >
            {/* Top: plan badge + fecha */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Manrope_700Bold",
                    fontSize: 9,
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {session.planName}
                  {session.weekNumber ? ` · S${session.weekNumber}` : ""}
                  {` · ${session.dayLabel}`}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {dateLabel}
              </Text>
            </View>

            {/* Bottom: nombre + stats */}
            <View>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 26,
                  lineHeight: 31,
                  letterSpacing: -0.8,
                  color: "white",
                  marginBottom: 14,
                }}
              >
                {session.sessionName}
              </Text>

              <View style={{ flexDirection: "row", gap: 18 }}>
                {[
                  { value: `${session.estimatedMinutes}'`, label: "min" },
                  {
                    value: `${session.exercises.length}`,
                    label:
                      session.exercises.length === 1
                        ? "ejercicio"
                        : "ejercicios",
                  },
                  { value: `${totalSets}`, label: "series" },
                ].map((stat, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        fontSize: 18,
                        letterSpacing: -0.3,
                        color: "white",
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Manrope_400Regular",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.6)",
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Mini-cards grid 2 columnas ── */}
        <View style={{ paddingHorizontal: H_PAD }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: brandSecondary[400],
              }}
            />
            <Text
              style={{
                fontFamily: "Manrope_700Bold",
                fontSize: 10,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                color: isDark ? brandSecondary[400] : brandSecondary[700],
              }}
            >
              Ejercicios
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,13,32,0.06)",
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: GAP,
              marginBottom: 28,
            }}
          >
            {session.exercises.map((ex, idx) => (
              <ExerciseMiniCard
                key={ex.id}
                exercise={ex}
                position={idx + 1}
                onVideoPress={handleVideoPress}
                isDark={isDark}
              />
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(protected)/sesion-active/ejercicios");
            }}
          >
            <LinearGradient
              colors={[brandPrimary[700], brandPrimary[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 22,
                paddingVertical: 20,
                paddingHorizontal: 26,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                shadowColor: BRAND_PRIMARY,
                shadowOpacity: 0.55,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 17,
                  letterSpacing: -0.3,
                  color: "white",
                }}
              >
                Ver ejercicios
              </Text>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <ChevronRight size={17} color="white" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      <VideoPlayerSheet
        sheetRef={videoSheetRef}
        videoUrl={activeVideo?.url}
        title={activeVideo?.title}
      />
    </View>
  );
}
