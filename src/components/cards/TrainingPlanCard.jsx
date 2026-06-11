// React Native
import { Pressable, StyleSheet, Text, View } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Utilidades
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Constantes
import { PLAN_GENDER_BADGES } from "../../constants/gender-options";

// Tema / assets
import {
  Barbell,
  Calendar,
  ChartBar,
  ChevronRight,
  Clock,
  Logs,
  ShieldHalf,
} from "../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia: { Icon: Barbell },
  fuerza: { Icon: Barbell },
  perdida_grasa: { Icon: ChartBar },
  resistencia: { Icon: Clock },
  acondicionamiento: { Icon: Logs },
  rehabilitacion: { Icon: ShieldHalf },
};

const OBJECTIVE_LABELS = {
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  perdida_grasa: "Pérdida de grasa",
  resistencia: "Resistencia",
  acondicionamiento: "Acondicionamiento",
  rehabilitacion: "Rehabilitación",
};

const TrainingPlanCard = ({ plan, onPress, isDraft = false }) => {
  const config =
    OBJECTIVE_CONFIG[plan.objective] ?? OBJECTIVE_CONFIG.hipertrofia;
  const { Icon } = config;
  const objectiveLabel = OBJECTIVE_LABELS[plan.objective];
  const genderBadge = PLAN_GENDER_BADGES[plan.target_gender];

  const imageUrl = plan.cover_image_uri
    ? plan.cover_image_uri.startsWith("file://")
      ? plan.cover_image_uri
      : getCloudinaryUrl(
          plan.cover_image_uri,
          "w_240,h_240,c_fill,f_auto,q_auto"
        )
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(plan);
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden flex-row border border-[rgba(196,190,230,0.13)] bg-ui-surface-light dark:bg-ui-surface-dark"
        style={{ elevation: 4, minHeight: 120 }}
      >
        {/* ── Contenido izquierdo ── */}
        <View className="flex-1 px-4 py-4 justify-between gap-2">
          {/* Objetivo / Badge borrador / Badge género */}
          <View className="flex-row items-center gap-2">
            {isDraft ? (
              <View className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
                <Text className="font-manrope-bold text-[10px] uppercase tracking-wider text-amber-500">
                  Borrador
                </Text>
              </View>
            ) : objectiveLabel ? (
              <Text className="font-manrope-semi text-[11px] text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-label">
                {objectiveLabel}
              </Text>
            ) : null}
            {genderBadge ? (
              <View className="px-2 py-0.5 rounded-md bg-brandPrimary-500/10 border border-brandPrimary-500/25">
                <Text className="font-manrope-bold text-[10px] uppercase tracking-wider text-brandPrimary-500">
                  {genderBadge}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Nombre */}
          <Text
            className="font-jakarta-bold text-[18px] leading-[22px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={2}
          >
            {plan.name}
          </Text>

          {/* Stats + chevron */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1">
                <Calendar size={12} color="rgba(196,190,230,0.65)" />
                <Text className="font-manrope-bold text-[12px] text-ui-text-muted dark:text-ui-text-mutedDark">
                  {plan.duration_weeks ? `${plan.duration_weeks} sem` : "Flexible"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={12} color="rgba(196,190,230,0.65)" />
                <Text className="font-manrope-bold text-[12px] text-ui-text-muted dark:text-ui-text-mutedDark">
                  {plan.weekly_days} días/sem
                </Text>
              </View>
            </View>

            <View className="h-7 w-7 items-center justify-center rounded-full bg-brandPrimary-700/10 border border-brandPrimary-700/20">
              <ChevronRight size={13} color="#4a44e4" />
            </View>
          </View>
        </View>

        {/* ── Imagen derecha ── */}
        <View className="w-[116px] overflow-hidden">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={["#3023cd", "#4a44e4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                StyleSheet.absoluteFillObject,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Icon size={38} color="rgba(255,255,255,0.25)" />
            </LinearGradient>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default TrainingPlanCard;
