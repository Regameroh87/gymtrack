// ── React Native ──
import { Pressable, Text, View } from "react-native";

// ── Expo ──
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

// ── Navigation / Theme ──
import { useTheme } from "../../theme/theme";

// ── Design Tokens ──
import { brandPrimary, brandSecondary, gradient, ui } from "../../theme/colors";

// ── Assets ──
import { ChevronRight, Barbell } from "../../../assets/icons";

// ── Hooks ──
import { useActivePlan } from "../../hooks/use-active-plan";

// ── Utils ──
import { getCloudinaryUrl } from "../../utils/cloudinary";

export default function HeroeCardHome({ image }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const now = new Date();

  const { data: activePlan, isLoading } = useActivePlan();

  const BRAND_PRIMARY = brandPrimary[700];
  const BRAND_MINT = brandSecondary[400];

  // isDark solo para seleccionar entre las variantes dark/light de colors.js
  const mintHaloColors = isDark
    ? gradient.mintHalo.dark
    : gradient.mintHalo.light;
  const primaryHaloColors = isDark
    ? gradient.primaryHalo.dark
    : gradient.primaryHalo.light;
  const placeholderGradientColors = isDark
    ? gradient.sessionPlaceholder.dark
    : gradient.sessionPlaceholder.light;

  // Sin tracking de progreso todavía: la "sesión de hoy" es el primer día
  // del plan (semana 1, día 1). Se ajustará cuando exista workout_logs.
  if (isLoading || !activePlan) return null;

  const firstWeek = activePlan.weeks[0];
  const firstDay = firstWeek?.days?.[0];
  if (!firstDay) return null;

  const { session, exercises } = firstDay;
  const objective = activePlan.plan.objective ?? "Entrenamiento";
  const exerciseCount = exercises.length;
  const sessionImage =
    image ??
    (session?.cover_image_uri
      ? {
          uri:
            getCloudinaryUrl(session.cover_image_uri) ??
            session.cover_image_uri,
        }
      : null);

  return (
    <View>
      {/* ── HERO: sesión de hoy ── */}
      <View className="px-5 mb-7">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/sesion");
          }}
          className="active:scale-[0.985]"
        >
          <View
            className="rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-[#0f0d20]/8 dark:border-white/8"
            style={{
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
          >
            <LinearGradient
              colors={mintHaloColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0.8 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 220,
                height: 220,
              }}
            />
            <LinearGradient
              colors={primaryHaloColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 280,
                height: 200,
              }}
            />

            {/* Número editorial gigante de fondo */}
            <Text className="absolute -top-[22px] -right-[8px] text-[180px] leading-[180px] tracking-[-8px] font-jakarta-bold text-[#0f0d20]/5 dark:text-white/[4%]">
              {String(now.getDate()).padStart(2, "0")}
            </Text>

            {/* Ticks decorativos */}
            <View className="absolute top-[18px] left-5 w-7 h-[3px] rounded-sm bg-brandSecondary-400" />
            <View className="absolute top-[18px] left-[52px] w-2.5 h-[3px] rounded-sm bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40" />

            {/* Header row */}
            <View
              className="flex-row items-center justify-between"
              style={{ paddingHorizontal: 20, paddingTop: 32 }}
            >
              <Text
                className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
                style={{ fontSize: 10, letterSpacing: 2.4 }}
              >
                Tu sesión de hoy
              </Text>
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
                <Text className="font-jakarta-bold text-brandSecondary-700 dark:text-brandSecondary-400 text-xs tracking-[2px]">
                  PRÓXIMA
                </Text>
              </View>
            </View>

            {/* Body */}
            <View
              className="flex-row"
              style={{
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 22,
                gap: 16,
              }}
            >
              <View className="flex-1 justify-between gap-4">
                <View className=" gap-2">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-brandSecondary-700 dark:bg-brandSecondary-400 w-1 h-1 rounded-sm" />
                    <Text className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400 text-[8px] tracking-[2px]">
                      {`${objective} · semana ${firstWeek.week_number} `}
                    </Text>
                  </View>
                  <Text
                    className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark text-[26px] leading-8 tracking-wider "
                    numberOfLines={3}
                  >
                    {activePlan.plan.name}
                  </Text>
                  <Text className="font-manrope text-[#0f0d20]/65 dark:text-white/60 text-sm mt-3 leading-5">
                    {`${exerciseCount} ${
                      exerciseCount === 1 ? "ejercicio" : "ejercicios"
                    }`}
                  </Text>
                </View>
              </View>

              {/* Placeholder visual */}
              <View style={{ gap: 6, alignItems: "center" }}>
                <View className="bg-brandSecondary-400 absolute -left-[10px] top-3 w-1 h-9 rounded-sm " />
                <LinearGradient
                  colors={[BRAND_MINT, BRAND_PRIMARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: 18,
                    padding: 2,
                  }}
                >
                  <View className="flex-1 bg-brandPrimary-50 dark:bg-ui-surface-dim items-center justify-center rounded-2xl overflow-hidden">
                    {sessionImage ? (
                      <Image
                        source={sessionImage}
                        className="w-full h-full"
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
                          size={56}
                          color={isDark ? ui.icon.onDark : ui.icon.onLight}
                        />
                      </>
                    )}
                  </View>
                </LinearGradient>
                <View className="flex-row items-center gap-1">
                  <View className="bg-[#0f0d20]/[18%] dark:bg-white/25 w-3 h-[1px]" />
                  <Text className="font-manrope-bold uppercase text-[#0f0d20]/45 dark:text-white/45 text-[10px] tracking-[2px] ">
                    {`Día ${firstDay.day_number}`}
                  </Text>
                  <View className="bg-[#0f0d20]/[18%] dark:bg-white/25 w-4 h-[1px]" />
                </View>
              </View>
            </View>

            {/* CTA strip */}
            <View className="border-t border-[#0f0d20]/8 dark:border-white/8">
              <View className="flex-row items-center justify-between px-5 py-3">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View className=" w-6 h-6 rounded-xl items-center justify-center bg-brandPrimary-700/[18%] border border-brandPrimary-700/50">
                    <View className="bg-brandPrimary-700 w-2 h-2 rounded-md" />
                  </View>
                  <Text className=" text-xs tracking-[1.5px] font-manrope-bold uppercase text-ui-text-main dark:text-ui-text-mainDark">
                    Iniciar sesión
                  </Text>
                </View>
                <View
                  className=" w-8 h-8 items-center justify-center rounded-full bg-brandPrimary-700"
                  style={{
                    shadowColor: BRAND_PRIMARY,
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <ChevronRight size={14} color="white" />
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
