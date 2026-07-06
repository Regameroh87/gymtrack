// React Native
import { Pressable, Text, View } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

// Utils
import { getMediaUrl } from "@gymtrack/core/media";

// Tema / assets
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Play, Youtube } from "../../../assets/icons";

function resolveVideoLink(exercise) {
  const cloudVideo = exercise.video_uri
    ? (getMediaUrl(exercise.video_uri) ?? exercise.video_uri)
    : null;
  if (cloudVideo) return { url: cloudVideo, kind: "video" };
  if (exercise.youtube_video_url)
    return { url: exercise.youtube_video_url, kind: "youtube" };
  return null;
}

export default function SessionExerciseRow({
  exercise,
  position,
  accent,
  compact = false,
  onVideoPress,
}) {
  const { brandPrimary } = useGymTheme();
  accent = accent ?? brandPrimary[500];
  const imageUri = exercise.image_uri
    ? (getMediaUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;
  const videoLink = resolveVideoLink(exercise);

  const thumbSize = compact ? 36 : 48;
  const positionBadge = compact ? 16 : 18;

  const handleOpenVideo = () => {
    if (!videoLink) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVideoPress?.({
      url: videoLink.url,
      kind: videoLink.kind,
      title: exercise.exercise_name,
    });
  };

  return (
    <View
      className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl flex-row items-center"
      style={{
        padding: compact ? 10 : 14,
        borderWidth: 0.5,
        borderColor: "rgba(196,190,230,0.12)",
        gap: compact ? 10 : 12,
      }}
    >
      {/* Thumbnail / Position */}
      <View
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: compact ? 10 : 12,
          backgroundColor: imageUri ? "transparent" : accent + "22",
          borderWidth: 1,
          borderColor: accent + "44",
          flexShrink: 0,
          overflow: "hidden",
          position: "relative",
        }}
        className="items-center justify-center"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text
            style={{
              color: accent,
              fontSize: compact ? 12 : 14,
              fontFamily: "Manrope_700Bold",
            }}
          >
            {position}
          </Text>
        )}

        {imageUri && (
          <View
            style={{
              position: "absolute",
              top: 2,
              left: 2,
              minWidth: positionBadge,
              height: positionBadge,
              paddingHorizontal: 4,
              borderRadius: positionBadge / 2,
              backgroundColor: "rgba(0,0,0,0.65)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 9,
                fontFamily: "Manrope_700Bold",
              }}
            >
              {position}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          className="text-ui-text-main dark:text-ui-text-mainDark"
          style={{
            fontSize: compact ? 13 : 14,
            fontFamily: "PlusJakartaSans_700Bold",
            marginBottom: 3,
          }}
        >
          {exercise.exercise_name}
        </Text>

        {exercise.exercise_muscle ? (
          <Text
            numberOfLines={1}
            className="text-ui-text-muted dark:text-ui-text-mutedDark"
            style={{
              fontSize: compact ? 11 : 12,
              fontFamily: "Manrope_600SemiBold",
            }}
          >
            {exercise.exercise_muscle}
          </Text>
        ) : null}
      </View>

      {videoLink && (
        <Pressable
          onPress={handleOpenVideo}
          hitSlop={8}
          className="active:opacity-70"
          style={{
            width: compact ? 30 : 36,
            height: compact ? 30 : 36,
            borderRadius: compact ? 15 : 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              videoLink.kind === "youtube" ? "#ff000022" : accent + "22",
            borderWidth: 1,
            borderColor:
              videoLink.kind === "youtube" ? "#ff000055" : accent + "55",
            flexShrink: 0,
          }}
        >
          {videoLink.kind === "youtube" ? (
            <Youtube size={compact ? 14 : 16} color="#ff4d4d" />
          ) : (
            <Play size={compact ? 13 : 15} color={accent} />
          )}
        </Pressable>
      )}
    </View>
  );
}
