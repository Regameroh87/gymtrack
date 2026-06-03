// React Native
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";
import { useMemo } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

// Hooks
import { useSessionLogs } from "../../../src/hooks/sessions/use-session-logs";
import { useActivePlanSummary } from "../../../src/hooks/plans/use-active-plan-summary";

// Utilidades
import {
  MONTHS_ES,
  formatDuration,
  formatMonthLabel,
} from "../../../src/utils/format-date";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import {
  Barbell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Logs,
  Plus,
} from "../../../assets/icons";

// Firma visual Editorial Pass
const BRAND_MINT = "#2DD4BF";
const SURFACE = "#0F0D20";

// Resuelve título + kicker de un registro según su origen (plan, sesión suelta
// o entrenamiento libre sin sesión asociada).
function resolveLogLabels(log) {
  if (log.plan_id && log.plan_name) {
    return {
      title: log.session_name ?? log.plan_name,
      kicker: `${log.plan_name}${
        log.week_number ? ` · SEM ${log.week_number}` : ""
      }${log.day_number ? ` D${log.day_number}` : ""}`,
    };
  }
  if (log.session_name) {
    return { title: log.session_name, kicker: "Registro manual" };
  }
  return { title: "Entrenamiento libre", kicker: "Registro manual" };
}

export default function RegistrosTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: logs = [], isLoading } = useSessionLogs();
  const { data: summary } = useActivePlanSummary();

  // Agrupa los logs por mes; vienen ya ordenados del más reciente al más viejo.
  const sections = useMemo(() => {
    const groups = [];
    const byKey = new Map();
    for (const log of logs) {
      const d = new Date(log.completed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let group = byKey.get(key);
      if (!group) {
        group = { title: formatMonthLabel(d), data: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      group.data.push(log);
    }
    return groups;
  }, [logs]);

  const totalDuration = useMemo(
    () => logs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0),
    [logs]
  );

  const goToNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/registros/nuevo");
  };

  return (
    <Screen safe>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Progreso
          </Text>
          <Text className="text-[28px] font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark leading-8">
            Registros
          </Text>
        </View>

        <Pressable onPress={goToNew} className="mt-1 active:scale-[0.95]">
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : logs.length === 0 ? (
        <EmptyState
          router={router}
          insets={insets}
          onLogPast={goToNew}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 32,
          }}
          ListHeaderComponent={
            <View>
              <View className="flex-row gap-3 mb-6">
                <StatTile
                  value={logs.length}
                  label={logs.length === 1 ? "Entrenamiento" : "Entrenamientos"}
                  accent={brandPrimary[500]}
                />
                <StatTile
                  value={formatDuration(totalDuration)}
                  label="Tiempo total"
                  accent={BRAND_MINT}
                />
              </View>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text
              className="font-manrope-bold uppercase mb-3 mt-2"
              style={{
                fontSize: 11,
                letterSpacing: 1.8,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 8) * 50).springify()}
              className="mb-3"
            >
              <LogCard
                log={item}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/registros/${item.id}`);
                }}
              />
            </Animated.View>
          )}
        />
      )}
    </Screen>
  );
}

// ─── Card de un registro ──────────────────────────────────────────────────────

function LogCard({ log, onPress }) {
  const { title, kicker } = resolveLogLabels(log);
  const date = new Date(log.completed_at);

  const stats = [
    `${log.exercise_count} ${log.exercise_count === 1 ? "ej." : "ejs."}`,
    `${log.set_count} ${log.set_count === 1 ? "serie" : "series"}`,
    formatDuration(log.duration_seconds),
  ]
    .filter((s) => s !== "—")
    .join("  ·  ");

  return (
    <Pressable onPress={onPress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden flex-row items-center"
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
          padding: 14,
          gap: 14,
        }}
      >
        {/* Bloque de fecha editorial */}
        <View
          className="items-center justify-center rounded-xl"
          style={{
            width: 56,
            height: 56,
            backgroundColor: "rgba(74,68,228,0.14)",
            borderWidth: 1,
            borderColor: "rgba(74,68,228,0.3)",
          }}
        >
          <Text
            className="font-jakarta-bold text-white"
            style={{ fontSize: 22, lineHeight: 24, letterSpacing: -0.5 }}
          >
            {date.getDate()}
          </Text>
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 9, letterSpacing: 1.4, color: BRAND_MINT }}
          >
            {MONTHS_ES[date.getMonth()]}
          </Text>
        </View>

        {/* Contenido */}
        <View className="flex-1 min-w-0" style={{ gap: 4 }}>
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 9, letterSpacing: 1.4, color: BRAND_MINT }}
            numberOfLines={1}
          >
            {kicker}
          </Text>
          <Text
            className="font-jakarta-bold text-white"
            style={{ fontSize: 16, letterSpacing: -0.4 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="font-manrope"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}
            numberOfLines={1}
          >
            {stats || "Sin series registradas"}
          </Text>
        </View>

        {/* Chevron */}
        <View
          className="items-center justify-center rounded-full shrink-0"
          style={{
            width: 28,
            height: 28,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ router, insets, onLogPast }) {
  // Si el usuario tiene un plan activo en curso, el CTA primario lo lleva a
  // continuar ese plan; si no, lo lleva a explorar el catálogo de rutinas.
  const { data: summary } = useActivePlanSummary();
  const hasActivePlan = !!summary && !summary.isCompleted;

  const primary = hasActivePlan
    ? { label: "Continuar mi plan", route: "/planes" }
    : { label: "Explorar rutinas", route: "/planes" };

  return (
    <View
      className="flex-1 px-6 items-center justify-center"
      style={{ paddingBottom: insets.bottom + 24 }}
    >
      <View
        className="rounded-3xl overflow-hidden w-full"
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {/* Halo mint superior */}
        <LinearGradient
          colors={["rgba(45,212,191,0.16)", "rgba(45,212,191,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.9 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 200,
            height: 200,
          }}
        />

        {/* Número editorial de fondo */}
        <Text
          className="font-jakarta-bold"
          style={{
            position: "absolute",
            top: -30,
            right: -10,
            fontSize: 160,
            lineHeight: 160,
            color: "rgba(255,255,255,0.04)",
            letterSpacing: -6,
          }}
        >
          00
        </Text>

        <View style={{ padding: 28 }}>
          {/* Ticks firma */}
          <View className="flex-row items-center mb-5" style={{ gap: 4 }}>
            <View
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                backgroundColor: BRAND_MINT,
              }}
            />
            <View
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                backgroundColor: "rgba(45,212,191,0.4)",
              }}
            />
          </View>

          <View
            className="w-14 h-14 rounded-2xl items-center justify-center mb-5"
            style={{ backgroundColor: "rgba(74,68,228,0.16)" }}
          >
            <Logs size={26} color={brandPrimary[400]} />
          </View>

          <Text
            className="font-jakarta-bold text-white mb-2"
            style={{ fontSize: 22, letterSpacing: -0.6 }}
          >
            Todavía no hay registros
          </Text>
          <Text
            className="font-manrope mb-7"
            style={{
              fontSize: 13,
              lineHeight: 20,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Cada entrenamiento que completes queda guardado acá con sus series,
            repeticiones y peso. También podés cargar sesiones que ya hiciste.
          </Text>

          {/* CTA primario */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(primary.route);
            }}
            className="active:scale-[0.97] mb-3"
          >
            <LinearGradient
              colors={[brandPrimary[600], brandPrimary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl flex-row items-center justify-center"
              style={{ paddingVertical: 15, gap: 8 }}
            >
              <Barbell size={17} color="white" />
              <Text
                className="font-jakarta-bold text-white"
                style={{ fontSize: 14 }}
              >
                {primary.label}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* CTA secundario: registro manual */}
          <Pressable onPress={onLogPast} className="active:scale-[0.97]">
            <View
              className="rounded-2xl flex-row items-center justify-center"
              style={{
                paddingVertical: 15,
                gap: 8,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <ClipboardList size={16} color="rgba(255,255,255,0.7)" />
              <Text
                className="font-jakarta-semi"
                style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}
              >
                Registrar sesión pasada
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Pista */}
      <View className="flex-row items-center mt-6" style={{ gap: 8 }}>
        <Calendar size={13} color="rgba(255,255,255,0.3)" />
        <Text
          className="font-manrope"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}
        >
          Tu historial se ordena por mes automáticamente.
        </Text>
      </View>
    </View>
  );
}
