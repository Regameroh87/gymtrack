// React Native
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useColorScheme } from "nativewind";
import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "../../../src/database";
import {
  exercises_base,
  exercise_equipment,
  sessions,
  session_exercises,
  training_plans,
} from "../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../src/database/sync";

// Hooks
import { useTrainingPlans } from "../../../src/hooks/useTrainingPlans";
import { useSessions } from "../../../src/hooks/useSessions";
import { useExercises } from "../../../src/hooks/useExercises";
import { usePlanAssignments } from "../../../src/hooks/usePlanAssignments";
import { useDropPlan } from "../../../src/hooks/useAssignPlan";
import { useAuth } from "../../../src/auth/lib/getSession";

// Utilidades
import { getCloudinaryUrl } from "../../../src/utils/cloudinary";

// Constantes
import { SESSION_LEVELS } from "../../../src/constants/sessionOptions";

// Componentes
import Screen from "../../../src/components/Screen";
import SessionCard from "../../../src/components/cards/SessionCard";

// Tema / assets
import { brandPrimary, ui } from "../../../src/theme/colors";
import {
  Barbell,
  Calendar,
  ChartBar,
  ChevronRight,
  ClipboardList,
  Clock,
  Logs,
  Pencil,
  Plus,
  ShieldHalf,
  Trash,
} from "../../../assets/icons";

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

const LEVEL_FILTERS = [
  { key: null, label: "Todos" },
  ...SESSION_LEVELS.map((l) => ({ key: l.value, label: l.label })),
];

const MAIN_TABS = [
  { key: "catalogo", label: "Catálogo" },
  { key: "mis_planes", label: "Mis Planes" },
  { key: "biblioteca", label: "Biblioteca" },
];

const LIB_TABS = [
  { key: "planes", label: "Planes" },
  { key: "sesiones", label: "Sesiones" },
  { key: "ejercicios", label: "Ejercicios" },
];

const CATALOG_TYPES = [
  { key: "planes", label: "Planes" },
  { key: "sesiones", label: "Sesiones" },
];

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState("catalogo");
  const [catalogType, setCatalogType] = useState("planes");
  const [activeLevel, setActiveLevel] = useState(null);

  const { data: plans = [], isLoading: plansLoading } = useTrainingPlans();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const filteredSessions = useMemo(
    () =>
      activeLevel === null
        ? sessions
        : sessions.filter((s) => s.level === activeLevel),
    [sessions, activeLevel]
  );

  const availableLevelFilters = useMemo(() => {
    const usedLevels = new Set(sessions.map((s) => s.level).filter(Boolean));
    return LEVEL_FILTERS.filter((f) => f.key === null || usedLevels.has(f.key));
  }, [sessions]);

  const [activeObjective, setActiveObjective] = useState(null);

  const availableObjectiveFilters = useMemo(() => {
    const usedObjs = new Set(plans.map((p) => p.objective).filter(Boolean));
    return [
      { key: null, label: "Todos" },
      ...Object.entries(OBJECTIVE_CONFIG)
        .filter(([key]) => usedObjs.has(key))
        .map(([key, cfg]) => ({ key, label: cfg.label })),
    ];
  }, [plans]);

  const filteredPlans = useMemo(
    () =>
      activeObjective === null
        ? plans
        : plans.filter((p) => p.objective === activeObjective),
    [plans, activeObjective]
  );

  const myPlans = useMemo(
    () => plans.filter((p) => p.created_by === userId),
    [plans, userId]
  );
  const mySessions = useMemo(
    () => sessions.filter((s) => s.created_by === userId),
    [sessions, userId]
  );

  const switchTab = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(key);
  };

  const isLoading =
    activeTab === "catalogo"
      ? catalogType === "planes"
        ? plansLoading
        : sessionsLoading
      : false;

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

        {activeTab === "mis_planes" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/planes/builder");
            }}
            className="mt-1 active:scale-[0.95]"
          >
            <LinearGradient
              colors={[brandPrimary[600], brandPrimary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-10 h-10 rounded-xl items-center justify-center"
            >
              <Plus size={18} color="white" />
            </LinearGradient>
          </Pressable>
        )}
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
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : activeTab === "mis_planes" ? (
        <MisPlanesContent
          router={router}
          insets={insets}
          onBrowseCatalog={() => switchTab("catalogo")}
        />
      ) : activeTab === "biblioteca" ? (
        <BibliotecaContent
          myPlans={myPlans}
          mySessions={mySessions}
          userId={userId}
          router={router}
          insets={insets}
        />
      ) : (
        <CatalogoContent
          plans={filteredPlans}
          sessions={filteredSessions}
          allSessions={sessions}
          catalogType={catalogType}
          onTypeChange={(t) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCatalogType(t);
          }}
          levelFilters={availableLevelFilters}
          activeLevel={activeLevel}
          onLevelChange={(level) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveLevel(level);
          }}
          objectiveFilters={availableObjectiveFilters}
          activeObjective={activeObjective}
          onObjectiveChange={(obj) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveObjective(obj);
          }}
          router={router}
          insets={insets}
        />
      )}
    </Screen>
  );
}

