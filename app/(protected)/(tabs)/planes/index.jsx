// React Native
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState, useMemo } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// Hooks
import { useTrainingPlans } from "../../../../src/hooks/plans/use-training-plans";
import { useCustomPlans } from "../../../../src/hooks/plans/use-custom-plans";
import { usePlanAssignments } from "../../../../src/hooks/plans/use-plan-assignments";
import { useActivePlanSummary } from "../../../../src/hooks/plans/use-active-plan-summary";
import { useDropPlan } from "../../../../src/hooks/plans/use-assign-plan";

// Utilidades
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";

// Componentes
import Screen from "../../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../../src/theme/colors";
import {
  Barbell,
  Calendar,
  ChartBar,
  ChevronRight,
  ClipboardList,
  Clock,
  ListDetails,
  Logs,
  Pencil,
  Plus,
  ShieldHalf,
} from "../../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia: { Icon: Barbell, label: "Hipertrofia" },
  fuerza: { Icon: Barbell, label: "Fuerza" },
  perdida_grasa: { Icon: ChartBar, label: "Pérdida de grasa" },
  resistencia: { Icon: Clock, label: "Resistencia" },
  acondicionamiento: { Icon: Logs, label: "Acondicionamiento" },
  rehabilitacion: { Icon: ShieldHalf, label: "Rehabilitación" },
};

const DEFAULT_CONFIG = { Icon: Barbell, label: null };

// Brand colors del design system Kinetic Precision
const BRAND_PRIMARY = "#4A44E4";
const BRAND_MINT = "#2DD4BF";
const BRAND_FALLBACK_GRADIENT = ["#0C0B14", "#1e1b4b", "#3023cd"];

const MAIN_TABS = [
  { key: "mi_plan", label: "Mi Plan" },
  { key: "explorar", label: "Explorar" },
];

