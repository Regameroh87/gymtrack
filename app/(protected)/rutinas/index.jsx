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

const TABS = [
  { key: "planes", label: "Planes" },
  { key: "sesiones", label: "Sesiones" },
];

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("planes");
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

  const totalDays = useMemo(
    () => plans.reduce((acc, p) => acc + (p.day_count || 0), 0),
    [plans]
  );

  const availableLevelFilters = useMemo(() => {
    const usedLevels = new Set(sessions.map((s) => s.level).filter(Boolean));
    return LEVEL_FILTERS.filter((f) => f.key === null || usedLevels.has(f.key));
  }, [sessions]);

  const switchTab = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(key);
  };

  const isSesiones = activeTab === "sesiones";
  const isLoading = isSesiones ? sessionsLoading : plansLoading;

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

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(
              isSesiones ? "/rutinas/sessions/new" : "/rutinas/builder"
            );
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
      </View>

      {/* Tabs con subrayado */}
      <View className="flex-row px-6 mt-5 border-b border-ui-input-border">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === "sesiones" ? sessions.length : plans.length;
          return (
            <Pressable
              key={tab.key}
              onPress={() => switchTab(tab.key)}
              className="mr-7 pb-3 relative"
            >
              <View className="flex-row items-center gap-2">
                <Text
                  className={`font-jakarta-bold text-[17px] ${
                    isActive
                      ? "text-ui-text-main dark:text-ui-text-mainDark"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <Text
                    className="font-manrope-bold text-[11px]"
                    style={{
                      color: isActive
                        ? brandPrimary[500]
                        : "rgba(110,107,138,0.5)",
                    }}
                  >
                    {count}
                  </Text>
                )}
              </View>

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
      ) : isSesiones ? (
        <SesionesContent
          sessions={filteredSessions}
          allSessions={sessions}
          levelFilters={availableLevelFilters}
          activeLevel={activeLevel}
          onLevelChange={(level) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveLevel(level);
          }}
          router={router}
          insets={insets}
        />
      ) : (
        <PlanesContent
          plans={plans}
          totalDays={totalDays}
          router={router}
          insets={insets}
        />
      )}
    </Screen>
  );
}

// ─── Tab: Planes ────────────────────────────────────────────────────────────

function PlanesContent({ plans, totalDays, router, insets }) {
  if (plans.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <EmptyPlanes router={router} />
      </ScrollView>
    );
  }

  const rows = [];
  for (let i = 0; i < plans.length; i += 2) rows.push(plans.slice(i, i + 2));

  return (
    <Animated.ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats */}
      <View className="flex-row gap-3 px-6 pt-5 mb-6">
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

      {/* Grid 2 columnas */}
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
    </Animated.ScrollView>
  );
}

// ─── Tab: Sesiones ───────────────────────────────────────────────────────────

function SesionesContent({
  sessions,
  allSessions,
  levelFilters,
  activeLevel,
  onLevelChange,
  router,
  insets,
}) {
  if (allSessions.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <EmptySesiones router={router} />
      </ScrollView>
    );
  }

  return (
    <Animated.ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Filter chips */}
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
        <View className="px-6 py-8 items-center">
          <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
            No hay rutinas para este nivel.
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
    </Animated.ScrollView>
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
        {/* Círculos decorativos */}
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

        {/* Badge objetivo */}
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

        {/* Nombre */}
        <Text
          className="font-jakarta-bold text-white text-[15px] leading-[19px] flex-1"
          numberOfLines={3}
        >
          {plan.name}
        </Text>

        {/* Días */}
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

// ─── Empty states ────────────────────────────────────────────────────────────

function EmptyPlanes({ router }) {
  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
      <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <ClipboardList size={32} color={brandPrimary[600]} />
      </View>
      <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
        No tenés planes activos
      </Text>
      <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
        Elegí una plantilla de tu entrenador o creá el tuyo propio.
      </Text>
      <View className="w-full gap-3">
        <Pressable
          onPress={() => router.push("/rutinas/select")}
          className="w-full active:scale-[0.98]"
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-3.5 rounded-xl items-center flex-row justify-center"
          >
            <ClipboardList size={18} color="white" />
            <Text className="text-white font-jakarta-semi text-sm ml-2">
              Elegir un plan
            </Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => router.push("/rutinas/builder")}
          className="py-3.5 rounded-xl items-center flex-row justify-center border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-70"
        >
          <Plus size={18} color={brandPrimary[500]} />
          <Text className="font-jakarta-semi text-sm ml-2 text-brandPrimary-500 dark:text-brandPrimary-400">
            Crear mi propio plan
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptySesiones({ router }) {
  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
      <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        <Barbell size={32} color={brandPrimary[600]} />
      </View>
      <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
        No hay sesiones
      </Text>
      <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
        Creá tu primera sesión para empezar a estructurar tus entrenamientos.
      </Text>
      <Pressable
        onPress={() => router.push("/rutinas/sessions/new")}
        className="w-full active:scale-[0.98]"
      >
        <LinearGradient
          colors={[brandPrimary[600], brandPrimary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="py-3.5 rounded-xl items-center flex-row justify-center"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-jakarta-semi text-sm ml-2">
            Nueva sesión
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
