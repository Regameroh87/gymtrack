// React Native
import { Pressable, Text, View } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

// Utilidades
import { getCloudinaryUrl } from "../../utils/cloudinary";

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
  hipertrofia: { accent: "#6366f1", Icon: Barbell },
  fuerza: { accent: "#ef4444", Icon: Barbell },
  perdida_grasa: { accent: "#22c55e", Icon: ChartBar },
  resistencia: { accent: "#38bdf8", Icon: Clock },
  acondicionamiento: { accent: "#f59e0b", Icon: Logs },
  rehabilitacion: { accent: "#a855f7", Icon: ShieldHalf },
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
  const { Icon } = config;
  const objectiveLabel = OBJECTIVE_LABELS[plan.objective];
  const imageUrl = plan.cover_image_uri
    ? plan.cover_image_uri.startsWith("file://")
      ? plan.cover_image_uri
      : getCloudinaryUrl(
          plan.cover_image_uri,
          "w_120,h_120,c_fill,f_auto,q_auto"
        )
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(plan);
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden border border-[rgba(196,190,230,0.13)] bg-ui-surface-light dark:bg-ui-surface-dark"
        style={{ elevation: 4 }}
      >
        {/* Barra de acento superior */}
        <View style={{ height: 3, backgroundColor: config.accent }} />

        {/* Contenido principal */}
        <View className="px-4 pt-4 pb-[14px] gap-3">
          {/* Fila superior: badge + thumbnail / ícono */}
          <View className="flex-row items-center justify-between">
            {objectiveLabel && (
              <View
                className="rounded-full px-3 py-[5px] border-[0.5px]"
                style={{
                  backgroundColor: config.accent + "22",
                  borderColor: config.accent + "55",
                }}
              >
                <Text
                  className="font-manrope-semi text-[11px]"
                  style={{ color: config.accent }}
                >
                  {objectiveLabel}
                </Text>
              </View>
            )}

            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: config.accent + "44",
                }}
                contentFit="cover"
              />
            ) : (
              <View style={{ opacity: 0.2 }}>
                <Icon size={34} color={config.accent} />
              </View>
            )}
          </View>

          {/* Nombre del plan */}
          <Text
            className="font-jakarta-bold text-[19px] leading-[24px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={2}
          >
            {plan.name}
          </Text>

          {/* Separador */}
          <View className="h-[0.5px] bg-[rgba(196,190,230,0.15)]" />

          {/* Stats + chevron */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-5">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={13} color="rgba(196,190,230,0.6)" />
                <Text className="font-manrope-bold text-[13px] text-ui-text-main dark:text-ui-text-mainDark">
                  {plan.duration_weeks} semanas
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Clock size={13} color="rgba(196,190,230,0.6)" />
                <Text className="font-manrope-bold text-[13px] text-ui-text-main dark:text-ui-text-mainDark">
                  {plan.weekly_days} días/sem
                </Text>
              </View>
            </View>

            <View
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1px]"
              style={{
                backgroundColor: config.accent + "22",
                borderColor: config.accent + "55",
              }}
            >
              <ChevronRight size={14} color={config.accent} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default TrainingPlanCard;
