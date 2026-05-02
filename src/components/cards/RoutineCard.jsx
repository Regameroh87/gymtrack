// React Native
import { View, Text, Pressable } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Constantes
import { ROUTINE_LEVELS } from "../../constants/routineOptions";

// Base de datos / utils
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Tema / assets
import { Clock, Barbell, ChartBar, ChevronRight } from "../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia:       { gradient: ["#1e1580", "#6366f1"], accent: "#6366f1" },
  fuerza:            { gradient: ["#7f1d1d", "#ef4444"], accent: "#ef4444" },
  perdida_grasa:     { gradient: ["#052e16", "#22c55e"], accent: "#22c55e" },
  resistencia:       { gradient: ["#0c4a6e", "#38bdf8"], accent: "#38bdf8" },
  acondicionamiento: { gradient: ["#78350f", "#f59e0b"], accent: "#f59e0b" },
  rehabilitacion:    { gradient: ["#3b0764", "#a855f7"], accent: "#a855f7" },
};

const OBJECTIVE_LABELS = {
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  perdida_grasa: "Pérdida de grasa",
  resistencia: "Resistencia",
  acondicionamiento: "Acondicionamiento",
  rehabilitacion: "Rehabilitación",
};

const STATUS_CONFIG = {
  activa:    { color: "#4ade80", label: "● Activa" },
  borrador:  { color: "rgba(255,255,255,0.5)", label: "◌ Borrador" },
  archivada: { color: "#fbbf24", label: "◆ Archivada" },
};

const CARD_HEIGHT = 210;

const RoutineCard = ({ routine, onPress }) => {
  const config = OBJECTIVE_CONFIG[routine.objective] ?? OBJECTIVE_CONFIG.hipertrofia;
  const status = STATUS_CONFIG[routine.status] ?? STATUS_CONFIG.borrador;
  const levelLabel = ROUTINE_LEVELS.find((l) => l.value === routine.level)?.label;
  const objectiveLabel = OBJECTIVE_LABELS[routine.objective];

  const imageUri = routine.cover_image_uri
    ? (getCloudinaryUrl(routine.cover_image_uri) ?? routine.cover_image_uri)
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(routine);
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: config.accent + "20",
          shadowColor: config.gradient[1],
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        {/* ── Área visual principal ── */}
        <View style={{ height: CARD_HEIGHT }}>
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
              {/* Círculos decorativos */}
              <View
                style={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  backgroundColor: "rgba(255,255,255,0.07)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 30,
                  right: 60,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: -30,
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: "rgba(0,0,0,0.15)",
                }}
              />
              {/* Ícono watermark */}
              <View
                style={{
                  position: "absolute",
                  right: 20,
                  top: 24,
                  opacity: 0.12,
                  transform: [{ rotate: "-12deg" }],
                }}
              >
                <Barbell size={72} color="white" />
              </View>
            </LinearGradient>
          )}

          {/* Overlay oscuro inferior */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.82)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: CARD_HEIGHT * 0.75,
            }}
          />

          {/* Status badge — glass top right */}
          <View style={{ position: "absolute", top: 14, right: 14 }}>
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.38)",
                borderWidth: 0.5,
                borderColor: "rgba(255,255,255,0.25)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Text
                style={{ color: status.color, fontSize: 11, fontFamily: "Manrope_600SemiBold" }}
              >
                {status.label}
              </Text>
            </View>
          </View>

          {/* Objetivo tag — top left */}
          {objectiveLabel && (
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
                  style={{ color: config.accent, fontSize: 11, fontFamily: "Manrope_600SemiBold" }}
                >
                  {objectiveLabel}
                </Text>
              </View>
            </View>
          )}

          {/* Nombre sobre imagen */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 16,
              paddingBottom: 16,
            }}
          >
            <Text
              style={{ color: "white", fontSize: 21, fontFamily: "PlusJakartaSans_700Bold", lineHeight: 26 }}
              numberOfLines={2}
            >
              {routine.name}
            </Text>
          </View>
        </View>

        {/* ── Footer: stats + CTA ── */}
        <View
          className="bg-ui-surface-light dark:bg-ui-surface-dark"
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 14,
            paddingVertical: 13,
            borderTopWidth: 0.5,
            borderTopColor: "rgba(196,190,230,0.15)",
          }}
        >
          {/* Stats: dos filas */}
          <View style={{ flex: 1, minWidth: 0, gap: 7, marginRight: 12 }}>
            {/* Fila 1: duración + ejercicios */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Clock size={13} color="rgba(196,190,230,0.55)" />
                <Text
                  numberOfLines={1}
                  className="text-ui-text-main dark:text-ui-text-mainDark"
                  style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
                >
                  {routine.estimated_duration_min != null
                    ? `${routine.estimated_duration_min} min`
                    : "—"}
                </Text>
              </View>

              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "rgba(196,190,230,0.3)" }} />

              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
                <Barbell size={13} color="rgba(196,190,230,0.55)" />
                <Text
                  numberOfLines={1}
                  className="text-ui-text-main dark:text-ui-text-mainDark"
                  style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
                >
                  {routine.exercise_count > 0
                    ? `${routine.exercise_count} ejercicios`
                    : "Sin ejercicios"}
                </Text>
              </View>
            </View>

            {/* Fila 2: nivel */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <ChartBar size={13} color="rgba(196,190,230,0.55)" />
              <Text
                numberOfLines={1}
                className="text-ui-text-main dark:text-ui-text-mainDark"
                style={{ fontSize: 13, fontFamily: "Manrope_700Bold" }}
              >
                {levelLabel ?? "Sin nivel"}
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: config.accent + "26",
              borderWidth: 1,
              borderColor: config.accent + "55",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={15} color={config.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default RoutineCard;
