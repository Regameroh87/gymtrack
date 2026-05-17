// React Native
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useState, useMemo } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

// Hooks
import { useTrainingPlans } from "../../../src/hooks/useTrainingPlans";
import { useSessions } from "../../../src/hooks/useSessions";

// Constantes
import { SESSION_LEVELS } from "../../../src/constants/sessionOptions";

// Componentes
import Screen from "../../../src/components/Screen";
import SessionCard from "../../../src/components/cards/SessionCard";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import { Calendar, ClipboardList, Plus, Barbell } from "../../../assets/icons";

const OBJECTIVE_CONFIG = {
  hipertrofia: {
    gradient: ["#1e1580", "#6366f1"],
    accent: "#6366f1",
    label: "Hipertrofia",
  },
  fuerza: {
    gradient: ["#7f1d1d", "#ef4444"],
    accent: "#ef4444",
    label: "Fuerza",
  },
  perdida_grasa: {
    gradient: ["#052e16", "#22c55e"],
    accent: "#22c55e",
    label: "Pérdida de grasa",
  },
  resistencia: {
    gradient: ["#0c4a6e", "#38bdf8"],
    accent: "#38bdf8",
    label: "Resistencia",
  },
  acondicionamiento: {
    gradient: ["#78350f", "#f59e0b"],
    accent: "#f59e0b",
    label: "Acondicionamiento",
  },
  rehabilitacion: {
    gradient: ["#3b0764", "#a855f7"],
    accent: "#a855f7",
    label: "Rehabilitación",
  },
};

const DEFAULT_CONFIG = {
  gradient: ["#1e1580", "#4A44E4"],
  accent: "#4A44E4",
  label: null,
};

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

  const rows = [];
  for (let i = 0; i < plans.length; i += 2) rows.push(plans.slice(i, i + 2));

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

      <View className="px-6 gap-3">
        {rows.map((row, rowIndex) => (
          <Animated.View
            key={rowIndex}
            entering={FadeInDown.delay(rowIndex * 100).springify()}
            className="flex-row gap-3"
          >
            {row.map((plan) => (
              <PlanTile
                key={plan.id}
                plan={plan}
                onPress={(p) => router.push(`/rutinas/plan/${p.id}`)}
              />
            ))}
            {row.length === 1 && <View className="flex-1" />}
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

function PlanTile({ plan, onPress }) {
  const config = OBJECTIVE_CONFIG[plan.objective] ?? DEFAULT_CONFIG;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(plan);
      }}
      className="flex-1 active:scale-[0.97]"
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl overflow-hidden p-4 justify-between"
        style={{ minHeight: 148 }}
      >
        <View
          className="absolute rounded-full"
          style={{
            width: 96,
            height: 96,
            top: -32,
            right: -32,
            backgroundColor: "rgba(255,255,255,0.07)",
          }}
        />
        <View
          className="absolute rounded-full"
          style={{
            width: 72,
            height: 72,
            bottom: -16,
            left: -24,
            backgroundColor: "rgba(0,0,0,0.12)",
          }}
        />

        {config.label && (
          <View
            className="self-start rounded-full px-2 py-0.5 mb-3"
            style={{ backgroundColor: config.accent + "33" }}
          >
            <Text
              className="text-[9px] font-manrope-bold uppercase tracking-wide"
              style={{ color: config.accent + "ee" }}
            >
              {config.label}
            </Text>
          </View>
        )}

        <Text
          className="font-jakarta-bold text-white text-[15px] leading-[19px] flex-1"
          numberOfLines={3}
        >
          {plan.name}
        </Text>

        <View className="flex-row items-center gap-1.5 mt-3">
          <Calendar size={11} color="rgba(255,255,255,0.6)" />
          <Text
            className="text-[11px] font-manrope-semi"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {plan.day_count} {plan.day_count === 1 ? "día" : "días"}
          </Text>
        </View>
      </LinearGradient>
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
