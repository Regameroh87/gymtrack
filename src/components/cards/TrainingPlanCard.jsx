// React Native
import { Pressable, Text, View } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Utilidades
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Tema / assets
import { Calendar, ChevronRight, ClipboardList } from "../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia: { gradient: ["#1e1580", "#6366f1"], accent: "#6366f1" },
  fuerza: { gradient: ["#7f1d1d", "#ef4444"], accent: "#ef4444" },
  perdida_grasa: { gradient: ["#052e16", "#22c55e"], accent: "#22c55e" },
  resistencia: { gradient: ["#0c4a6e", "#38bdf8"], accent: "#38bdf8" },
  acondicionamiento: { gradient: ["#78350f", "#f59e0b"], accent: "#f59e0b" },
  rehabilitacion: { gradient: ["#3b0764", "#a855f7"], accent: "#a855f7" },
};

const OBJECTIVE_LABELS = {
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  perdida_grasa: "Pérdida de grasa",
  resistencia: "Resistencia",
  acondicionamiento: "Acondicionamiento",
  rehabilitacion: "Rehabilitación",
};

const TrainingPlanCard = ({ plan, onPress }) => {
  const config =
    OBJECTIVE_CONFIG[plan.objective] ?? OBJECTIVE_CONFIG.hipertrofia;

  const objectiveLabel = OBJECTIVE_LABELS[plan.objective];

  const imageUri = plan.cover_image_uri
    ? (getCloudinaryUrl(plan.cover_image_uri) ?? plan.cover_image_uri)
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(plan);
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden border border-brandPrimary-700/10 shadow-[0_8px_18px_rgba(74,68,228,0.18)]"
        style={{ elevation: 6 }}
      >
        {/* ── Área visual principal ── */}
        <View className="h-[210px]">
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1"
          >
            <View className="absolute -top-[50px] -right-[50px] w-[220px] h-[220px] rounded-full bg-[rgba(255,255,255,0.07)]" />
            <View className="absolute top-[30px] right-[60px] w-[120px] h-[120px] rounded-full bg-[rgba(255,255,255,0.05)]" />
            <View className="absolute -bottom-[20px] -left-[30px] w-[150px] h-[150px] rounded-full bg-[rgba(0,0,0,0.15)]" />
            <View className="absolute right-5 top-6 opacity-[0.12] -rotate-12">
              <ClipboardList size={72} color="white" />
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.82)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="absolute bottom-0 left-0 right-0 h-[157.5px]"
          />

          {/* Objetivo tag — top left */}
          {objectiveLabel && (
            <View className="absolute top-[14px] left-[14px]">
              <View
                className="rounded-full border-[0.5px] px-2.5 py-1.5"
                style={{
                  backgroundColor: config.accent + "33",
                  borderColor: config.accent + "66",
                }}
              >
                <Text
                  className="font-manrope-semi text-[11px]"
                  style={{ color: config.accent }}
                >
                  {objectiveLabel}
                </Text>
              </View>
            </View>
          )}

          {/* Nombre */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <Text
              className="font-jakarta-bold text-[21px] leading-[26px] text-white"
              numberOfLines={2}
            >
              {plan.name}
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View className="flex-row items-center border-t-[0.5px] border-t-[rgba(196,190,230,0.15)] bg-ui-surface-light py-[13px] pl-4 pr-[14px] dark:bg-ui-surface-dark">
          <View className="mr-3 flex-1 min-w-0 gap-[7px]">
            <View className="flex-row items-center gap-[14px]">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={13} color="rgba(196,190,230,0.55)" />
                <Text
                  numberOfLines={1}
                  className="font-manrope-bold text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
                >
                  {plan.day_count} días
                </Text>
              </View>
            </View>
          </View>

          <View
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1px]"
            style={{
              backgroundColor: config.accent + "26",
              borderColor: config.accent + "55",
            }}
          >
            <ChevronRight size={15} color={config.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default TrainingPlanCard;
