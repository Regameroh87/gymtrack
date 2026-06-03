// React Native
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks
import { useSessionLogDetail } from "../../../src/hooks/sessions/use-session-log-detail";
import { useDeleteSessionLog } from "../../../src/hooks/sessions/use-manual-session-log";

// Utilidades
import {
  formatDuration,
  formatShortDate,
} from "../../../src/utils/format-date";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import {
  ArrowLeft,
  Barbell,
  Calendar,
  Clock,
  Trash,
} from "../../../assets/icons";

// Firma visual Editorial Pass
const BRAND_MINT = "#2DD4BF";
const SURFACE = "#0F0D20";
const SUB_SURFACE = "rgba(255,255,255,0.04)";

function resolveLabels(log) {
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

export default function RegistroDetalle() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: log, isLoading } = useSessionLogDetail(id);
  const { mutate: deleteLog, isPending: isDeleting } = useDeleteSessionLog();

  const confirmDelete = () => {
    Alert.alert(
      "Eliminar registro",
      "Se borrará este entrenamiento y todas sus series. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteLog(id, { onSuccess: () => router.back() });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <Screen safe>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      </Screen>
    );
  }

  if (!log) {
    return (
      <Screen safe>
        <BackButton onPress={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-jakarta-bold text-white text-[18px] mb-1">
            Registro no encontrado
          </Text>
          <Text
            className="font-manrope text-center"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}
          >
            Es posible que se haya eliminado.
          </Text>
        </View>
      </Screen>
    );
  }

  const { title, kicker } = resolveLabels(log);
  const date = new Date(log.completed_at);

  return (
    <Screen safe>
      <BackButton onPress={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* ── Hero ── */}
        <View className="flex-row items-center mb-3" style={{ gap: 4 }}>
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

        <Text
          className="font-manrope-bold uppercase mb-2"
          style={{ fontSize: 10, letterSpacing: 2, color: BRAND_MINT }}
        >
          {kicker}
        </Text>
        <Text
          className="font-jakarta-bold text-white mb-3"
          style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.8 }}
        >
          {title}
        </Text>

        <View className="flex-row items-center mb-6" style={{ gap: 6 }}>
          <Calendar size={13} color="rgba(255,255,255,0.4)" />
          <Text
            className="font-manrope"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}
          >
            {formatShortDate(date)}
          </Text>
        </View>

        {/* ── Stats ── */}
        <View className="flex-row mb-7" style={{ gap: 10 }}>
          <MetricTile
            icon={<Clock size={14} color={BRAND_MINT} />}
            value={formatDuration(log.duration_seconds)}
            label="Duración"
          />
          <MetricTile
            icon={<Barbell size={14} color={BRAND_MINT} />}
            value={String(log.exercises.length)}
            label={log.exercises.length === 1 ? "Ejercicio" : "Ejercicios"}
          />
          <MetricTile
            value={String(log.totalSets)}
            label={log.totalSets === 1 ? "Serie" : "Series"}
          />
          <MetricTile
            value={
              log.totalVolume > 0
                ? `${Math.round(log.totalVolume).toLocaleString("es")}`
                : "—"
            }
            label="Volumen kg"
          />
        </View>

        {/* ── Ejercicios ── */}
        {log.exercises.length === 0 ? (
          <View
            className="rounded-2xl items-center"
            style={{
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              padding: 28,
            }}
          >
            <Text
              className="font-manrope text-center"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}
            >
              Este registro no tiene series cargadas.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {log.exercises.map((exercise, i) => (
              <ExerciseBlock
                key={exercise.exercise_id}
                exercise={exercise}
                index={i}
              />
            ))}
          </View>
        )}

        {/* ── Eliminar ── */}
        <Pressable
          onPress={confirmDelete}
          disabled={isDeleting}
          className="active:opacity-60 mt-8"
        >
          <View
            className="rounded-2xl flex-row items-center justify-center"
            style={{
              paddingVertical: 14,
              gap: 8,
              borderWidth: 1,
              borderColor: "rgba(248,113,113,0.3)",
            }}
          >
            <Trash size={15} color="#f87171" />
            <Text
              className="font-jakarta-semi"
              style={{ fontSize: 13, color: "#f87171" }}
            >
              {isDeleting ? "Eliminando…" : "Eliminar registro"}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

