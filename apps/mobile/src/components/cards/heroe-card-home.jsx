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
import { useGymTheme } from "../../contexts/gym-theme-context";

// ── Design Tokens ──
import { ui } from "@gymtrack/core/colors";

// ── Assets ──
import { ChevronRight, Barbell, ClipboardList } from "../../../assets/icons";

// ── Hooks ──
import { useActivePlanSummary } from "../../hooks/plans/use-active-plan-summary";
import { useActiveSessionDraft } from "@gymtrack/core/hooks/sessions/use-active-session-draft";

// ── Utils ──
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { makeShadow } from "../../utils/box-shadow";

// ── UI ──
import { Skeleton } from "../ui/skeleton";

export default function HeroeCardHome({ image }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const { brandPrimary, brandSecondary, gradient } = useGymTheme();
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

  // isPending cubre "query deshabilitada (sin userId)" y "fetching" en TanStack v5.
  // En vez de no renderizar nada (que colapsaría el espacio y empujaría "Acceso
  // Rápido" hacia arriba, para saltar abajo al llegar los datos), mostramos un
  // skeleton con la misma silueta y alto que la card real: layout estable.
  if (isPending) return <HeroeCardSkeleton />;

  const hasNoPlan = summary === null;

  const currentDay = hasNoPlan ? null : summary.currentDay;
  // Plan completado: la asignación fue marcada 'completed' inline; el próximo
  // fetch ya no la verá. No mostramos la card.
  if (!hasNoPlan && summary.isCompleted) return null;

  // Sin día para el plan activo (datos aún no sincronizados o plan sin días
  // configurados). La card se muestra igual para que el usuario pueda actuar.
  const noDayConfigured = !hasNoPlan && !currentDay;

  // Hay una sesión a medias guardada justo para el día que toca
  const hasDraft =
    !hasNoPlan &&
    !!currentDay &&
    !!draft &&
    String(draft.dayId) === String(currentDay.id);

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
    : noDayConfigured
      ? async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.soft);
          if (summary.isCustom) {
            router.push(`/planes/plan-detail/custom/${summary.plan.id}`);
          } else {
            router.push(`/planes/plan-detail/${summary.plan.id}`);
          }
        }
      : async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.soft);
          // Entramos por el preview; con sesión a medias empujamos la activa
          // encima con push (frame de stack normal). Evitamos navigate directo a
          // active, que dejaría ese destino en el historial y reaparecería como
          // una active fantasma al salir del preview hacia el home.
          router.navigate("/(protected)/sesion-active");
          if (hasDraft) {
            router.push("/(protected)/sesion-active/active");
          }
        };

  return (
    <View>
      <View className="px-5 mb-7">
        <Pressable onPress={handlePress} className="active:scale-[0.985]">
          <View
            className="rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-ui-text-main/[8%] dark:border-white/[8%]"
            style={{
              ...makeShadow({
                color: BRAND_PRIMARY,
                opacity: hasNoPlan ? 0.14 : 0.18,
                radius: 24,
                offset: { width: 0, height: 10 },
              }),
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
            <Text className="absolute -top-[22px] -right-[8px] text-[180px] leading-[180px] tracking-[-8px] font-jakarta-bold text-ui-text-main/5 dark:text-white/[4%]">
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
                {hasNoPlan || noDayConfigured ? "Tu entrenamiento" : "Tu sesión de hoy"}
              </Text>

              <View className="flex-row items-center" style={{ gap: 6 }}>
                {hasNoPlan || noDayConfigured ? (
                  <View className="bg-ui-text-main/20 dark:bg-white/20 w-2 h-2 rounded-full" />
                ) : (
                  <View
                    className="bg-brandSecondary-400 w-2 h-2 rounded-full"
                    style={{
                      ...makeShadow({
                        color: BRAND_MINT,
                        opacity: 0.9,
                        radius: 5,
                      }),
                    }}
                  />
                )}
                <Text
                  className={`font-jakarta-bold text-xs tracking-[2px] ${
                    hasNoPlan
                      ? "text-ui-text-main/45 dark:text-white/45"
                      : "text-brandSecondary-700 dark:text-brandSecondary-400"
                  }`}
                >
                  {hasNoPlan
                    ? "SIN PLAN"
                    : noDayConfigured
                      ? "ASIGNADO"
                      : hasDraft
                        ? "EN CURSO"
                        : "PRÓXIMA"}
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
                  {!hasNoPlan && currentDay && (
                    <View className="flex-row items-center gap-2">
                      <View className="bg-brandSecondary-700 dark:bg-brandSecondary-400 w-1 h-1 rounded-sm" />
                      <Text className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400 text-[8px] tracking-[2px]">
                        {summary?.plan?.duration_weeks === 0
                          ? objective
                          : `semana ${currentDay.week_number}`}
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
                  <Text className="font-manrope text-ui-text-main/55 dark:text-white/50 text-sm mt-2 leading-5">
                    {hasNoPlan
                      ? "Explorá el catálogo de planes y elegí el que mejor se adapte a tus objetivos."
                      : noDayConfigured
                        ? "Plan asignado · Comenzá cuando estés listo."
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
                              ? gradient.cardSubtle.dark
                              : gradient.cardSubtle.light
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

                {!hasNoPlan && currentDay && (
                  <View className="flex-row items-center gap-1">
                    <View className="bg-ui-text-main/[18%] dark:bg-white/25 w-3 h-[1px]" />
                    <Text className="font-manrope-bold uppercase text-ui-text-main/45 dark:text-white/45 text-[10px] tracking-[2px]">
                      {`Día ${currentDay.day_number}`}
                    </Text>
                    <View className="bg-ui-text-main/[18%] dark:bg-white/25 w-4 h-[1px]" />
                  </View>
                )}
              </View>
            </View>

            {/* ── CTA strip ── */}
            <View className="border-t border-ui-text-main/[8%] dark:border-white/[8%]">
              <View className="flex-row items-center justify-between px-5 py-3">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View className="w-6 h-6 rounded-xl items-center justify-center bg-brandPrimary-700/[18%] border border-brandPrimary-700/50">
                    <View className="bg-brandPrimary-700 w-2 h-2 rounded-md" />
                  </View>
                  <Text className="text-xs tracking-[1.5px] font-manrope-bold uppercase text-ui-text-main dark:text-ui-text-mainDark">
                    {hasNoPlan
                      ? "Ver planes"
                      : noDayConfigured
                        ? "Ver plan"
                        : hasDraft
                          ? "Continuar sesión"
                          : "Iniciar sesión"}
                  </Text>
                </View>
                <View
                  className="w-8 h-8 items-center justify-center rounded-full bg-brandPrimary-700"
                  style={{
                    ...makeShadow({
                      color: BRAND_PRIMARY,
                      opacity: 0.6,
                      radius: 8,
                      offset: { width: 0, height: 2 },
                    }),
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Reproduce el wrapper (px-5 mb-7), el contorno y el alto de la card real para
// que el swap skeleton → contenido no mueva nada. Los bloques mimetizan kicker,
// título (2 líneas), descripción, el cuadro de imagen y la CTA strip.
function HeroeCardSkeleton() {
  return (
    <View className="px-5 mb-7">
      <View className="rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-ui-text-main/[8%] dark:border-white/[8%]">
        {/* Header */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 20, paddingTop: 32 }}
        >
          <Skeleton width={120} height={10} radius={3} />
          <Skeleton width={70} height={10} radius={3} />
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
          <View className="flex-1 gap-3">
            <Skeleton width={70} height={8} radius={3} />
            <Skeleton width="90%" height={22} radius={6} />
            <Skeleton width="65%" height={22} radius={6} />
            <Skeleton width="45%" height={13} radius={4} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={128} height={128} radius={18} />
        </View>

        {/* CTA strip */}
        <View className="border-t border-ui-text-main/[8%] dark:border-white/[8%]">
          <View className="flex-row items-center justify-between px-5 py-3">
            <Skeleton width={120} height={12} radius={4} />
            <Skeleton width={32} height={32} radius={16} />
          </View>
        </View>
      </View>
    </View>
  );
}
