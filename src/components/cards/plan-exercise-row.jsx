// React Native
import { Pressable, Text, View } from "react-native";
import { useState } from "react";

// Librerías externas
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

// DB
import { database } from "../../database";
import {
  exercise_equipment as exerciseEquipmentTable,
  equipment as equipmentTable,
} from "../../database/schemas";

// Utils
import { getCloudinaryUrl, CLOUD_NAME } from "../../utils/cloudinary";

// Tema / assets
import { useGymTheme } from "../../contexts/gym-theme-context";
import { ChevronRight, Play, Youtube } from "../../../assets/icons";

// ─── Helpers de prescripción ────────────────────────────────────────────────

function resolveVideoLink(exercise) {
  const cloudVideo = exercise.video_uri
    ? (getCloudinaryUrl(exercise.video_uri) ?? exercise.video_uri)
    : null;
  if (cloudVideo) return { url: cloudVideo, kind: "video" };
  if (exercise.youtube_video_url)
    return { url: exercise.youtube_video_url, kind: "youtube" };
  return null;
}

// Resumen "N series · X–Y reps" para el header de la fila.
function buildSummary(exercise) {
  const n = exercise.sets.length;
  const series = `${n} ${n === 1 ? "serie" : "series"}`;
  const isDuration = (exercise.prescription_mode ?? "reps") === "duration";
  const values = isDuration
    ? exercise.sets.map((s) => s.duration_seconds).filter((v) => v != null)
    : exercise.sets
        .flatMap((s) => [s.reps_min, s.reps_max])
        .filter((v) => v != null);
  if (!values.length) return series;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const range = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `${series} · ${range}${isDuration ? "s" : " reps"}`;
}

// ─── Fila desplegable de un ejercicio prescrito ─────────────────────────────