// ─── Tab: Mis Planes ──────────────────────────────────────────────────────────

function MisPlanesContent({ router, insets, onBrowseCatalog }) {
  const { userId } = useAuth();
  const { data: assignments, isLoading } = usePlanAssignments();
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
        id: currentPlan.plan_id,
        name: currentPlan.plan_name,
        cover_image_uri: currentPlan.plan_cover,
        objective: currentPlan.plan_objective,
        level: currentPlan.plan_level,
        weekly_days: currentPlan.plan_weekly_days,
        duration_weeks: currentPlan.plan_duration_weeks,
      }
    : null;

  const assignedByCoach = currentPlan && currentPlan.assigned_by !== userId;

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
          {assignedByCoach && (
            <View className="flex-row items-center gap-2 mb-2 px-1">
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: BRAND_MINT,
                }}
              />
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 10, color: BRAND_MINT, letterSpacing: 1.6 }}
              >
                Asignado por tu entrenador
              </Text>
            </View>
          )}
          <PlanTile
            plan={planObj}
            index={0}
            onPress={() => router.push(`/planes/plan/${currentPlan.plan_id}`)}
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
              Elegí un plan del catálogo y empezá a entrenar con estructura.
            </Text>
            <Pressable
              onPress={onBrowseCatalog}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Text
                className="font-jakarta-semi text-[13px]"
                style={{ color: brandPrimary[500] }}
              >
                Explorar catálogo del gym
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
                onPress={() => router.push(`/planes/plan/${item.plan_id}`)}
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
                      {item.plan_name ?? "Plan eliminado"}
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

// ─── Tab: Catálogo ────────────────────────────────────────────────────────────

