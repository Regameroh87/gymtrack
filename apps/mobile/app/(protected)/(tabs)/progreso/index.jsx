// React Native
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useMemo } from "react";

// Librerías externas
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

// Hooks
import { useAttendanceStreak } from "@gymtrack/core/hooks/progress/use-attendance-streak";
import { useActiveGym } from "../../../../src/contexts/active-gym-context";
import { useAuth } from "../../../../src/auth/lib/getSession";
import { useTrainingProgress } from "../../../../src/hooks/progress/use-training-progress";
import { usePersonalRecords } from "../../../../src/hooks/progress/use-personal-records";
import { usePlanAdherence } from "../../../../src/hooks/progress/use-plan-adherence";

// Componentes
import Screen from "../../../../src/components/Screen";
import SectionCard from "../../../../src/components/progress/section-card";
import StatTile from "../../../../src/components/progress/stat-tile";
import SectionEmpty from "../../../../src/components/progress/section-empty";
import HealthSection from "../../../../src/components/progress/health-section";
import BarChart from "../../../../src/components/charts/bar-chart";
import LineChart from "../../../../src/components/charts/line-chart";
import Heatmap from "../../../../src/components/charts/heatmap";

// Utilidades
import { formatRelativeDay } from "@gymtrack/core/format-date";

// Tema / assets
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";
import { ChartBar, Flame } from "../../../../assets/icons";

// Formatea un volumen en kg de forma compacta: 12450 → "12.4k".
const formatVolume = (kg) => {
  if (!kg) return "0";
  if (kg < 1000) return `${kg}`;
  return `${(kg / 1000).toFixed(1)}k`;
};

export default function ProgresoTab() {
  const insets = useSafeAreaInsets();
  const { brandPrimary, brandSecondary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { userId } = useAuth();
  const BRAND_MINT = brandSecondary[400];

  const attendance = useAttendanceStreak(gymId, userId);
  const training = useTrainingProgress();
  const records = usePersonalRecords();
  const adherence = usePlanAdherence();

  const isLoading =
    attendance.isLoading ||
    training.isLoading ||
    records.isLoading ||
    adherence.isLoading;

  return (
    <Screen safe>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
          Mi Progreso
        </Text>
        <Text className="text-[28px] font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark leading-8">
          Progreso
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 32,
          }}
        >
          <ConsistencySection
            data={attendance.data}
            mint={BRAND_MINT}
            primary={brandPrimary[500]}
          />
          {/* Salud maneja su propio loading: no entra al gate de isLoading
              para que la pantalla no bloquee en las APIs de Health. */}
          <HealthSection />
          <TrainingSection
            data={training.data}
            primary={brandPrimary[500]}
            mint={BRAND_MINT}
          />
          <AdherenceSection data={adherence.data} primary={brandPrimary[500]} />
          <RecordsSection data={records.data} mint={BRAND_MINT} />
        </ScrollView>
      )}
    </Screen>
  );
}

// ─── Consistencia / asistencia ────────────────────────────────────────────────
function ConsistencySection({ data, mint, primary }) {
  const hasData = (data?.totalCheckins ?? 0) > 0;
  const streak = data?.weekStreak ?? 0;

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SectionCard kicker="Consistencia" title="Tu asistencia">
        <View className="flex-row gap-3 mb-4">
          <StatTile
            value={`${streak}${streak >= 12 ? "+" : ""}`}
            label={streak === 1 ? "semana en racha" : "semanas en racha"}
            accent={mint}
            Icon={Flame}
          />
          <StatTile
            value={data?.thisWeek ?? 0}
            label="esta semana"
            accent={primary}
          />
        </View>

        {hasData ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 2 }}
          >
            <Heatmap weeks={data.weeks} color={mint} />
          </ScrollView>
        ) : (
          <SectionEmpty>
            Hacé check-in con el QR del gimnasio y acá vas a ver tu racha y los
            días que entrenaste.
          </SectionEmpty>
        )}
      </SectionCard>
    </Animated.View>
  );
}