export default function PlanExerciseRow({ exercise, position, onVideoPress, onEquipmentPress }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandSecondary } = useGymTheme();
  const MINT = brandSecondary[400];
  const [expanded, setExpanded] = useState(false);

  const imageUri = exercise.image_uri
    ? (getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri)
    : null;
  const videoLink = resolveVideoLink(exercise);
  const summary = buildSummary(exercise);

  const { data: equipmentList = [] } = useQuery({
    queryKey: ["plan_row_equipment", exercise.base_exercise_id],
    enabled: expanded && !!exercise.base_exercise_id,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const rows = await database
        .select({
          name: equipmentTable.name,
          image_uri: equipmentTable.image_uri,
          sync_status: exerciseEquipmentTable.sync_status,
        })
        .from(exerciseEquipmentTable)
        .innerJoin(
          equipmentTable,
          eq(exerciseEquipmentTable.equipment_id, equipmentTable.id)
        )
        .where(eq(exerciseEquipmentTable.exercise_id, exercise.base_exercise_id))
        .execute();
      return rows.filter((r) => r.sync_status !== "deleted");
    },
  });

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  };

  const handleVideo = () => {
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
      className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl overflow-hidden"
      style={{
        borderWidth: 0.5,
        borderColor: "rgba(196,190,230,0.12)",
      }}
    >
      {/* ── Header (toca para desplegar) ── */}
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center active:opacity-80"
        style={{ padding: 14, gap: 12 }}
      >
        {/* Thumbnail / posición */}
        <View
          className="items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: imageUri ? "transparent" : MINT + "22",
            borderWidth: 1,
            borderColor: MINT + "44",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <Text
              className="font-manrope-bold"
              style={{ color: isDark ? MINT : brandSecondary[700], fontSize: 14 }}
            >
              {position}
            </Text>
          )}
        </View>

        {/* Nombre + músculo + resumen */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            className="text-ui-text-main dark:text-ui-text-mainDark font-jakarta-bold"
            style={{ fontSize: 14, marginBottom: 3 }}
          >
            {exercise.exercise_name}
          </Text>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            {exercise.exercise_muscle ? (
              <Text
                numberOfLines={1}
                className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope-semi"
                style={{ fontSize: 12 }}
              >
                {exercise.exercise_muscle}
              </Text>
            ) : null}
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 2,
                backgroundColor: isDark ? MINT : brandSecondary[700],
              }}
            />
            <Text
              numberOfLines={1}
              className="font-manrope-bold"
              style={{ fontSize: 12, color: isDark ? MINT : brandSecondary[700] }}
            >
              {summary}
            </Text>
          </View>
        </View>

        {/* Botón de video */}
        {videoLink && (
          <Pressable
            onPress={handleVideo}
            hitSlop={8}
            className="active:opacity-70 items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                videoLink.kind === "youtube" ? "#ff000022" : MINT + "22",
              borderWidth: 1,
              borderColor:
                videoLink.kind === "youtube" ? "#ff000055" : MINT + "55",
              flexShrink: 0,
            }}
          >
            {videoLink.kind === "youtube" ? (
              <Youtube size={16} color="#ff4d4d" />
            ) : (
              <Play size={15} color={isDark ? MINT : brandSecondary[700]} />
            )}
          </Pressable>
        )}

        {/* Chevron de despliegue */}
        <ChevronRight
          size={16}
          color={isDark ? "rgba(255,255,255,0.4)" : "rgba(15,13,32,0.4)"}
          style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
        />
      </Pressable>

      {/* ── Detalle desplegable: solo instrucciones ── */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          {/* Divisor */}
          <View
            style={{
              height: 1,
              marginBottom: 12,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(15,13,32,0.06)",
            }}
          />

          <Text
            className="font-manrope-bold uppercase"
            style={{
              fontSize: 9,
              letterSpacing: 1.2,
              marginBottom: 4,
              color: isDark ? MINT : brandSecondary[700],
            }}
          >
            Cómo hacerlo
          </Text>
          <Text
            className="text-ui-text-muted dark:text-ui-text-mutedDark font-manrope"
            style={{ fontSize: 13, lineHeight: 19 }}
          >
            {exercise.exercise_instructions || "Sin instrucciones cargadas."}
          </Text>

          {/* Equipamiento */}
          {equipmentList.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text
                className="font-manrope-bold uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: 1.2,
                  marginBottom: 6,
                  color: isDark ? MINT : brandSecondary[700],
                }}
              >
                Equipamiento
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                {equipmentList.map((item, i) => {
                  const equipImgUri = item.image_uri
                    ? (getCloudinaryUrl(item.image_uri) ??
                        (!item.image_uri.startsWith("file://")
                          ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${item.image_uri}`
                          : null))
                    : null;
                  const chipContent = (
                    <>
                      {equipImgUri ? (
                        <Image
                          source={{ uri: equipImgUri }}
                          style={{ width: 20, height: 20, borderRadius: 4 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,13,32,0.08)",
                          }}
                        />
                      )}
                      <Text
                        className="text-ui-text-main dark:text-ui-text-mainDark font-manrope"
                        style={{ fontSize: 12 }}
                      >
                        {item.name}
                      </Text>
                    </>
                  );

                  const chipStyle = {
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    gap: 6,
                    borderColor: isDark
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(15,13,32,0.12)",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(15,13,32,0.04)",
                  };

                  return equipImgUri ? (
                    <Pressable
                      key={i}
                      className="flex-row items-center active:opacity-70"
                      style={chipStyle}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onEquipmentPress?.({ uri: equipImgUri, name: item.name });
                      }}
                    >
                      {chipContent}
                    </Pressable>
                  ) : (
                    <View
                      key={i}
                      className="flex-row items-center"
                      style={chipStyle}
                    >
                      {chipContent}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* YouTube */}
          {exercise.youtube_video_url ? (
            <View style={{ marginTop: 14 }}>
              <Text
                className="font-manrope-bold uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: 1.2,
                  marginBottom: 6,
                  color: isDark ? MINT : brandSecondary[700],
                }}
              >
                Video
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onVideoPress?.({
                    url: exercise.youtube_video_url,
                    kind: "youtube",
                    title: exercise.exercise_name,
                  });
                }}
                className="active:opacity-70 flex-row items-center self-start"
                style={{
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#ff000044",
                  backgroundColor: "#ff000011",
                }}
              >
                <Youtube size={14} color="#ff4d4d" />
                <Text
                  className="font-manrope-semi"
                  style={{ fontSize: 12, color: "#ff4d4d" }}
                >
                  Ver en YouTube
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