function CatalogoContent({
  plans,
  sessions,
  allSessions,
  catalogType,
  onTypeChange,
  levelFilters,
  activeLevel,
  onLevelChange,
  objectiveFilters,
  activeObjective,
  onObjectiveChange,
  router,
  insets,
}) {
  return (
    <Animated.ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Toggle Planes / Sesiones */}
      <View className="px-6 pt-4 pb-1">
        <View className="flex-row bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-1">
          {CATALOG_TYPES.map((type) => {
            const isActive = catalogType === type.key;
            return (
              <Pressable
                key={type.key}
                onPress={() => onTypeChange(type.key)}
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
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {catalogType === "planes" ? (
        <PlanesSection
          plans={plans}
          objectiveFilters={objectiveFilters}
          activeObjective={activeObjective}
          onObjectiveChange={onObjectiveChange}
          router={router}
        />
      ) : (
        <SesionesSection
          sessions={sessions}
          allSessions={allSessions}
          levelFilters={levelFilters}
          activeLevel={activeLevel}
          onLevelChange={onLevelChange}
          router={router}
        />
      )}
    </Animated.ScrollView>
  );
}

// ─── Sección Planes ───────────────────────────────────────────────────────────

function PlanesSection({
  plans,
  objectiveFilters,
  activeObjective,
  onObjectiveChange,
  router,
}) {
  const hasPlans = plans.length > 0 || activeObjective !== null;

  if (!hasPlans && objectiveFilters.length <= 1) {
    return (
      <View className="px-6 pt-5">
        <EmptyCard
          icon={<ClipboardList size={28} color={brandPrimary[600]} />}
          title="Sin planes disponibles"
          description="El gym todavía no publicó planes de entrenamiento."
        />
      </View>
    );
  }

  return (
    <>
      {/* Filtro por objetivo */}
      {objectiveFilters.length > 1 && (
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
            {objectiveFilters.map((filter) => {
              const isActive = activeObjective === filter.key;
              return (
                <Pressable
                  key={filter.key ?? "all"}
                  onPress={() => onObjectiveChange(filter.key)}
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

      {plans.length === 0 ? (
        <View className="px-6 py-4 items-center">
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
            No hay planes para este objetivo.
          </Text>
        </View>
      ) : (
        <View className="px-6" style={{ gap: 18 }}>
          {plans.map((plan, i) => (
            <Animated.View
              key={plan.id}
              entering={FadeInDown.delay(i * 80).springify()}
            >
              <PlanTile
                plan={plan}
                index={i}
                onPress={(p) => router.push(`/planes/plan/${p.id}`)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </>
  );
}

// ─── Sección Sesiones ─────────────────────────────────────────────────────────

function SesionesSection({
  sessions,
  allSessions,
  levelFilters,
  activeLevel,
  onLevelChange,
  router,
}) {
  if (allSessions.length === 0) {
    return (
      <View className="px-6 pt-5">
        <EmptyCard
          icon={<Barbell size={28} color={brandPrimary[600]} />}
          title="Sin sesiones disponibles"
          description="El gym todavía no publicó sesiones de entrenamiento."
        />
      </View>
    );
  }

  return (
    <>
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
          {levelFilters.map((filter) => {
            const isActive = activeLevel === filter.key;
            return (
              <Pressable
                key={filter.key ?? "all"}
                onPress={() => onLevelChange(filter.key)}
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

      {sessions.length === 0 ? (
        <View className="px-6 py-4 items-center">
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
            No hay sesiones para este nivel.
          </Text>
        </View>
      ) : (
        <View className="px-6 gap-4">
          {sessions.map((session, i) => (
            <Animated.View
              key={session.id}
              entering={FadeInDown.delay(i * 70).springify()}
            >
              <SessionCard
                session={session}
                onPress={(s) => router.push(`/planes/sesion/${s.id}`)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function PlanTile({ plan, index = 0, onPress }) {
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

        {/* ── Header row: kicker + creador ── */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 20, paddingTop: 32, gap: 12 }}
        >
          <Text
            className="font-manrope-bold uppercase"
            style={{
              fontSize: 10,
              color: BRAND_MINT,
              letterSpacing: 2.4,
            }}
          >
            El Programa
          </Text>
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
            value={plan.duration_weeks ?? 0}
            primaryLabel={plan.duration_weeks === 1 ? "semana" : "semanas"}
            secondaryLabel="de duración"
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

// ─── Tab: Biblioteca ──────────────────────────────────────────────────────────

function BibliotecaContent({ myPlans, mySessions, userId, router, insets }) {
  const [activeLib, setActiveLib] = useState("planes");
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const queryClient = useQueryClient();

  const { data: allExercises = [], isLoading: loadingExercises } =
    useExercises();
  const myExercises = useMemo(
    () => allExercises.filter((e) => e.created_by === userId),
    [allExercises, userId]
  );

  const handleDeletePlan = (plan) => {
    Alert.alert("Eliminar plan", `¿Eliminar "${plan.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database
            .update(training_plans)
            .set({ sync_status: "deleted" })
            .where(eq(training_plans.id, plan.id));
          queryClient.invalidateQueries({ queryKey: ["training_plans"] });
          checkNetInfoAndSync().catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteSession = (session) => {
    Alert.alert("Eliminar sesión", `¿Eliminar "${session.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database.transaction(async (tx) => {
            await tx
              .update(session_exercises)
              .set({ sync_status: "deleted" })
              .where(eq(session_exercises.session_id, session.id));
            await tx
              .update(sessions)
              .set({ sync_status: "deleted" })
              .where(eq(sessions.id, session.id));
          });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          checkNetInfoAndSync().catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteExercise = (exercise) => {
    Alert.alert("Eliminar ejercicio", `¿Eliminar "${exercise.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database.transaction(async (tx) => {
            await tx
              .update(exercise_equipment)
              .set({ sync_status: "deleted" })
              .where(eq(exercise_equipment.exercise_id, exercise.id));
            await tx
              .update(exercises_base)
              .set({ sync_status: "deleted" })
              .where(eq(exercises_base.id, exercise.id));
          });
          queryClient.invalidateQueries({ queryKey: ["exercises"] });
          checkNetInfoAndSync().catch(() => {});
        },
      },
    ]);
  };

  const fabRoute =
    activeLib === "planes"
      ? "/planes/builder"
      : activeLib === "sesiones"
        ? "/biblioteca/sesiones/builder"
        : "/biblioteca/ejercicios/builder";

  const listData =
    activeLib === "planes"
      ? myPlans
      : activeLib === "sesiones"
        ? mySessions
        : myExercises;

  const isLibLoading = activeLib === "ejercicios" && loadingExercises;

  return (
    <View className="flex-1">
      {/* Descripción */}
      <View className="px-6 pt-4 pb-1">
        <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark leading-5">
          Planes, sesiones y ejercicios que vos mismo creaste. Editá o borrá
          cualquiera desde acá, y usálos cuando armes tus rutinas.
        </Text>
      </View>

      {/* Tabs internos */}
      <View className="px-6 mt-4 mb-2">
        <View className="flex-row bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-1">
          {LIB_TABS.map((tab) => {
            const isActive = activeLib === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveLib(tab.key);
                }}
                className="flex-1 items-center py-2 rounded-lg active:opacity-70"
                style={isActive ? { backgroundColor: brandPrimary[500] } : {}}
              >
                <Text
                  className={`font-jakarta-semi text-[12px] ${
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

      {isLibLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center px-6">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5">
                {activeLib === "planes"
                  ? "Todavía no creaste ningún plan.\nTocá + para armar el tuyo."
                  : activeLib === "sesiones"
                    ? "Todavía no creaste ninguna sesión.\nTocá + para empezar."
                    : "Todavía no creaste ningún ejercicio.\nTocá + para agregar el primero."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (activeLib === "planes") {
              return (
                <LibPlanRow
                  plan={item}
                  onEdit={() => router.push(`/planes/builder?id=${item.id}`)}
                  onDelete={() => handleDeletePlan(item)}
                  isDark={isDark}
                />
              );
            }
            if (activeLib === "sesiones") {
              return (
                <LibSessionRow
                  session={item}
                  onEdit={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/biblioteca/sesiones/builder?id=${item.id}`);
                  }}
                  onDelete={() => handleDeleteSession(item)}
                  isDark={isDark}
                />
              );
            }
            return (
              <LibExerciseRow
                exercise={item}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/biblioteca/ejercicios/builder?id=${item.id}`);
                }}
                onDelete={() => handleDeleteExercise(item)}
                isDark={isDark}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(fabRoute);
        }}
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: brandPrimary[500],
          alignItems: "center",
          justifyContent: "center",
          shadowColor: brandPrimary[500],
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Plus size={24} color="white" />
      </Pressable>
    </View>
  );
}

// ─── Filas de biblioteca ──────────────────────────────────────────────────────

function LibPlanRow({ plan, onEdit, onDelete, isDark }) {
  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
      <View className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <Barbell size={20} color={brandPrimary[500]} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {plan.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
          {plan.weekly_days} días ·{" "}
          {plan.duration_weeks === 0
            ? "Indefinido"
            : `${plan.duration_weeks} sem`}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <Pressable
          onPress={onEdit}
          className="w-8 h-8 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <Pencil size={14} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 active:opacity-60"
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

function LibSessionRow({ session, onEdit, onDelete, isDark }) {
  const imageUrl = session.cover_image_uri
    ? session.cover_image_uri.startsWith("file://")
      ? session.cover_image_uri
      : getCloudinaryUrl(
          session.cover_image_uri,
          "w_120,h_120,c_fill,f_auto,q_auto"
        )
    : null;

  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Text className="text-lg">💪</Text>
        </View>
      )}
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {session.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
          {session.exercise_count ?? 0} ejercicio
          {session.exercise_count !== 1 ? "s" : ""}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <Pressable
          onPress={onEdit}
          className="w-8 h-8 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <Pencil size={14} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 active:opacity-60"
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

function LibExerciseRow({ exercise, onEdit, onDelete, isDark }) {
  const imageUrl = exercise.image_uri
    ? exercise.image_uri.startsWith("file://")
      ? exercise.image_uri
      : getCloudinaryUrl(exercise.image_uri, "w_120,h_120,c_fill,f_auto,q_auto")
    : null;

  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Text className="text-lg">🏋️</Text>
        </View>
      )}
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5 capitalize">
          {exercise.muscle_group}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <Pressable
          onPress={onEdit}
          className="w-8 h-8 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <Pencil size={14} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 active:opacity-60"
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
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
