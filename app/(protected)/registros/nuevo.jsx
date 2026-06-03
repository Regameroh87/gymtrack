// React Native
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useMemo, useState } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks
import { useSessions } from "../../../src/hooks/sessions/use-sessions";
import { useSessionExercises } from "../../../src/hooks/sessions/use-session-exercises";
import { useCreateManualLog } from "../../../src/hooks/sessions/use-manual-session-log";

// Utilidades
import { WEEKDAYS_ES, formatRelativeDay } from "../../../src/utils/format-date";

// Constantes
import { SESSION_LEVELS } from "../../../src/constants/sessionOptions";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import {
  ArrowLeft,
  Barbell,
  CheckCircle,
  ChevronRight,
  Plus,
  Trash,
  X,
} from "../../../assets/icons";

// Firma visual Editorial Pass
const BRAND_MINT = "#2DD4BF";
const SURFACE = "#0F0D20";
const SUB_SURFACE = "rgba(255,255,255,0.04)";

// Genera claves estables para las series del formulario (no van a la BD).
let setKeySeq = 0;
const newSetKey = () => `s${++setKeySeq}`;
const makeSet = () => ({ key: newSetKey(), reps: "", weight: "", notes: "" });

// Últimos 14 días (hoy primero) para el selector de fecha.
const buildRecentDays = () => {
  const out = [];
  for (let i = 0; i < 14; i += 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function NuevoRegistro() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: sessions = [], isLoading: loadingSessions } = useSessions();
  const { mutate: createLog, isPending: isSaving } = useCreateManualLog();

  const [selectedSession, setSelectedSession] = useState(null);
  const [formSessionId, setFormSessionId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [durationMin, setDurationMin] = useState("");
  const [form, setForm] = useState([]); // [{ exercise_id, name, muscle_group, sets }]

  const { data: sessionExercises, isLoading: loadingExercises } =
    useSessionExercises(selectedSession?.id);

  const recentDays = useMemo(buildRecentDays, []);

  // Al elegir una sesión, precarga sus ejercicios como plantilla del log.
  useEffect(() => {
    if (
      selectedSession &&
      sessionExercises &&
      formSessionId !== selectedSession.id
    ) {
      setForm(
        sessionExercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          sets: [makeSet()],
        }))
      );
      setFormSessionId(selectedSession.id);
    }
  }, [selectedSession, sessionExercises, formSessionId]);

  // ── Operaciones sobre las series del formulario ──
  const updateSet = (exIdx, setIdx, field, value) => {
    setForm((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j !== setIdx ? s : { ...s, [field]: value }
              ),
            }
      )
    );
  };

  const addSet = (exIdx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setForm((prev) =>
      prev.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: [...ex.sets, makeSet()] }
      )
    );
  };

  const removeSet = (exIdx, setIdx) => {
    setForm((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
      )
    );
  };

  // ── Guardar ──
  const filledSetCount = useMemo(
    () =>
      form.reduce(
        (acc, ex) =>
          acc + ex.sets.filter((s) => parseInt(s.reps, 10) > 0).length,
        0
      ),
    [form]
  );

  const handleSave = () => {
    if (filledSetCount === 0) {
      Alert.alert(
        "Faltan datos",
        "Cargá al menos una serie con repeticiones para guardar el registro."
      );
      return;
    }

    const durationSeconds =
      parseInt(durationMin, 10) > 0 ? parseInt(durationMin, 10) * 60 : null;

    createLog(
      {
        sessionId: selectedSession.id,
        completedAt: selectedDate.toISOString(),
        durationSeconds,
        exercises: form.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
        })),
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: () =>
          Alert.alert(
            "Error",
            "No se pudo guardar el registro. Intentá de nuevo."
          ),
      }
    );
  };

  // ─── Fase A: elegir sesión ──────────────────────────────────────────────────
  if (!selectedSession) {
    return (
      <Screen safe>
        <ModalHeader title="Registrar sesión" onClose={() => router.back()} />
        <View className="px-6 pt-1 pb-4">
          <Text
            className="font-manrope-bold uppercase mb-1"
            style={{ fontSize: 10, letterSpacing: 2, color: BRAND_MINT }}
          >
            Paso 1 de 2
          </Text>
          <Text
            className="font-jakarta-bold text-white"
            style={{ fontSize: 22, letterSpacing: -0.6 }}
          >
            ¿Qué entrenaste?
          </Text>
          <Text
            className="font-manrope mt-1"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}
          >
            Elegí la sesión del catálogo que hiciste.
          </Text>
        </View>

        {loadingSessions ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={brandPrimary[500]} />
          </View>
        ) : sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text
              className="font-jakarta-bold text-white text-center mb-1"
              style={{ fontSize: 16 }}
            >
              No hay sesiones en el catálogo
            </Text>
            <Text
              className="font-manrope text-center"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}
            >
              El gym todavía no publicó sesiones para registrar.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 32,
              gap: 10,
            }}
          >
            {sessions.map((session) => (
              <SessionPickRow
                key={session.id}
                session={session}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSession(session);
                }}
              />
            ))}
          </ScrollView>
        )}
      </Screen>
    );
  }

  // ─── Fase B: completar el registro ──────────────────────────────────────────
  return (
    <Screen safe>
      <ModalHeader
        title="Registrar sesión"
        onClose={() => router.back()}
        onBack={() => {
          setSelectedSession(null);
          setFormSessionId(null);
          setForm([]);
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 120,
          }}
        >
          {/* Sesión elegida */}
          <View
            className="rounded-2xl flex-row items-center mb-6"
            style={{
              backgroundColor: SURFACE,
              borderWidth: 1,
              borderColor: "rgba(74,68,228,0.3)",
              padding: 14,
              gap: 12,
            }}
          >
            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: "rgba(74,68,228,0.2)" }}
            >
              <CheckCircle size={18} color={brandPrimary[400]} />
            </View>
            <View className="flex-1">
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 9, letterSpacing: 1.4, color: BRAND_MINT }}
              >
                Sesión
              </Text>
              <Text
                className="font-jakarta-bold text-white"
                style={{ fontSize: 15 }}
                numberOfLines={1}
              >
                {selectedSession.name}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setSelectedSession(null);
                setFormSessionId(null);
                setForm([]);
              }}
              className="active:opacity-60"
            >
              <Text
                className="font-jakarta-semi"
                style={{ fontSize: 12, color: brandPrimary[300] }}
              >
                Cambiar
              </Text>
            </Pressable>
          </View>

          {/* ── Fecha ── */}
          <SectionLabel text="¿Cuándo lo hiciste?" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            className="mb-6"
          >
            {recentDays.map((day) => {
              const isActive = sameDay(day, selectedDate);
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDate(day);
                  }}
                  className="active:scale-[0.95]"
                >
                  <View
                    className="items-center rounded-2xl"
                    style={{
                      width: 60,
                      paddingVertical: 12,
                      backgroundColor: isActive
                        ? brandPrimary[600]
                        : SUB_SURFACE,
                      borderWidth: 1,
                      borderColor: isActive
                        ? brandPrimary[500]
                        : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text
                      className="font-manrope-bold uppercase"
                      style={{
                        fontSize: 9,
                        letterSpacing: 1,
                        color: isActive
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {WEEKDAYS_ES[day.getDay()]}
                    </Text>
                    <Text
                      className="font-jakarta-bold text-white"
                      style={{ fontSize: 19, marginTop: 2 }}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text
            className="font-manrope mb-6"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              marginTop: -16,
            }}
          >
            Seleccionado: {formatRelativeDay(selectedDate)}
          </Text>

          {/* ── Duración ── */}
          <SectionLabel text="Duración (opcional)" />
          <View
            className="flex-row items-center rounded-2xl mb-6"
            style={{
              backgroundColor: SUB_SURFACE,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              paddingHorizontal: 16,
            }}
          >
            <TextInput
              value={durationMin}
              onChangeText={(t) => setDurationMin(t.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.25)"
              className="flex-1 font-jakarta-bold text-white"
              style={{ fontSize: 16, paddingVertical: 14 }}
            />
            <Text
              className="font-manrope-bold uppercase"
              style={{
                fontSize: 11,
                letterSpacing: 1.4,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              minutos
            </Text>
          </View>

          {/* ── Ejercicios ── */}
          <SectionLabel text="Series por ejercicio" />
          {loadingExercises ? (
            <View className="py-8 items-center">
              <ActivityIndicator color={brandPrimary[500]} />
            </View>
          ) : form.length === 0 ? (
            <View
              className="rounded-2xl items-center"
              style={{
                backgroundColor: SURFACE,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
                padding: 24,
              }}
            >
              <Text
                className="font-manrope text-center"
                style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}
              >
                Esta sesión no tiene ejercicios cargados.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {form.map((exercise, exIdx) => (
                <ExerciseForm
                  key={exercise.exercise_id}
                  exercise={exercise}
                  index={exIdx}
                  onUpdateSet={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── Barra de guardado ── */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: "rgba(12,11,20,0.96)",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={isSaving || filledSetCount === 0}
            className="active:scale-[0.98]"
            style={{ opacity: filledSetCount === 0 ? 0.4 : 1 }}
          >
            <LinearGradient
              colors={[brandPrimary[600], brandPrimary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl flex-row items-center justify-center"
              style={{ paddingVertical: 16, gap: 8 }}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <CheckCircle size={18} color="white" />
                  <Text
                    className="font-jakarta-bold text-white"
                    style={{ fontSize: 15 }}
                  >
                    Guardar registro
                    {filledSetCount > 0 ? ` · ${filledSetCount} series` : ""}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Fila de sesión (fase A) ──────────────────────────────────────────────────

function SessionPickRow({ session, onPress }) {
  const levelLabel = SESSION_LEVELS.find(
    (l) => l.value === session.level
  )?.label;

  return (
    <Pressable onPress={onPress} className="active:scale-[0.98]">
      <View
        className="rounded-2xl flex-row items-center"
        style={{
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.07)",
          padding: 14,
          gap: 12,
        }}
      >
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{ backgroundColor: "rgba(74,68,228,0.16)" }}
        >
          <Barbell size={20} color={brandPrimary[400]} />
        </View>
        <View className="flex-1 min-w-0">
          <Text
            className="font-jakarta-bold text-white"
            style={{ fontSize: 15, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {session.name}
          </Text>
          <Text
            className="font-manrope mt-0.5"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}
            numberOfLines={1}
          >
            {session.exercise_count > 0
              ? `${session.exercise_count} ejercicios`
              : "Sin ejercicios"}
            {levelLabel ? `  ·  ${levelLabel}` : ""}
          </Text>
        </View>
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

// ─── Formulario de un ejercicio (fase B) ──────────────────────────────────────

function ExerciseForm({ exercise, index, onUpdateSet, onAddSet, onRemoveSet }) {
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
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}
      >
        <Text
          className="font-manrope-bold uppercase mb-1"
          style={{ fontSize: 9, letterSpacing: 1.6, color: BRAND_MINT }}
        >
          Ejercicio {String(index + 1).padStart(2, "0")}
        </Text>
        <Text
          className="font-jakarta-bold text-white"
          style={{ fontSize: 16, letterSpacing: -0.3 }}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>
      </View>

      {/* Columnas */}
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 7,
          backgroundColor: SUB_SURFACE,
        }}
      >
        <Text style={colLabel(44)}>Serie</Text>
        <Text style={colLabel(null, true)}>Peso (kg)</Text>
        <Text style={colLabel(null, true)}>Reps</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Series */}
      {exercise.sets.map((set, setIdx) => (
        <View
          key={set.key}
          className="flex-row items-center"
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: setIdx === 0 ? 0 : 1,
            borderTopColor: "rgba(255,255,255,0.05)",
          }}
        >
          {/* Número de serie */}
          <View style={{ width: 44 }}>
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
                {setIdx + 1}
              </Text>
            </View>
          </View>

          {/* Peso */}
          <View style={{ flex: 1, paddingRight: 8 }}>
            <TextInput
              value={set.weight}
              onChangeText={(t) =>
                onUpdateSet(index, setIdx, "weight", t.replace(/[^0-9.]/g, ""))
              }
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="font-jakarta-bold text-white rounded-lg"
              style={cellInput}
            />
          </View>

          {/* Reps */}
          <View style={{ flex: 1, paddingRight: 8 }}>
            <TextInput
              value={set.reps}
              onChangeText={(t) =>
                onUpdateSet(index, setIdx, "reps", t.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="font-jakarta-bold text-white rounded-lg"
              style={cellInput}
            />
          </View>

          {/* Quitar serie */}
          <Pressable
            onPress={() => onRemoveSet(index, setIdx)}
            disabled={exercise.sets.length === 1}
            className="items-center justify-center active:opacity-60"
            style={{
              width: 32,
              height: 32,
              opacity: exercise.sets.length === 1 ? 0.25 : 1,
            }}
          >
            <Trash size={15} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      ))}

      {/* Agregar serie */}
      <Pressable
        onPress={() => onAddSet(index)}
        className="flex-row items-center justify-center active:opacity-60"
        style={{
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
          gap: 6,
        }}
      >
        <Plus size={14} color={brandPrimary[300]} />
        <Text
          className="font-jakarta-semi"
          style={{ fontSize: 12, color: brandPrimary[300] }}
        >
          Agregar serie
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Auxiliares ───────────────────────────────────────────────────────────────

function ModalHeader({ title, onClose, onBack }) {
  return (
    <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
      {onBack ? (
        <Pressable
          onPress={onBack}
          className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
          style={{ backgroundColor: SUB_SURFACE }}
        >
          <ArrowLeft size={18} color="white" />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text
        className="font-jakarta-bold text-white"
        style={{ fontSize: 15, letterSpacing: -0.3 }}
      >
        {title}
      </Text>
      <Pressable
        onPress={onClose}
        className="w-10 h-10 rounded-xl items-center justify-center active:opacity-60"
        style={{ backgroundColor: SUB_SURFACE }}
      >
        <X size={18} color="white" />
      </Pressable>
    </View>
  );
}

function SectionLabel({ text }) {
  return (
    <Text
      className="font-manrope-bold uppercase mb-3"
      style={{
        fontSize: 10,
        letterSpacing: 1.8,
        color: "rgba(255,255,255,0.5)",
      }}
    >
      {text}
    </Text>
  );
}

const colLabel = (width, flex) => ({
  fontSize: 9,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  fontFamily: "Manrope_700Bold",
  color: "rgba(255,255,255,0.35)",
  width: width ?? undefined,
  flex: flex ? 1 : undefined,
});

const cellInput = {
  fontSize: 15,
  paddingVertical: 9,
  paddingHorizontal: 10,
  backgroundColor: SUB_SURFACE,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
};
