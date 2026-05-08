// React Native
import { Linking, Pressable, Text, View } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

// Utils
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Tema / assets
import { brandPrimary } from "../../theme/colors";
import { Play, Youtube } from "../../../assets/icons";

export function prescriptionLabel(ex) {
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

export function intensityLabel(ex) {
  if (ex.intensity_mode === "rir" && ex.rir != null) return `RIR ${ex.rir}`;
  if (ex.intensity_mode === "rpe" && ex.rpe != null) return `RPE ${ex.rpe}`;
  return null;
}

function resolveVideoLink(exercise) {
  const cloudVideo = exercise.video_uri
    ? (getCloudinaryUrl(exercise.video_uri) ?? exercise.video_uri)
    : null;
  if (cloudVideo) return { url: cloudVideo, kind: "video" };
  if (exercise.youtube_video_url)
    return { url: exercise.youtube_video_url, kind: "youtube" };
  return null;
}

export default function SessionExerciseRow({
  exercise,
  position,
  accent = brandPrimary[500],
  compact = false,
  showNotes = true,
}) {
  const intensity = intensityLabel(exercise);
  const imageUri = exercise.image_uri
    ? (getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;
  const videoLink = resolveVideoLink(exercise);

  const thumbSize = compact ? 36 : 48;
  const positionBadge = compact ? 16 : 18;

  const handleOpenVideo = async () => {
    if (!videoLink) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const supported = await Linking.canOpenURL(videoLink.url);
    if (supported) Linking.openURL(videoLink.url);
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
              color: accent,
              fontSize: compact ? 11 : 12,
              fontFamily: "Manrope_700Bold",
            }}
          >
            {prescriptionLabel(exercise)}
          </Text>

          {!compact && exercise.rest_seconds != null && (
            <>
              <Text style={{ color: "rgba(196,190,230,0.35)", fontSize: 10 }}>
                ·
              </Text>
              <Text
                className="text-ui-text-muted dark:text-ui-text-mutedDark"
                style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold" }}
              >
                {exercise.rest_seconds}s descanso
              </Text>
            </>
          )}

          {intensity && (
            <>
              <Text style={{ color: "rgba(196,190,230,0.35)", fontSize: 10 }}>
                ·
              </Text>
              <Text
                style={{
                  color: accent,
                  fontSize: compact ? 11 : 12,
                  fontFamily: "Manrope_600SemiBold",
                  opacity: 0.75,
                }}
              >
                {intensity}
              </Text>
            </>
          )}
        </View>

        {showNotes && exercise.notes ? (
          <Text
            numberOfLines={1}
            className="text-ui-text-muted dark:text-ui-text-mutedDark"
            style={{
              fontSize: 11,
              fontFamily: "Manrope_400Regular",
              marginTop: 3,
            }}
          >
            {exercise.notes}
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
