// React Native
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useState, useEffect, useMemo } from "react";

// Librerías externas
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";

// Tema / assets
import { brandPrimary, brandSecondary, ui } from "../../src/theme/colors.js";
import {
  Barbell,
  ChevronRight,
  Play,
  X,
  CheckCircle,
} from "../../assets/icons.jsx";

const BRAND_PRIMARY = brandPrimary[700];
const BRAND_PRIMARY_DEEP = brandPrimary[600];
const BRAND_MINT = brandSecondary[400];

const SESSION = {
  planName: "Fuerza Total 4x",
  dayLabel: "Día A",
  sessionName: "Pecho & Tríceps",
  estimatedMinutes: 60,
  exercises: [
    {
      id: 1,
      name: "Press de Banca",
      muscleGroup: "Pecho",
      refWeight: "80 kg",
      repRange: "8–10",
      sets: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    },
    {
      id: 2,
      name: "Press Inclinado DB",
      muscleGroup: "Pecho Superior",
      refWeight: "22 kg",
      repRange: "10–12",
      sets: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
    {
      id: 3,
      name: "Cruces con Cable",
      muscleGroup: "Pecho",
      refWeight: "15 kg",
      repRange: "12–15",
      sets: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
    {
      id: 4,
      name: "Jalón Tríceps",
      muscleGroup: "Tríceps",
      refWeight: "40 kg",
      repRange: "10–12",
      sets: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    },
    {
      id: 5,
      name: "Extensión OH Tríceps",
      muscleGroup: "Tríceps",
      refWeight: "25 kg",
      repRange: "10–12",
      sets: [{ id: 1 }, { id: 2 }, { id: 3 }],
    },
  ],
};

function useTokens() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return useMemo(
    () => ({
      isDark,
      pageBg: isDark ? ui.background.dark : ui.background.light,
      cardBg: isDark ? ui.surface.dark : ui.surface.light,
      mainText: isDark ? ui.text.mainDark : ui.text.main,
      mutedText: isDark ? ui.text.mutedDark : ui.text.muted,
      kickerMint: isDark ? BRAND_MINT : brandSecondary[700],
      cardBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,13,32,0.08)",
      divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,13,32,0.06)",
      ghostBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,13,32,0.03)",
      ghostBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,13,32,0.10)",
      primaryFill: isDark ? "rgba(74,68,228,0.15)" : "rgba(74,68,228,0.08)",
      primaryBorder: isDark ? "rgba(74,68,228,0.4)" : "rgba(74,68,228,0.25)",
      mintSurface: isDark ? "rgba(42,232,204,0.12)" : "rgba(42,232,204,0.14)",
      mintHalo: isDark ? "rgba(42,232,204,0.14)" : "rgba(42,232,204,0.09)",
      bigNumber: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,13,32,0.04)",
      mintSofter: isDark ? "rgba(42,232,204,0.4)" : "rgba(0,80,71,0.4)",
      inputBg: isDark ? ui.input.dark : ui.input.light,
    }),
    [isDark]
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function PreviewScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  const t = useTokens();

  const avgSets = useMemo(() => {
    const total = SESSION.exercises.reduce((s, ex) => s + ex.sets.length, 0);
    return Math.round(total / SESSION.exercises.length);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: t.pageBg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 22,
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header editorial ── */}
        <View className="mb-8">
          {/* Ticks */}
          <View className="flex-row items-center gap-1.5 mb-5">
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
                backgroundColor: t.mintSofter,
              }}
            />
          </View>

          {/* Kicker + date */}
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="font-manrope-bold uppercase"
              style={{ fontSize: 10, color: t.kickerMint, letterSpacing: 2.4 }}
            >
              Sesión de hoy
            </Text>
            <View className="flex-row items-center gap-1.5">
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
                style={{ fontSize: 10, color: t.mutedText, letterSpacing: 2 }}
              >
                20 MAY 2026
              </Text>
            </View>
          </View>

          {/* Plan badge */}
          <View
            className="self-start mb-3.5"
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 9,
              backgroundColor: t.primaryFill,
              borderWidth: 1,
              borderColor: t.primaryBorder,
            }}
          >
            <Text
              className="font-manrope-bold uppercase"
              style={{ fontSize: 9, color: BRAND_PRIMARY, letterSpacing: 1.8 }}
            >
              {SESSION.planName} · {SESSION.dayLabel}
            </Text>
          </View>

          {/* Session title */}
          <Text
            className="font-jakarta-bold"
            style={{
              fontSize: 40,
              lineHeight: 44,
              letterSpacing: -1.4,
              color: t.mainText,
            }}
          >
            {SESSION.sessionName}.
          </Text>
        </View>

        {/* ── Stats ── */}
        <View className="flex-row gap-2.5 mb-8">
          {[
            { value: `${SESSION.exercises.length}`, label: "ejercicios" },
            { value: `${SESSION.estimatedMinutes}'`, label: "est." },
            { value: `${avgSets}`, label: "series avg" },
          ].map((stat, i) => (
            <View
              key={i}
              className="flex-1 items-center py-4"
              style={{
                borderRadius: 18,
                backgroundColor: t.cardBg,
                borderWidth: 1,
                borderColor: t.cardBorder,
              }}
            >
              <Text
                className="font-jakarta-bold"
                style={{
                  fontSize: 24,
                  letterSpacing: -0.6,
                  color: t.mainText,
                  lineHeight: 28,
                }}
              >
                {stat.value}
              </Text>
              <Text
                className="font-manrope-bold uppercase mt-1"
                style={{ fontSize: 9, color: t.mutedText, letterSpacing: 1.4 }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Exercise list ── */}
        <View className="mb-9">
          <View className="flex-row items-center gap-2 mb-4">
            <View
              style={{
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: BRAND_MINT,
              }}
            />
            <Text
              className="font-manrope-bold uppercase"
              style={{ fontSize: 10, color: t.kickerMint, letterSpacing: 2.2 }}
            >
              Ejercicios
            </Text>
            <View
              className="flex-1"
              style={{ height: 1, backgroundColor: t.divider }}
            />
          </View>

          <View
            style={{
              borderRadius: 22,
              backgroundColor: t.cardBg,
              borderWidth: 1,
              borderColor: t.cardBorder,
              overflow: "hidden",
            }}
          >
            {SESSION.exercises.map((ex, idx) => (
              <View key={ex.id}>
                {idx > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: t.divider,
                      marginHorizontal: 18,
                    }}
                  />
                )}
                <View
                  className="flex-row items-center gap-3.5"
                  style={{ paddingHorizontal: 18, paddingVertical: 15 }}
                >
                  <Text
                    className="font-jakarta-bold"
                    style={{
                      fontSize: 11,
                      color: t.bigNumber,
                      width: 22,
                      letterSpacing: 0.4,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </Text>

                  <View className="flex-1 gap-1">
                    <Text
                      className="font-jakarta-semi"
                      style={{
                        fontSize: 14,
                        color: t.mainText,
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <View
                        style={{
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: t.mintSurface,
                        }}
                      >
                        <Text
                          className="font-manrope-bold uppercase"
                          style={{
                            fontSize: 8,
                            color: t.kickerMint,
                            letterSpacing: 1.2,
                          }}
                        >
                          {ex.muscleGroup}
                        </Text>
                      </View>
                      <Text
                        className="font-manrope"
                        style={{ fontSize: 12, color: t.mutedText }}
                      >
                        {ex.sets.length} × {ex.repRange} reps
                      </Text>
                    </View>
                  </View>

                  <Text
                    className="font-jakarta-bold"
                    style={{
                      fontSize: 13,
                      color: t.bigNumber,
                      letterSpacing: -0.2,
                    }}
                  >
                    {ex.refWeight}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onStart();
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <LinearGradient
            colors={[BRAND_PRIMARY, BRAND_PRIMARY_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              paddingVertical: 20,
              paddingHorizontal: 26,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: 0.55,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            }}
          >
            <Text
              className="font-jakarta-bold"
              style={{ fontSize: 17, color: "white", letterSpacing: -0.3 }}
            >
              Iniciar sesión
            </Text>
            <View
              className="items-center justify-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            >
              <Play size={17} color="white" />
            </View>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Active session ──────────────────────────────────────────────────────────

function ActiveSession({ onEnd }) {
  const insets = useSafeAreaInsets();
  const t = useTokens();

  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(new Set());
  const [setData, setSetData] = useState({});
  const [setNotes, setSetNotes] = useState({});

  function updateWeight(exId, setId, value) {
    const key = `${exId}-${setId}`;
    setSetData((prev) => ({ ...prev, [key]: { weight: value } }));
  }

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const exercise = SESSION.exercises[currentIdx];
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < SESSION.exercises.length - 1;

  const totalSets = useMemo(
    () => SESSION.exercises.reduce((s, ex) => s + ex.sets.length, 0),
    []
  );
  const doneCount = completedSets.size;

  const timerStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  function toggleSet(exId, setId) {
    const key = `${exId}-${setId}`;
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return next;
    });
  }

  return (
    <View className="flex-1" style={{ backgroundColor: t.pageBg }}>
      {/* ── Top bar ── */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 14 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onEnd();
          }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: t.ghostBg,
            borderWidth: 1,
            borderColor: t.ghostBorder,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <X size={16} color={t.mutedText} />
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: BRAND_MINT,
              shadowColor: BRAND_MINT,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 10, color: t.kickerMint, letterSpacing: 2.2 }}
          >
            Sesión en curso
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 11,
            paddingVertical: 5,
            borderRadius: 10,
            backgroundColor: t.primaryFill,
            borderWidth: 1,
            borderColor: t.primaryBorder,
          }}
        >
          <Text
            className="font-jakarta-bold"
            style={{ fontSize: 13, color: BRAND_PRIMARY, letterSpacing: 1 }}
          >
            {timerStr}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View
        className="mx-5"
        style={{ height: 2, borderRadius: 1, backgroundColor: t.divider }}
      >
        <View
          style={{
            height: 2,
            borderRadius: 1,
            width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%`,
            backgroundColor: BRAND_MINT,
          }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Exercise progress dots ── */}
        <View className="flex-row items-center gap-2.5 mb-5">
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 10, color: t.kickerMint, letterSpacing: 2.2 }}
          >
            Ejercicio {currentIdx + 1} de {SESSION.exercises.length}
          </Text>
          <View className="flex-row gap-1">
            {SESSION.exercises.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIdx ? 18 : 6,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i === currentIdx
                      ? BRAND_PRIMARY
                      : i < currentIdx
                        ? BRAND_MINT
                        : t.divider,
                }}
              />
            ))}
          </View>
        </View>

        {/* ── Exercise card ── */}
        <View
          style={{
            borderRadius: 24,
            backgroundColor: t.cardBg,
            borderWidth: 1,
            borderColor: t.cardBorder,
            overflow: "hidden",
            marginBottom: 14,
            shadowColor: BRAND_PRIMARY,
            shadowOpacity: 0.12,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {/* Mint halo */}
          <LinearGradient
            colors={[t.mintHalo, "rgba(42,232,204,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.65, y: 0.85 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 200,
              height: 160,
            }}
          />

          {/* Card header */}
          <View className="p-5 pb-4">
            <View className="flex-row items-center justify-between mb-2.5">
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: t.mintSurface,
                }}
              >
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 9,
                    color: t.kickerMint,
                    letterSpacing: 1.6,
                  }}
                >
                  {exercise.muscleGroup}
                </Text>
              </View>

              <View
                className="flex-row items-center gap-1"
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: t.ghostBg,
                  borderWidth: 1,
                  borderColor: t.ghostBorder,
                }}
              >
                <Barbell size={11} color={t.mutedText} />
                <Text
                  className="font-manrope-bold"
                  style={{
                    fontSize: 11,
                    color: t.mutedText,
                    letterSpacing: 0.4,
                  }}
                >
                  {exercise.refWeight}
                </Text>
              </View>
            </View>

            <Text
              className="font-jakarta-bold"
              style={{
                fontSize: 28,
                lineHeight: 32,
                letterSpacing: -0.9,
                color: t.mainText,
              }}
            >
              {exercise.name}
            </Text>
          </View>

          {/* Divider */}
          <View
            className="mx-5"
            style={{ height: 1, backgroundColor: t.divider }}
          />

          {/* Set rows */}
          <View className="px-5 pt-5 pb-5 gap-3">
            {exercise.sets.map((set, si) => {
              const key = `${exercise.id}-${set.id}`;
              const done = completedSets.has(key);
              const dimColor = t.isDark
                ? "rgba(255,255,255,0.22)"
                : "rgba(15,13,32,0.22)";
              return (
                <View key={set.id} className="gap-1.5">
                  {/* Main row */}
                  <View className="flex-row items-center gap-2.5">
                    {/* Set label */}
                    <Text
                      className="font-manrope-bold uppercase"
                      style={{
                        fontSize: 11,
                        color: done ? t.kickerMint : t.mutedText,
                        letterSpacing: 1.2,
                        width: 24,
                      }}
                    >
                      S{si + 1}
                    </Text>

                    {/* Rep range chip */}
                    <View
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: done ? "transparent" : t.mintSurface,
                        borderWidth: 1,
                        borderColor: done
                          ? "transparent"
                          : t.isDark
                            ? "rgba(42,232,204,0.2)"
                            : "rgba(0,80,71,0.15)",
                      }}
                    >
                      <Text
                        className="font-manrope-bold"
                        style={{
                          fontSize: 12,
                          color: done ? dimColor : t.kickerMint,
                        }}
                      >
                        {exercise.repRange} reps
                      </Text>
                    </View>

                    <View className="flex-1" />

                    {/* Kg input */}
                    <TextInput
                      value={setData[key]?.weight ?? ""}
                      onChangeText={(v) => updateWeight(exercise.id, set.id, v)}
                      keyboardType="decimal-pad"
                      editable={!done}
                      selectTextOnFocus
                      placeholder="—"
                      placeholderTextColor={
                        t.isDark
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(15,13,32,0.22)"
                      }
                      style={{
                        width: 58,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 10,
                        backgroundColor: done ? "transparent" : t.inputBg,
                        borderWidth: 1,
                        borderColor: done ? "transparent" : t.ghostBorder,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        fontSize: 15,
                        color: done ? dimColor : t.mainText,
                        textAlign: "center",
                      }}
                    />
                    <Text
                      className="font-manrope"
                      style={{ fontSize: 12, color: t.mutedText }}
                    >
                      kg
                    </Text>

                    {/* Toggle */}
                    <Pressable
                      onPress={() => toggleSet(exercise.id, set.id)}
                      hitSlop={10}
                      style={({ pressed }) => ({
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: done ? BRAND_MINT : t.ghostBg,
                        borderWidth: 1.5,
                        borderColor: done
                          ? BRAND_MINT
                          : t.isDark
                            ? "rgba(255,255,255,0.15)"
                            : "rgba(15,13,32,0.14)",
                        shadowColor: done ? BRAND_MINT : "transparent",
                        shadowOpacity: done ? 0.65 : 0,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 2 },
                        opacity: pressed ? 0.72 : 1,
                      })}
                    >
                      {done && (
                        <CheckCircle
                          size={18}
                          color={t.isDark ? "#0f0d20" : "#ffffff"}
                        />
                      )}
                    </Pressable>
                  </View>

                  {/* Per-set note */}
                  <TextInput
                    value={setNotes[key] ?? ""}
                    onChangeText={(v) =>
                      setSetNotes((prev) => ({ ...prev, [key]: v }))
                    }
                    placeholder="Nota de la serie..."
                    placeholderTextColor={
                      t.isDark ? "rgba(255,255,255,0.18)" : "rgba(15,13,32,0.2)"
                    }
                    style={{
                      marginLeft: 34,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9,
                      backgroundColor: t.ghostBg,
                      borderWidth: 1,
                      borderColor: t.ghostBorder,
                      fontFamily: "Manrope_400Regular",
                      fontSize: 12,
                      color: t.mainText,
                    }}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Series counter ── */}
        <View className="flex-row items-center justify-center gap-2 mb-5">
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: BRAND_MINT,
            }}
          />
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 11, color: t.mutedText, letterSpacing: 1.6 }}
          >
            {doneCount} / {totalSets} series completadas
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer fijo: navegación + acción principal ── */}
      <View
        className="flex-row items-center gap-3 px-5 pt-3.5 border-t"
        style={{
          paddingBottom: insets.bottom + 14,
          borderTopColor: t.divider,
          backgroundColor: t.pageBg,
        }}
      >
        {/* ← Anterior */}
        <Pressable
          onPress={() => {
            if (!canPrev) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentIdx((i) => i - 1);
          }}
          disabled={!canPrev}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: !canPrev ? 0.32 : pressed ? 0.6 : 1,
          })}
        >
          <View
            className="w-14 h-14 rounded-[20px] border items-center justify-center"
            style={{ backgroundColor: t.ghostBg, borderColor: t.ghostBorder }}
          >
            <ChevronRight
              size={18}
              color={t.mutedText}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
          </View>
        </Pressable>

        {/* → Siguiente / Finalizar */}
        <Pressable
          onPress={() => {
            if (canNext) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentIdx((i) => i + 1);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onEnd();
            }
          }}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.9 : 1 })}
        >
          <LinearGradient
            colors={[BRAND_PRIMARY, BRAND_PRIMARY_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 56,
              borderRadius: 20,
              paddingHorizontal: 22,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: BRAND_PRIMARY,
              shadowOpacity: 0.5,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            {canNext ? (
              <View className="flex-1 mr-3">
                <Text className="font-manrope-bold uppercase text-[8px] tracking-[2px] text-white/60 mb-0.5">
                  Siguiente
                </Text>
                <Text
                  className="font-jakarta-bold text-white text-[15px] tracking-[-0.3px]"
                  numberOfLines={1}
                >
                  {SESSION.exercises[currentIdx + 1].name}
                </Text>
              </View>
            ) : (
              <Text className="flex-1 mr-3 font-jakarta-bold text-white text-base tracking-[-0.3px]">
                Finalizar sesión
              </Text>
            )}
            <View className="w-9 h-9 rounded-full items-center justify-center bg-white/20">
              {canNext ? (
                <ChevronRight size={16} color="white" />
              ) : (
                <CheckCircle size={16} color="white" />
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Sesion() {
  const [phase, setPhase] = useState("preview");
  const t = useTokens();

  return (
    <View className="flex-1" style={{ backgroundColor: t.pageBg }}>
      {phase === "preview" ? (
        <PreviewScreen onStart={() => setPhase("active")} />
      ) : (
        <ActiveSession onEnd={() => setPhase("preview")} />
      )}
    </View>
  );
}