// ─── Bloque de un ejercicio con su tabla de series ────────────────────────────

function ExerciseBlock({ exercise, index }) {
  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      {/* Header */}
      <View
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}
      >
        <Text
          className="font-manrope-bold uppercase mb-1"
          style={{ fontSize: 9, letterSpacing: 1.6, color: BRAND_MINT }}
        >
          Ejercicio {String(index + 1).padStart(2, "0")}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text
            className="font-jakarta-bold text-white flex-1 mr-3"
            style={{ fontSize: 16, letterSpacing: -0.3 }}
            numberOfLines={2}
          >
            {exercise.name}
          </Text>
          {exercise.muscle_group ? (
            <Text
              className="font-manrope-bold uppercase"
              style={{
                fontSize: 9,
                letterSpacing: 1.2,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {exercise.muscle_group}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Encabezado de columnas */}
      <View
        className="flex-row"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: SUB_SURFACE,
        }}
      >
        <ColLabel text="Serie" width={56} />
        <ColLabel text="Peso" flex />
        <ColLabel text="Reps" flex />
      </View>

      {/* Filas de series */}
      {exercise.sets.map((set, i) => (
        <View key={set.id}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: 16, paddingVertical: 11 }}
          >
            <View style={{ width: 56 }}>
              <View
                className="items-center justify-center rounded-lg"
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: "rgba(74,68,228,0.18)",
                }}
              >
                <Text
                  className="font-jakarta-bold"
                  style={{ fontSize: 12, color: brandPrimary[300] }}
                >
                  {set.set_number}
                </Text>
              </View>
            </View>
            <Text
              className="font-jakarta-bold flex-1"
              style={{
                fontSize: 15,
                color: set.weight_kg ? "white" : "rgba(255,255,255,0.3)",
              }}
            >
              {set.weight_kg ? `${set.weight_kg} kg` : "—"}
            </Text>
            <Text
              className="font-jakarta-bold text-white flex-1"
              style={{ fontSize: 15 }}
            >
              {set.reps}
            </Text>
          </View>

          {set.notes ? (
            <Text
              className="font-manrope italic"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                paddingHorizontal: 16,
                paddingBottom: 10,
                marginTop: -4,
              }}
            >
              “{set.notes}”
            </Text>
          ) : null}

          {i < exercise.sets.length - 1 && (
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.05)",
                marginHorizontal: 16,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

function BackButton({ onPress }) {
  return (
    <View className="px-5 pt-2 pb-3">
      <Pressable
        onPress={onPress}
        className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
        style={{ backgroundColor: SUB_SURFACE }}
      >
        <ArrowLeft size={18} color="white" />
      </Pressable>
    </View>
  );
}

function MetricTile({ icon, value, label }) {
  return (
    <View
      className="flex-1 rounded-2xl"
      style={{
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        paddingVertical: 12,
        paddingHorizontal: 10,
      }}
    >
      {icon ? <View className="mb-1.5">{icon}</View> : null}
      <Text
        className="font-jakarta-bold text-white"
        style={{ fontSize: 17, letterSpacing: -0.4 }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        className="font-manrope-bold uppercase mt-0.5"
        style={{
          fontSize: 8,
          letterSpacing: 1,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ColLabel({ text, width, flex }) {
  return (
    <Text
      className="font-manrope-bold uppercase"
      style={{
        fontSize: 9,
        letterSpacing: 1.2,
        color: "rgba(255,255,255,0.35)",
        width,
        flex: flex ? 1 : undefined,
      }}
    >
      {text}
    </Text>
  );
}
