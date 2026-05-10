// React Native
import { View, Text, Pressable } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Constantes
import { SESSION_LEVELS } from "../../constants/sessionOptions";

// Base de datos / utils
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Tema / assets
import { Barbell, ChartBar, ChevronRight } from "../../../assets/icons";

const DEFAULT_CONFIG = {
  gradient: ["#1e1580", "#4A44E4"],
  accent: "#4A44E4",
};

const SessionCard = ({ session, onPress }) => {
  const levelLabel = SESSION_LEVELS.find(
    (l) => l.value === session.level
  )?.label;

  const imageUri = session.cover_image_uri
    ? (getCloudinaryUrl(session.cover_image_uri) ?? session.cover_image_uri)
    : null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(session);
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden border border-brandPrimary-700/10 shadow-[0_8px_18px_rgba(74,68,228,0.18)]"
        style={{ elevation: 6 }}
      >
        {/* ── Área visual principal ── */}
        <View className="h-[210px]">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              width={"100%"}
              height={210}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={DEFAULT_CONFIG.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-1"
            >
              {/* Círculos decorativos */}
              <View className="absolute -top-[50px] -right-[50px] w-[220px] h-[220px] rounded-full bg-[rgba(255,255,255,0.07)]" />
              <View className="absolute top-[30px] right-[60px] w-[120px] h-[120px] rounded-full bg-[rgba(255,255,255,0.05)]" />
              <View className="absolute -bottom-[20px] -left-[30px] w-[150px] h-[150px] rounded-full bg-[rgba(0,0,0,0.15)]" />
              {/* Ícono watermark */}
              <View className="absolute right-5 top-6 opacity-[0.12] -rotate-12">
                <Barbell size={72} color="white" />
              </View>
            </LinearGradient>
          )}

          {/* Overlay oscuro inferior */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.82)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            className="absolute bottom-0 left-0 right-0 h-[157.5px]"
          />

          {/* Nombre sobre imagen */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <Text
              className="font-jakarta-bold text-[21px] leading-[26px] text-white"
              numberOfLines={2}
            >
              {session.name}
            </Text>
          </View>
        </View>

        {/* ── Footer: stats + CTA ── */}
        <View className="flex-row items-center border-t-[0.5px] border-t-[rgba(196,190,230,0.15)] bg-ui-surface-light py-[13px] pl-4 pr-[14px] dark:bg-ui-surface-dark">
          {/* Stats: dos filas */}
          <View className="mr-3 flex-1 min-w-0 gap-[7px]">
            {/* Fila 1: ejercicios */}
            <View className="flex-row items-center gap-[14px]">
              <View className="flex-row items-center gap-1.5 shrink">
                <Barbell size={13} color="rgba(196,190,230,0.55)" />
                <Text
                  numberOfLines={1}
                  className="font-manrope-bold text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
                >
                  {session.exercise_count > 0
                    ? `${session.exercise_count} ejercicios`
                    : "Sin ejercicios"}
                </Text>
              </View>
            </View>

            {/* Fila 2: nivel */}
            <View className="flex-row items-center gap-1.5">
              <ChartBar size={13} color="rgba(196,190,230,0.55)" />
              <Text
                numberOfLines={1}
                className="font-manrope-bold text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
              >
                {levelLabel ?? "Sin nivel"}
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1px]"
            style={{
              backgroundColor: DEFAULT_CONFIG.accent + "26",
              borderColor: DEFAULT_CONFIG.accent + "55",
            }}
          >
            <ChevronRight size={15} color={DEFAULT_CONFIG.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default SessionCard;
