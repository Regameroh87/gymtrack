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

// Hooks
import { useTrainingPlans } from "../../../src/hooks/useTrainingPlans";
import { useSessions } from "../../../src/hooks/useSessions";

// Utilidades
import { getCloudinaryUrl } from "../../../src/utils/cloudinary";

// Constantes
import { SESSION_LEVELS } from "../../../src/constants/sessionOptions";

// Componentes
import Screen from "../../../src/components/Screen";
import SessionCard from "../../../src/components/cards/SessionCard";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import {
  Barbell,
  Calendar,
  ChartBar,
  ChevronRight,
  ClipboardList,
  Clock,
  Logs,
  Plus,
  ShieldHalf,
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
  { key: "mis_planes", label: "Mis Planes" },
  { key: "catalogo", label: "Catálogo" },
];

const CATALOG_TYPES = [
  { key: "planes", label: "Planes" },
  { key: "sesiones", label: "Sesiones" },
];

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("mis_planes");
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
            Rutinas
          </Text>
        </View>

        {activeTab === "mis_planes" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/rutinas/builder");
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
      ) : (
        <CatalogoContent
          plans={plans}
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
          router={router}
          insets={insets}
        />
      )}
    </Screen>
  );
}

// ─── Tab: Mis Planes ──────────────────────────────────────────────────────────

function MisPlanesContent({ router, insets, onBrowseCatalog }) {
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
      {/* Planes asignados por el entrenador */}
      <Text className="font-jakarta-bold text-[16px] text-ui-text-main dark:text-ui-text-mainDark mb-3">
        Asignados por mi entrenador
      </Text>

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
              Sin planes asignados
            </Text>
          </View>
          <Text className="font-manrope text-[13px] text-ui-text-muted dark:text-ui-text-mutedDark leading-5 mb-4">
            Tu entrenador aún no te asignó un plan. Cuando lo haga, aparecerá
            acá listo para arrancar.
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

      {/* Mis rutinas propias */}
      <Text className="font-jakarta-bold text-[16px] text-ui-text-main dark:text-ui-text-mainDark mb-3">
        Mis rutinas
      </Text>

      <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
        <View className="w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Barbell size={28} color={brandPrimary[600]} />
        </View>
        <Text className="text-[15px] font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-1.5">
          Sin rutinas propias
        </Text>
        <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-5 max-w-[240px]">
          Armá tu propia rutina eligiendo ejercicios y prescripciones a tu
          medida.
        </Text>
        <Pressable
          onPress={() => router.push("/rutinas/builder")}
          className="w-full active:scale-[0.98]"
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-3.5 rounded-xl items-center flex-row justify-center"
          >
            <Plus size={16} color="white" />
            <Text className="text-white font-jakarta-semi text-sm ml-2">
              Crear mi rutina
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
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
        <PlanesSection plans={plans} router={router} />
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

function PlanesSection({ plans, router }) {
  const totalDays = useMemo(
    () => plans.reduce((acc, p) => acc + (p.day_count || 0), 0),
    [plans]
  );

  if (plans.length === 0) {
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
      <View className="flex-row gap-3 px-6 pt-5 mb-5">
        <StatTile
          value={plans.length}
          label={plans.length === 1 ? "Plan disponible" : "Planes disponibles"}
          accent={brandPrimary[500]}
        />
        <StatTile
          value={totalDays}
          label="Días de entrenamiento"
          accent="#10b981"
        />
      </View>

      <View className="px-6" style={{ gap: 18 }}>
        {plans.map((plan, i) => (
          <Animated.View
            key={plan.id}
            entering={FadeInDown.delay(i * 80).springify()}
          >
            <PlanTile
              plan={plan}
              index={i}
              onPress={(p) => router.push(`/rutinas/plan/${p.id}`)}
            />
          </Animated.View>
        ))}
      </View>
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
                onPress={(s) => router.push(`/rutinas/sesion/${s.id}`)}
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

        {/* ── Header row: kicker + número ── */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 20, paddingTop: 32 }}
        >
          <Text
            className="font-manrope-bold uppercase"
            style={{
              fontSize: 10,
              color: BRAND_MINT,
              letterSpacing: 2.4,
            }}
          >
            Workout Program
          </Text>

          <View className="flex-row items-center" style={{ gap: 6 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: BRAND_MINT,
                shadowColor: BRAND_MINT,
                shadowOpacity: 1,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
            <Text
              className="font-jakarta-bold"
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: 2,
              }}
            >
              EDITION N°{planNumber}
            </Text>
          </View>
        </View>

        {/* ── Body: título + imagen ── */}
        <View
          className="flex-row"
          style={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 22,
            gap: 16,
          }}
        >
          {/* Columna izquierda — título + meta */}
          <View className="flex-1 justify-between" style={{ gap: 14 }}>
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
            </View>

            {/* Línea de stats */}
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text
                className="font-jakarta-bold text-white"
                style={{
                  fontSize: 32,
                  lineHeight: 32,
                  letterSpacing: -1.5,
                }}
              >
                {plan.day_count ?? 0}
              </Text>
              <View style={{ gap: 1 }}>
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 9,
                    color: BRAND_MINT,
                    letterSpacing: 1.6,
                  }}
                >
                  {plan.day_count === 1 ? "día" : "días"}
                </Text>
                <Text
                  className="font-manrope-semi uppercase"
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: 1.4,
                  }}
                >
                  de entrenamiento
                </Text>
              </View>
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

function StatTile({ value, label, accent }) {
  return (
    <View className="flex-1 bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl px-4 py-3.5 border border-ui-input-border overflow-hidden">
      <View
        className="absolute rounded-full"
        style={{
          width: 64,
          height: 64,
          top: -24,
          right: -24,
          backgroundColor: accent,
          opacity: 0.1,
        }}
      />
      <Text
        className="font-jakarta-bold text-[26px] leading-[30px]"
        style={{ color: accent }}
      >
        {value}
      </Text>
      <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
        {label}
      </Text>
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
