// React Native
import { Pressable, Text, View } from "react-native";

// Expo
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

// Tema
import { useTheme } from "../../theme/theme";
import { brandPrimary, brandSecondary, gradient, ui } from "../../theme/colors";

// Assets
import { Barbell, ChevronRight } from "../../../assets/icons";

// Utils
import { getCloudinaryUrl } from "../../utils/cloudinary";

export default function ActiveSessionCard({ session, currentDay }) {
  const router = useRouter();
  const { isDark } = useTheme();

  const BRAND_PRIMARY = brandPrimary[700];
  const BRAND_MINT = brandSecondary[400];

  const placeholderGradientColors = isDark
    ? gradient.sessionPlaceholder.dark
    : gradient.sessionPlaceholder.light;

  const sessionTitle = session?.name ?? "Sesión en curso";
  const sessionImage = session?.cover_image_uri
    ? {
        uri:
          getCloudinaryUrl(session.cover_image_uri) ?? session.cover_image_uri,
      }
    : null;

  const exerciseCount = currentDay?.exercise_count ?? 0;
  const metaParts = [];
  if (currentDay?.week_number) {
    metaParts.push(`SEM ${currentDay.week_number}`);
  }
  if (currentDay?.day_number) {
    metaParts.push(`D${currentDay.day_number}`);
  }
  if (exerciseCount) {
    metaParts.push(`${exerciseCount} ${exerciseCount === 1 ? "EJ." : "EJS."}`);
  }
  const meta = metaParts.join(" · ");

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/sesion");
  };

  return (
    <Pressable onPress={handlePress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-[#0f0d20]/8 dark:border-white/8"
        style={{
          shadowColor: BRAND_MINT,
          shadowOpacity: 0.18,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        {/* Halo mint superior izquierdo */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(45,212,191,0.22)", "rgba(45,212,191,0)"]
              : ["rgba(45,212,191,0.18)", "rgba(45,212,191,0)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.9 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 180,
            height: 140,
          }}
        />

        {/* Ticks decorativos */}
        <View className="absolute top-3 left-3 w-6 h-[3px] rounded-sm bg-brandSecondary-400" />
        <View className="absolute top-3 left-[42px] w-2 h-[3px] rounded-sm bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40" />

        <View
          className="flex-row items-center"
          style={{ padding: 14, paddingTop: 22, gap: 14 }}
        >
          {/* Visual izquierdo */}
          <View className="shrink-0">
            <LinearGradient
              colors={[BRAND_MINT, BRAND_PRIMARY]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                padding: 2,
              }}
            >
              <View className="flex-1 bg-brandPrimary-50 dark:bg-ui-surface-dim items-center justify-center rounded-xl overflow-hidden">
                {sessionImage ? (
                  <Image
                    source={sessionImage}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <>
                    <LinearGradient
                      colors={placeholderGradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <Barbell
                      size={28}
                      color={isDark ? ui.icon.onDark : ui.icon.onLight}
                    />
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Contenido */}
          <View className="flex-1 min-w-0" style={{ gap: 4 }}>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View
                className="bg-brandSecondary-400 w-2 h-2 rounded-full"
                style={{
                  shadowColor: BRAND_MINT,
                  shadowOpacity: 0.9,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text
                className="font-jakarta-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
                style={{ fontSize: 10, letterSpacing: 2 }}
              >
                EN CURSO
              </Text>
            </View>

            <Text
              className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark tracking-tight"
              style={{ fontSize: 16, letterSpacing: -0.3 }}
              numberOfLines={1}
            >
              {sessionTitle}
            </Text>

            {meta ? (
              <Text
                className="font-manrope-bold uppercase text-[#0f0d20]/50 dark:text-white/45"
                style={{ fontSize: 10, letterSpacing: 1.6 }}
                numberOfLines={1}
              >
                {meta}
              </Text>
            ) : null}
          </View>

          {/* CTA */}
          <View
            className="items-center justify-center rounded-full shrink-0 bg-brandPrimary-700"
            style={{
              width: 32,
              height: 32,
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: 0.55,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <ChevronRight size={14} color="white" />
          </View>
        </View>

        {/* Strip CTA inferior */}
        <View className="border-t border-[#0f0d20]/8 dark:border-white/8">
          <View
            className="flex-row items-center justify-center"
            style={{ paddingVertical: 10 }}
          >
            <Text
              className="font-manrope-bold uppercase text-ui-text-main dark:text-ui-text-mainDark"
              style={{ fontSize: 11, letterSpacing: 1.6 }}
            >
              Continuar sesión
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
