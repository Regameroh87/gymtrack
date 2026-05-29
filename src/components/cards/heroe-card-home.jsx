// ── React Native ──
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

// ── Expo ──
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter, useFocusEffect } from "expo-router";

// ── Navigation / Theme ──
import { useTheme } from "../../theme/theme";

// ── Design Tokens ──
import { brandPrimary, brandSecondary, gradient, ui } from "../../theme/colors";

// ── Assets ──
import { ChevronRight, Barbell, ClipboardList } from "../../../assets/icons";

// ── Hooks ──
import { useActivePlanSummary } from "../../hooks/plans/use-active-plan-summary";
import { useActiveSessionDraft } from "../../hooks/sessions/use-active-session-draft";

// ── Utils ──
import { getCloudinaryUrl } from "../../utils/cloudinary";

export default function HeroeCardHome({ image }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const now = new Date();

  const { data: summary, isPending } = useActivePlanSummary();
  const { data: draft, refetch: refetchDraft } = useActiveSessionDraft();

  // Tabs mantiene el Home montado, así que releemos el draft al recuperar foco
  // (cubre iniciar, finalizar y abandonar sesión sin remount).
  useFocusEffect(
    useCallback(() => {
      refetchDraft();
    }, [refetchDraft])
  );

  const BRAND_PRIMARY = brandPrimary[700];
  const BRAND_MINT = brandSecondary[400];

  const mintHaloColors = isDark
    ? gradient.mintHalo.dark
    : gradient.mintHalo.light;
  const primaryHaloColors = isDark
    ? gradient.primaryHalo.dark
    : gradient.primaryHalo.light;
  const placeholderGradientColors = isDark
    ? gradient.sessionPlaceholder.dark
    : gradient.sessionPlaceholder.light;

  // isPending cubre "query deshabilitada (sin userId)" y "fetching" en TanStack v5
  if (isPending) return null;

  const hasNoPlan = summary === null;

  const currentDay = hasNoPlan ? null : summary.currentDay;
  // Plan completado o sin día configurado — no hay nada que mostrar
  if (!hasNoPlan && !currentDay) return null;

  // Hay una sesión a medias guardada justo para el día que toca
  const hasDraft =
    !hasNoPlan && !!draft && String(draft.dayId) === String(currentDay.id);

  // Datos del plan activo (solo cuando hasNoPlan es false)
  const session = currentDay?.session ?? null;
  const objective = summary?.plan?.objective ?? "Entrenamiento";
  const exerciseCount = currentDay?.exercise_count ?? 0;
  const sessionTitle = session?.name ?? summary?.plan?.name;
  const sessionImage =
    image ??
    (session?.cover_image_uri
      ? {
          uri:
            getCloudinaryUrl(session.cover_image_uri) ??
            session.cover_image_uri,
        }
      : null);

  const handlePress = hasNoPlan
    ? () => router.push("/planes")
    : () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Con draft saltamos directo a la activa; sin draft, al preview.
        router.push(
          hasDraft ? "/sesion-active/active" : "/sesion-active"
        );
      };

  return (
    <View>
      <View className="px-5 mb-7">
        <Pressable onPress={handlePress} className="active:scale-[0.985]">
          <View
            className="rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-[#0f0d20]/8 dark:border-white/8"
            style={{
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: hasNoPlan ? 0.14 : 0.18,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 },
              elevation: hasNoPlan ? 8 : 10,
            }}
          >
            {/* ── Halos de fondo ── */}
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

            {/* ── Header ── */}
            <View
              className="flex-row items-center justify-between"
              style={{ paddingHorizontal: 20, paddingTop: 32 }}
            >
              <Text
                className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
                style={{ fontSize: 10, letterSpacing: 2.4 }}
              >
                {hasNoPlan ? "Tu entrenamiento" : "Tu sesión de hoy"}
              </Text>

              <View className="flex-row items-center" style={{ gap: 6 }}>
                {hasNoPlan ? (
                  <View className="bg-[#0f0d20]/20 dark:bg-white/20 w-2 h-2 rounded-full" />
                ) : (
                  <View
                    className="bg-brandSecondary-400 w-2 h-2 rounded-full"
                    style={{
                      shadowColor: BRAND_MINT,
                      shadowOpacity: 0.9,
                      shadowRadius: 5,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  />
                )}
                <Text
                  className={`font-jakarta-bold text-xs tracking-[2px] ${
                    hasNoPlan
                      ? "text-[#0f0d20]/45 dark:text-white/45"
                      : "text-brandSecondary-700 dark:text-brandSecondary-400"
                  }`}
                >
                  {hasNoPlan ? "SIN PLAN" : hasDraft ? "EN CURSO" : "PRÓXIMA"}
                </Text>
              </View>
            </View>

            {/* ── Body ── */}
            <View
              className="flex-row"
              style={{
                paddingHorizontal: 20,
                paddingTop: 18,
                paddingBottom: 22,
                gap: 16,
              }}
            >
              {/* Texto */}
              <View className="flex-1 justify-between gap-4">
                <View className="gap-2">
                  {!hasNoPlan && (
                    <View className="flex-row items-center gap-2">
                      <View className="bg-brandSecondary-700 dark:bg-brandSecondary-400 w-1 h-1 rounded-sm" />
                      <Text className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400 text-[8px] tracking-[2px]">
                        {`${objective} · semana ${currentDay.week_number}`}
                      </Text>
                    </View>
                  )}
                  <Text
                    className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark tracking-tight"
                    style={{
                      fontSize: hasNoPlan ? 22 : 26,
                      lineHeight: hasNoPlan ? 28 : 32,
                    }}
                    numberOfLines={3}
                  >
                    {hasNoPlan
                      ? "Todavía no tenés un plan asignado."
                      : sessionTitle}
                  </Text>
                  <Text className="font-manrope text-[#0f0d20]/55 dark:text-white/50 text-sm mt-2 leading-5">
                    {hasNoPlan
                      ? "Explorá el catálogo de planes y elegí el que mejor se adapte a tus objetivos."
                      : `${exerciseCount} ${exerciseCount === 1 ? "ejercicio" : "ejercicios"}`}
                  </Text>
                </View>
              </View>

              {/* Visual derecho */}
              <View style={{ gap: 6, alignItems: "center" }}>
                <View className="bg-brandSecondary-400 absolute -left-[10px] top-3 w-1 h-9 rounded-sm" />
                <LinearGradient
                  colors={[BRAND_MINT, BRAND_PRIMARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: hasNoPlan ? 104 : 128,
                    height: hasNoPlan ? 104 : 128,
                    borderRadius: 18,
                    padding: 2,
                  }}
                >
                  <View className="flex-1 bg-brandPrimary-50 dark:bg-ui-surface-dim items-center justify-center rounded-2xl overflow-hidden">
                    {hasNoPlan ? (
                      <>
                        <LinearGradient
                          colors={
                            isDark
                              ? ["#4A44E420", "#2DD4BF10"]
                              : ["#4A44E412", "#2DD4BF08"]
                          }
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
                        <ClipboardList
                          size={44}
                          color={isDark ? BRAND_MINT : BRAND_PRIMARY}
                        />
                      </>
                    ) : sessionImage ? (
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
                          size={56}
                          color={isDark ? ui.icon.onDark : ui.icon.onLight}
                        />
                      </>
                    )}
                  </View>
                </LinearGradient>

                {!hasNoPlan && (
                  <View className="flex-row items-center gap-1">
                    <View className="bg-[#0f0d20]/[18%] dark:bg-white/25 w-3 h-[1px]" />
                    <Text className="font-manrope-bold uppercase text-[#0f0d20]/45 dark:text-white/45 text-[10px] tracking-[2px]">
                      {`Día ${currentDay.day_number}`}
                    </Text>
                    <View className="bg-[#0f0d20]/[18%] dark:bg-white/25 w-4 h-[1px]" />
                  </View>
                )}
              </View>
            </View>

            {/* ── CTA strip ── */}
            <View className="border-t border-[#0f0d20]/8 dark:border-white/8">
              <View className="flex-row items-center justify-between px-5 py-3">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View className="w-6 h-6 rounded-xl items-center justify-center bg-brandPrimary-700/[18%] border border-brandPrimary-700/50">
                    <View className="bg-brandPrimary-700 w-2 h-2 rounded-md" />
                  </View>
                  <Text className="text-xs tracking-[1.5px] font-manrope-bold uppercase text-ui-text-main dark:text-ui-text-mainDark">
                    {hasNoPlan
                      ? "Ver planes"
                      : hasDraft
                        ? "Continuar sesión"
                        : "Iniciar sesión"}
                  </Text>
                </View>
                <View
                  className="w-8 h-8 items-center justify-center rounded-full bg-brandPrimary-700"
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