let _lastTab = "mi_plan";

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState(_lastTab);

  const switchTab = (key) => {
    _lastTab = key;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(key);
  };

  return (
    <Screen safe>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Entrenamiento
          </Text>
          <Text className="text-[28px] font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark leading-8">
            Planes
          </Text>
        </View>

        {/* Acceso a Mi biblioteca (sesiones y ejercicios) */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/planes/biblioteca");
          }}
          className="mt-1 w-10 h-10 rounded-xl items-center justify-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:scale-[0.95]"
        >
          <ListDetails size={18} color={brandPrimary[500]} />
        </Pressable>
      </View>

      {/* Main Tabs */}
      <View className="flex-row px-6 mt-5 border-b border-ui-input-border">
        {MAIN_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              className="mr-7 pb-3 relative"
            >
              <Text
                className={`font-jakarta-bold text-[17px] ${
                  isActive
                    ? "text-ui-text-main dark:text-ui-text-mainDark"
                    : "text-ui-text-muted dark:text-ui-text-mutedDark"
                }`}
              >
                {tab.label}
              </Text>

              {isActive && (
                <LinearGradient
                  colors={[brandPrimary[600], brandPrimary[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2.5,
                    borderRadius: 99,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Contenido */}
      {activeTab === "mi_plan" ? (
        <MisPlanesContent
          router={router}
          insets={insets}
          onBrowseCatalog={() => switchTab("explorar")}
        />
      ) : (
        <ExplorarContent router={router} insets={insets} />
      )}
    </Screen>
  );
}

// ─── Tab: Mi Plan ─────────────────────────────────────────────────────────────

function MisPlanesContent({ router, insets, onBrowseCatalog }) {
  const { data: assignments, isLoading } = usePlanAssignments();
  const { data: summary } = useActivePlanSummary();
  const { mutate: dropPlan, isPending: isDropping } = useDropPlan();

  const currentPlan = assignments?.currentPlan ?? null;
  const history = assignments?.history ?? [];

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={brandPrimary[500]} />
      </View>
    );
  }

  const planObj = currentPlan
    ? {
        id: currentPlan.is_custom
          ? currentPlan.custom_plan_id
          : currentPlan.plan_id,
        name: currentPlan.plan_name ?? currentPlan.custom_plan_name,
        cover_image_uri:
          currentPlan.plan_cover ?? currentPlan.custom_plan_cover,
        objective:
          currentPlan.plan_objective ?? currentPlan.custom_plan_objective,
        level: currentPlan.plan_level ?? currentPlan.custom_plan_level,
        weekly_days:
          currentPlan.plan_weekly_days ?? currentPlan.custom_plan_weekly_days,
        duration_weeks:
          currentPlan.plan_duration_weeks ??
          currentPlan.custom_plan_duration_weeks,
        is_custom: currentPlan.is_custom,
      }
    : null;

  // Progreso "Semana X / Y" — solo disponible para planes de catálogo.
  const weekNumber = summary?.currentDay?.week_number ?? null;
  const totalWeeks = summary?.plan?.duration_weeks ?? null;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 24,
        paddingTop: 24,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Plan actual ── */}
      <Text className="font-jakarta-bold text-[16px] text-ui-text-main dark:text-ui-text-mainDark mb-3">
        Plan actual
      </Text>

      {planObj ? (
        <View className="mb-6">
          {/* Cabecera editorial del activo: estado + semana */}
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center" style={{ gap: 7 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: BRAND_MINT,
                }}
              />
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 11, color: BRAND_MINT, letterSpacing: 2.4 }}
              >
                En curso
              </Text>
            </View>
            {weekNumber && (
              <Text
                className="font-manrope-bold uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.8,
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <Text style={{ color: BRAND_MINT }}>
                  Semana {pad(weekNumber)}
                </Text>
                {totalWeeks ? ` / ${pad(totalWeeks)}` : ""}
              </Text>
            )}
          </View>

          {/* Barra de progreso segmentada por semana (eco de los ticks mint) */}
          {weekNumber && totalWeeks ? (
            <View className="flex-row mb-3.5" style={{ gap: 3 }}>
              {Array.from({ length: totalWeeks }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor:
                      i < weekNumber ? BRAND_MINT : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="mb-1" />
          )}

          <PlanTile
            plan={planObj}
            index={0}
            onPress={() =>
              currentPlan.is_custom
                ? router.push(
                    `/planes/plan-detail/custom/${currentPlan.custom_plan_id}`
                  )
                : router.push(`/planes/plan-detail/${currentPlan.plan_id}`)
            }
            assignerName={currentPlan.assigner_name}
          />

          <Pressable
            disabled={isDropping}
            onPress={() => dropPlan({ assignmentId: currentPlan.id })}
            className="mt-3 items-center active:opacity-60"
          >
            <Text
              className="font-manrope text-[13px]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {isDropping ? "Abandonando…" : "Abandonar este plan"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          className="rounded-2xl overflow-hidden mb-6"
          style={{ borderWidth: 1, borderColor: brandPrimary[500] + "30" }}
        >
          <LinearGradient
            colors={[brandPrimary[500] + "12", brandPrimary[500] + "04"]}
            className="p-5"
          >
            <View className="flex-row items-center gap-3 mb-2.5">
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: brandPrimary[500] + "20" }}
              >
                <ClipboardList size={18} color={brandPrimary[500]} />
              </View>
              <Text className="font-jakarta-bold text-[15px] text-ui-text-main dark:text-ui-text-mainDark">
                Sin plan activo
              </Text>
            </View>
            <Text className="font-manrope text-[13px] text-ui-text-muted dark:text-ui-text-mutedDark leading-5 mb-4">
              Elegí un plan y empezá a entrenar con estructura.
            </Text>
            <Pressable
              onPress={onBrowseCatalog}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Text
                className="font-jakarta-semi text-[13px]"
                style={{ color: brandPrimary[500] }}
              >
                Explorar planes
              </Text>
              <Text
                className="font-jakarta-semi text-[13px]"
                style={{ color: brandPrimary[500] }}
              >
                →
              </Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <>
          <Text className="font-jakarta-bold text-[16px] text-ui-text-main dark:text-ui-text-mainDark mb-3">
            Historial
          </Text>
          <View className="gap-3">
            {history.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  item.is_custom
                    ? router.push(
                        `/planes/plan-detail/custom/${item.custom_plan_id}`
                      )
                    : router.push(`/planes/plan-detail/${item.plan_id}`)
                }
                className="active:opacity-70"
              >
                <View
                  className="rounded-2xl p-4 flex-row items-center gap-4"
                  style={{
                    backgroundColor: "#0F0D20",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <Calendar size={18} color="rgba(255,255,255,0.4)" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-jakarta-semi text-[14px] text-white"
                      numberOfLines={1}
                    >
                      {item.plan_name ??
                        item.custom_plan_name ??
                        "Plan eliminado"}
                    </Text>
                    <Text
                      className="font-manrope text-[12px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {item.start_date}
                      {item.end_date ? ` → ${item.end_date}` : ""}
                      {"  ·  "}
                      {item.status === "dropped" ? "Abandonado" : "Completado"}
                    </Text>
                    {item.assigner_name && (
                      <View
                        className="flex-row items-center"
                        style={{ gap: 4, marginTop: 3 }}
                      >
                        <ShieldHalf size={8} color={BRAND_MINT} />
                        <Text
                          className="font-manrope-semi"
                          style={{ fontSize: 10, color: BRAND_MINT }}
                        >
                          Por {item.assigner_name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Tab: Explorar ────────────────────────────────────────────────────────────

const ORIGIN_TABS = [
  { key: "gym", label: "Catálogo" },
  { key: "mios", label: "Personalizados" },
];

function ExplorarContent({ router, insets }) {
  const [origin, setOrigin] = useState("gym");
  const [activeObjective, setActiveObjective] = useState(null);

  const { data: gymPlans = [], isLoading: gymLoading } = useTrainingPlans({
    publishedOnly: true,
  });
  const { data: myPlans = [], isLoading: myLoading } = useCustomPlans();

  const availableObjectiveFilters = useMemo(() => {
    const usedObjs = new Set(gymPlans.map((p) => p.objective).filter(Boolean));
    return [
      { key: null, label: "Todos" },
      ...Object.entries(OBJECTIVE_CONFIG)
        .filter(([key]) => usedObjs.has(key))
        .map(([key, cfg]) => ({ key, label: cfg.label })),
    ];
  }, [gymPlans]);

  const filteredGym = useMemo(
    () =>
      activeObjective === null
        ? gymPlans
        : gymPlans.filter((p) => p.objective === activeObjective),
    [gymPlans, activeObjective]
  );

  const isLoading = origin === "gym" ? gymLoading : myLoading;
  const list = origin === "gym" ? filteredGym : myPlans;
  const isMine = origin === "mios";

  const setOriginTab = (key) => {
    setOrigin(key);
  };

  // Swipe horizontal para alternar entre Catálogo (gym) y Personalizados (mios).
  // activeOffsetX/failOffsetY hacen que el gesto solo gane ante movimiento lateral
  // claro, cediendo al scroll vertical de la lista.
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      const SWIPE_THRESHOLD = 50;
      if (e.translationX <= -SWIPE_THRESHOLD && origin === "gym") {
        setOriginTab("mios");
      } else if (e.translationX >= SWIPE_THRESHOLD && origin === "mios") {
        setOriginTab("gym");
      }
    });

  return (
    <View className="flex-1">
      {/* Pestañas fijas */}
      <View className="px-6 pt-4 pb-3 border-b border-ui-input-border">
        <View className="flex-row bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-1">
          {ORIGIN_TABS.map((tab) => {
            const isActive = origin === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setOriginTab(tab.key)}
                className="flex-1 items-center py-2 rounded-lg active:opacity-70"
                style={isActive ? { backgroundColor: brandPrimary[500] } : {}}
              >
                <Text
                  className={`font-jakarta-semi text-[13px] ${
                    isActive
                      ? "text-white"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Filtro por objetivo — solo "Catálogo" */}
          {!isMine && availableObjectiveFilters.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 20,
              }}
            >
              <View className="flex-row gap-2">
                {availableObjectiveFilters.map((filter) => {
                  const isActive = activeObjective === filter.key;
                  return (
                    <Pressable
                      key={filter.key ?? "all"}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveObjective(filter.key);
                      }}
                      className="active:scale-[0.95]"
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={[brandPrimary[600], brandPrimary[500]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="px-4 py-2 rounded-full"
                        >
                          <Text className="text-white font-jakarta-semi text-[12px]">
                            {filter.label}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View className="px-4 py-2 rounded-full border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
                          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-jakarta-semi text-[12px]">
                            {filter.label}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {isLoading ? (
            <View className="pt-16 items-center">
              <ActivityIndicator color={brandPrimary[500]} />
            </View>
          ) : list.length === 0 ? (
            <View className="px-6 pt-5">
              {isMine ? (
                <EmptyCard
                  icon={<Pencil size={28} color={brandPrimary[600]} />}
                  title="Sin planes propios"
                  description="Todavía no creaste ningún plan. Tocá + para armar el tuyo."
                />
              ) : (
                <EmptyCard
                  icon={<ClipboardList size={28} color={brandPrimary[600]} />}
                  title="Sin planes disponibles"
                  description="El gym todavía no publicó planes de entrenamiento."
                />
              )}
            </View>
          ) : (
            <View
              className="px-6"
              style={{ gap: 18, paddingTop: isMine ? 16 : 0 }}
            >
              {list.map((plan, i) => (
                <Animated.View
                  key={plan.id}
                  entering={FadeInDown.delay(i * 80).springify()}
                >
                  <PlanTile
                    plan={plan}
                    index={i}
                    isCustom={isMine}
                    onPress={(p) =>
                      isMine
                        ? router.push(`/planes/plan-detail/custom/${p.id}`)
                        : router.push(`/planes/plan-detail/${p.id}`)
                    }
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.ScrollView>
      </GestureDetector>

      {/* FAB — único punto de creación de plan */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/planes/builder/custom-plan");
        }}
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 24,
          height: 52,
          borderRadius: 26,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: brandPrimary[500],
          shadowColor: brandPrimary[500],
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Plus size={20} color="white" />
        <Text className="font-jakarta-bold text-[14px] text-white">
          Crear plan
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function PlanTile({
  plan,
  index = 0,
  onPress,
  assignerName = null,
  isCustom = false,
}) {
  const config = OBJECTIVE_CONFIG[plan.objective] ?? DEFAULT_CONFIG;
  const { Icon } = config;

  const imageUrl = plan.cover_image_uri
    ? plan.cover_image_uri.startsWith("file://")
      ? plan.cover_image_uri
      : getCloudinaryUrl(
          plan.cover_image_uri,
          "w_500,h_500,c_fill,f_auto,q_auto"
        )
    : null;

  const planNumber = String(index + 1).padStart(2, "0");

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(plan);
      }}
      className="active:scale-[0.985]"
    >
      <View
        className="rounded-3xl overflow-hidden"
        style={{
          backgroundColor: "#0F0D20",
          shadowColor: BRAND_PRIMARY,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        {/* Halo mint en esquina superior izquierda */}
        <LinearGradient
          colors={["rgba(45,212,191,0.22)", "rgba(45,212,191,0)"]}
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

        {/* Glow indigo esquina inferior derecha */}
        <LinearGradient
          colors={["rgba(74,68,228,0)", "rgba(74,68,228,0.28)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 260,
            height: 180,
          }}
        />

        {/* Número editorial gigante de fondo */}
        <Text
          className="font-jakarta-bold"
          style={{
            position: "absolute",
            top: -22,
            right: -8,
            fontSize: 180,
            lineHeight: 180,
            color: "rgba(255,255,255,0.04)",
            letterSpacing: -8,
          }}
        >
          {planNumber}
        </Text>

        {/* Tick mint top-left */}
        <View
          style={{
            position: "absolute",
            top: 18,
            left: 20,
            width: 28,
            height: 3,
            backgroundColor: BRAND_MINT,
            borderRadius: 2,
          }}
        />

        {/* Tick mint complementario */}
        <View
          style={{
            position: "absolute",
            top: 18,
            left: 52,
            width: 10,
            height: 3,
            backgroundColor: "rgba(45,212,191,0.4)",
            borderRadius: 2,
          }}
        />

        {/* ── Header row: kicker ── */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 20, paddingTop: 32, gap: 12 }}
        >
          {assignerName ? (
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <ShieldHalf size={9} color={BRAND_MINT} />
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 10, color: BRAND_MINT, letterSpacing: 2.4 }}
                numberOfLines={1}
              >
                Asignado por {assignerName}
              </Text>
            </View>
          ) : isCustom || plan?.is_custom ? (
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Pencil size={9} color={BRAND_MINT} />
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 10, color: BRAND_MINT, letterSpacing: 2.4 }}
              >
                Plan personalizado
              </Text>
            </View>
          ) : (
            <Text
              className="font-manrope-bold uppercase"
              style={{ fontSize: 10, color: BRAND_MINT, letterSpacing: 2.4 }}
            >
              El Programa
            </Text>
          )}
        </View>

        {/* ── Body: título + imagen ── */}
        <View
          className="flex-row"
          style={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 14,
            gap: 16,
          }}
        >
          {/* Columna izquierda — título + meta */}
          <View className="flex-1" style={{ gap: 8 }}>
            <View style={{ gap: 8 }}>
              {/* Objetivo label minimalista */}
              {config.label && (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "rgba(255,255,255,0.4)",
                    }}
                  />
                  <Text
                    className="font-manrope-bold uppercase"
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.55)",
                      letterSpacing: 1.6,
                    }}
                  >
                    {config.label}
                  </Text>
                </View>
              )}

              {/* Título grande editorial */}
              <Text
                className="font-jakarta-bold text-white"
                style={{
                  fontSize: 26,
                  lineHeight: 30,
                  letterSpacing: -0.8,
                }}
                numberOfLines={3}
              >
                {plan.name}
              </Text>

              {/* Creador — línea micro */}
              {plan.creator && <CreatorLine creator={plan.creator} />}
            </View>
          </View>

          {/* Columna derecha — imagen cuadrada contenida */}
          <View style={{ gap: 6, alignItems: "center" }}>
            {/* Tick vertical mint pegado al borde */}
            <View
              style={{
                position: "absolute",
                left: -10,
                top: 12,
                width: 3,
                height: 36,
                backgroundColor: BRAND_MINT,
                borderRadius: 2,
              }}
            />

            <View
              className="rounded-2xl overflow-hidden"
              style={{
                width: 124,
                height: 124,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "#1a1730",
              }}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={250}
                />
              ) : (
                <>
                  <LinearGradient
                    colors={BRAND_FALLBACK_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={56} color="rgba(255,255,255,0.35)" />
                  </View>
                </>
              )}
            </View>

            {/* Marcador inferior bajo la imagen */}
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <View
                style={{
                  width: 14,
                  height: 1,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              />
              <Text
                className="font-manrope-bold uppercase"
                style={{
                  fontSize: 8,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: 1.4,
                }}
              >
                Cover
              </Text>
              <View
                style={{
                  width: 14,
                  height: 1,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              />
            </View>
          </View>
        </View>

        {/* ── Stats strip ── */}
        <View
          className="flex-row items-end"
          style={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: 18,
            gap: 22,
          }}
        >
          <PlanStat
            value={plan.weekly_days ?? 0}
            primaryLabel={plan.weekly_days === 1 ? "día" : "días"}
            secondaryLabel="por semana"
          />
          <View
            style={{
              width: 1,
              height: 30,
              backgroundColor: "rgba(255,255,255,0.1)",
              marginBottom: 2,
            }}
          />
          <PlanStat
            value={plan.duration_weeks || "∞"}
            primaryLabel={
              plan.duration_weeks
                ? plan.duration_weeks === 1
                  ? "semana"
                  : "semanas"
                : "sin duración"
            }
            secondaryLabel={plan.duration_weeks ? "de duración" : "fija"}
          />
        </View>

        {/* ── CTA Strip ── */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View
            className="flex-row items-center justify-between"
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "rgba(74,68,228,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(74,68,228,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: BRAND_PRIMARY,
                  }}
                />
              </View>
              <Text
                className="font-manrope-bold uppercase text-white"
                style={{
                  fontSize: 11,
                  letterSpacing: 1.5,
                }}
              >
                Ver Plan Completo
              </Text>
            </View>

            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 30,
                height: 30,
                backgroundColor: BRAND_PRIMARY,
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
  );
}

function CreatorLine({ creator }) {
  const displayName =
    [creator.name, creator.last_name]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ") || "—";

  return (
    <Text
      numberOfLines={1}
      className="font-manrope-bold uppercase text-[8px] tracking-[1.4px]"
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      Por {displayName}
    </Text>
  );
}

function PlanStat({ value, primaryLabel, secondaryLabel }) {
  return (
    <View className="flex-row items-end" style={{ gap: 8 }}>
      <Text
        className="font-jakarta-bold text-white"
        style={{
          fontSize: 32,
          lineHeight: 32,
          letterSpacing: -1.5,
        }}
      >
        {value}
      </Text>
      <View style={{ gap: 1, paddingBottom: 3 }}>
        <Text
          className="font-manrope-bold uppercase"
          style={{
            fontSize: 9,
            color: BRAND_MINT,
            letterSpacing: 1.6,
          }}
        >
          {primaryLabel}
        </Text>
        <Text
          className="font-manrope-semi uppercase"
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: 1.4,
          }}
        >
          {secondaryLabel}
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({ icon, title, description }) {
  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
      <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        {icon}
      </View>
      <Text className="text-[15px] font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-1.5">
        {title}
      </Text>
      <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 max-w-[240px]">
        {description}
      </Text>
    </View>
  );
}