// ─── Entrenamiento ────────────────────────────────────────────────────────────
function TrainingSection({ data, primary, mint }) {
  const hasData = (data?.totalWorkouts ?? 0) > 0;

  // Para 12 semanas se muestran etiquetas salteadas (1 de cada 3) para no
  // amontonarlas.
  const barData = useMemo(
    () =>
      (data?.weeks ?? []).map((w, i, arr) => ({
        key: w.key,
        value: w.workouts,
        label: i % 3 === 0 || i === arr.length - 1 ? w.label : "",
      })),
    [data]
  );

  const topMuscles = (data?.muscleVolume ?? []).slice(0, 5);
  const maxMuscle = Math.max(1, ...topMuscles.map((m) => m.volume));

  return (
    <Animated.View entering={FadeInDown.delay(80).springify()}>
      <SectionCard kicker="Entrenamiento" title="Volumen y constancia">
        <View className="flex-row gap-3 mb-4">
          <StatTile
            value={data?.totalWorkouts ?? 0}
            label="entrenamientos (12 sem)"
            accent={primary}
            Icon={ChartBar}
          />
          <StatTile
            value={`${formatVolume(data?.totalVolume ?? 0)} kg`}
            label="volumen total"
            accent={mint}
          />
        </View>

        {hasData ? (
          <>
            <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
              Entrenamientos por semana
            </Text>
            <BarChart data={barData} color={primary} height={110} />

            <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mt-5 mb-2">
              Tendencia de volumen
            </Text>
            <LineChart
              data={(data?.weeks ?? []).map((w) => ({ value: w.volume }))}
              color={mint}
              height={100}
            />

            {topMuscles.length > 0 && (
              <>
                <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mt-5 mb-3">
                  Volumen por grupo muscular
                </Text>
                <View style={{ gap: 10 }}>
                  {topMuscles.map((m) => (
                    <View key={m.muscle}>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-[12px] font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark capitalize">
                          {m.muscle}
                        </Text>
                        <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                          {formatVolume(m.volume)} kg
                        </Text>
                      </View>
                      <View className="h-2 rounded-full overflow-hidden bg-ui-input-border">
                        <View
                          style={{
                            width: `${(m.volume / maxMuscle) * 100}%`,
                            height: "100%",
                            borderRadius: 999,
                            backgroundColor: primary,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <SectionEmpty>
            Registrá tus entrenamientos y vas a ver tu volumen, tu constancia
            semanal y qué grupos musculares trabajás más.
          </SectionEmpty>
        )}
      </SectionCard>
    </Animated.View>
  );
}

// ─── Adherencia al plan activo ────────────────────────────────────────────────
function AdherenceSection({ data, primary }) {
  if (!data?.hasPlan) return null;

  const { completed, scheduled, planName, isCompleted } = data;
  const pct = scheduled
    ? Math.min(100, Math.round((completed / scheduled) * 100))
    : null;

  return (
    <Animated.View entering={FadeInDown.delay(160).springify()}>
      <SectionCard kicker="Plan activo" title={planName}>
        <View className="flex-row items-end justify-between mb-2">
          <Text className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark text-[22px]">
            {completed}
            {scheduled ? (
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-[15px]">
                {" "}
                / {scheduled} días
              </Text>
            ) : (
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-[15px]">
                {" "}
                días completados
              </Text>
            )}
          </Text>
          {pct !== null && (
            <Text
              className="font-jakarta-bold text-[15px]"
              style={{ color: primary }}
            >
              {pct}%
            </Text>
          )}
        </View>

        {pct !== null && (
          <View className="h-2.5 rounded-full overflow-hidden bg-ui-input-border">
            <View
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: primary,
              }}
            />
          </View>
        )}

        <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-2.5">
          {isCompleted
            ? "¡Plan completado! Elegí uno nuevo para seguir progresando."
            : data.currentWeek
              ? `Vas por la semana ${data.currentWeek}, día ${data.currentDay}.`
              : "Seguí registrando tus sesiones para avanzar el plan."}
        </Text>
      </SectionCard>
    </Animated.View>
  );
}

// ─── Récords personales ───────────────────────────────────────────────────────
function RecordsSection({ data, mint }) {
  const records = (data ?? []).slice(0, 8);

  return (
    <Animated.View entering={FadeInDown.delay(240).springify()}>
      <SectionCard kicker="Récords personales" title="Tus mejores marcas">
        {records.length > 0 ? (
          <View style={{ gap: 10 }}>
            {records.map((r, i) => (
              <View
                key={r.exercise_id}
                className="flex-row items-center"
                style={{ gap: 12 }}
              >
                <View
                  className="items-center justify-center rounded-xl"
                  style={{
                    width: 34,
                    height: 34,
                    backgroundColor: "rgba(45,212,191,0.14)",
                  }}
                >
                  <Text
                    className="font-jakarta-bold"
                    style={{ fontSize: 13, color: mint }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 min-w-0" style={{ gap: 2 }}>
                  <Text
                    numberOfLines={1}
                    className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark"
                    style={{ fontSize: 14 }}
                  >
                    {r.name}
                  </Text>
                  <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-[11px]">
                    {r.weight_kg} kg × {r.reps} ·{" "}
                    {formatRelativeDay(r.completed_at)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark"
                    style={{ fontSize: 14 }}
                  >
                    {r.e1rm} kg
                  </Text>
                  <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-[9px] uppercase tracking-wider">
                    1RM est.
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <SectionEmpty>
            Cargá el peso de tus series y vamos a calcular tu 1RM estimado por
            ejercicio para que veas cuánto vas mejorando.
          </SectionEmpty>
        )}
      </SectionCard>
    </Animated.View>
  );
}
