// Sección "Salud" de la pestaña Progreso: actividad diaria, ritmo cardíaco y
// peso leídos de Apple Salud / Health Connect, más el toggle de consentimiento
// para compartir las métricas con el staff del gym (sube a Supabase).
import { Platform, Pressable, Switch, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import SectionCard from "./section-card";
import StatTile from "./stat-tile";
import SectionEmpty from "./section-empty";
import LineChart from "../charts/line-chart";
import { useGymTheme } from "../../contexts/gym-theme-context";
import { useHealthConnection } from "../../hooks/health/use-health-connection";
import { useDailyActivity } from "../../hooks/health/use-daily-activity";
import { useHeartRate } from "../../hooks/health/use-heart-rate";
import { useBodyWeight } from "../../hooks/health/use-body-weight";
import { useHealthConsent } from "../../hooks/health/use-health-consent";
import { toDateKey } from "../../lib/health";
import { Flame, Heart, Walk } from "../../../assets/icons";

const STORE_NAME = Platform.OS === "ios" ? "Apple Salud" : "Health Connect";

const formatSteps = (steps) => {
  if (steps == null) return "—";
  return steps >= 10000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`;
};

const formatKm = (meters) => {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function HealthSection() {
  const { brandPrimary, brandSecondary } = useGymTheme();
  const primary = brandPrimary[500];
  const mint = brandSecondary[400];

  const { available, connected, isLoading, connect, isConnecting } =
    useHealthConnection();

  if (isLoading || !available) return null;

  return (
    <Animated.View entering={FadeInDown.delay(40).springify()}>
      <SectionCard kicker="Salud" title="Tu actividad">
        {connected ? (
          <ConnectedContent primary={primary} mint={mint} />
        ) : (
          <ConnectCard
            connect={connect}
            isConnecting={isConnecting}
            primary={primary}
          />
        )}
      </SectionCard>
    </Animated.View>
  );
}

function ConnectCard({ connect, isConnecting, primary }) {
  return (
    <View style={{ gap: 12 }}>
      <SectionEmpty>
        Conectá {STORE_NAME} para ver tus pasos, calorías, ritmo cardíaco y peso
        junto a tus entrenamientos.
      </SectionEmpty>
      <Pressable
        onPress={() => connect()}
        disabled={isConnecting}
        className="rounded-xl items-center py-3"
        style={{ backgroundColor: primary, opacity: isConnecting ? 0.6 : 1 }}
      >
        <Text className="font-jakarta-semi text-white text-[14px]">
          {isConnecting ? "Conectando..." : `Conectar ${STORE_NAME}`}
        </Text>
      </Pressable>
    </View>
  );
}

function ConnectedContent({ primary, mint }) {
  const activity = useDailyActivity({ days: 7 });
  const heartRate = useHeartRate({ days: 7 });
  const weight = useBodyWeight({ days: 30 });
  const { consented, setConsent, isUpdating } = useHealthConsent();

  const todayKey = toDateKey(new Date());
  const today = (activity.data ?? []).find((d) => d.date === todayKey);
  const todayHr = (heartRate.data ?? []).find((d) => d.date === todayKey);
  const lastHr = todayHr ?? (heartRate.data ?? []).at(-1);
  const weightSeries = weight.data ?? [];
  const lastWeight = weightSeries.at(-1);

  const hasAnyData = today != null || lastHr != null || weightSeries.length > 0;

  return (
    <View>
      {hasAnyData ? (
        <>
          <View className="flex-row gap-3 mb-3">
            <StatTile
              value={formatSteps(today?.steps)}
              label="pasos hoy"
              accent={primary}
              Icon={Walk}
            />
            <StatTile
              value={
                today?.activeCalories != null
                  ? `${Math.round(today.activeCalories)}`
                  : "—"
              }
              label="kcal activas hoy"
              accent={mint}
              Icon={Flame}
            />
          </View>
          <View className="flex-row gap-3 mb-4">
            <StatTile
              value={formatKm(today?.distanceMeters)}
              label="distancia hoy"
              accent={mint}
            />
            <StatTile
              value={
                lastHr?.restingBpm != null
                  ? `${Math.round(lastHr.restingBpm)}`
                  : lastHr?.avgBpm != null
                    ? `${Math.round(lastHr.avgBpm)}`
                    : "—"
              }
              label={
                lastHr?.restingBpm != null ? "FC en reposo" : "FC promedio"
              }
              accent={primary}
              Icon={Heart}
            />
          </View>

          {weightSeries.length > 1 && (
            <>
              <View className="flex-row justify-between items-end mb-2">
                <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
                  Peso (30 días)
                </Text>
                {lastWeight && (
                  <Text
                    className="font-jakarta-bold text-[13px]"
                    style={{ color: mint }}
                  >
                    {lastWeight.weightKg?.toFixed(1)} kg
                  </Text>
                )}
              </View>
              <LineChart
                data={weightSeries.map((w) => ({ value: w.weightKg }))}
                color={mint}
                height={90}
              />
            </>
          )}
        </>
      ) : (
        <SectionEmpty>
          Todavía no hay datos en {STORE_NAME}. Salí a caminar con el teléfono
          encima o registrá tu peso y los vas a ver acá.
        </SectionEmpty>
      )}

      {/* Consentimiento de subida: el dato queda on-device salvo opt-in. */}
      <View className="flex-row items-center mt-4 pt-4 border-t border-ui-input-border">
        <View className="flex-1 pr-3" style={{ gap: 2 }}>
          <Text className="font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark text-[13px]">
            Compartir con mi gimnasio
          </Text>
          <Text className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-[11px] leading-4">
            Tu entrenador podrá ver tus métricas diarias. Podés desactivarlo
            cuando quieras.
          </Text>
        </View>
        <Switch
          value={consented}
          onValueChange={setConsent}
          disabled={isUpdating}
          trackColor={{ true: primary }}
        />
      </View>
    </View>
  );
}
