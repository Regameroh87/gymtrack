// React Native
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMemo, useState } from "react";

// Librerías externas
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { eq, inArray } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

// Base de datos
import { database } from "../../../../../../src/database";
import {
  custom_plans,
  custom_plan_weeks,
  custom_plan_week_days,
  custom_plan_week_day_exercises,
  custom_plan_week_day_exercise_sets,
} from "../../../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../../../src/database/sync";

// Hooks
import { useRecordById } from "../../../../../../src/hooks/shared/use-record-by-id";
import { useCustomPlanDetail } from "../../../../../../src/hooks/plans/use-custom-plan-detail";
import { usePlanAssignments } from "../../../../../../src/hooks/plans/use-plan-assignments";
import { useFollowCustomPlan } from "../../../../../../src/hooks/plans/use-follow-custom-plan";
import { useAuth } from "../../../../../../src/auth/lib/getSession";
import { useActiveGym } from "../../../../../../src/contexts/active-gym-context";

// Constantes
import {
  SESSION_OBJECTIVES,
  SESSION_LEVELS,
} from "../../../../../../src/constants/sessionOptions";

// Utilidades
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { makeShadow } from "../../../../../../src/utils/box-shadow";

// Tema / assets
import {
  ArrowLeft,
  Barbell,
  ChartBar,
  ChevronRight,
  Clock,
  Logs,
  Pencil,
  Play,
  ShieldHalf,
  Trash,
} from "../../../../../../assets/icons";

// ─── Brand colors ─────────────────────────────────────────────────────────────
const BRAND_PRIMARY = "#4A44E4";
const BRAND_MINT = "#2DD4BF";
const BRAND_FALLBACK_GRADIENT = ["#0C0B14", "#1e1b4b", "#3023cd"];
const SURFACE_DARK = "#0F0D20";
const SURFACE_LIGHT = "#F5F5F8";

// ─── Diccionarios ─────────────────────────────────────────────────────────────
const OBJECTIVE_LABELS = Object.fromEntries(
  SESSION_OBJECTIVES.map((o) => [o.value, o.label])
);
const LEVEL_LABELS = Object.fromEntries(
  SESSION_LEVELS.map((l) => [l.value, l.label])
);
const OBJECTIVE_ICON = {
  hipertrofia: Barbell,
  fuerza: Barbell,
  perdida_grasa: ChartBar,
  resistencia: Clock,
  acondicionamiento: Logs,
  rehabilitacion: ShieldHalf,
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CustomPlanDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);

  const { data: plan, isLoading } = useRecordById(
    "custom_plan",
    custom_plans,
    id
  );
  const { data: weeks = [], isLoading: isDetailLoading } =
    useCustomPlanDetail(id);
  const { data: assignments } = usePlanAssignments();
  const { mutate: followPlan, isPending: isFollowing } = useFollowCustomPlan();

  const { userId } = useAuth();
  const { gymId } = useActiveGym();
  const currentPlan = assignments?.currentPlan ?? null;
  const alreadyActive = currentPlan?.custom_plan_id === id;
  const hasOtherActive = !!currentPlan && !alreadyActive;
  // Perfil (userId) y gym activo (gymId) cargan async: hasta que estén listos, el
  // insert de la asignación viola NOT NULL. Gateamos el CTA para no dispararlo antes.
  const ready = !!userId && !!gymId;

  const bg = isDark ? SURFACE_DARK : SURFACE_LIGHT;

  const totalExercises = useMemo(
    () =>
      weeks.reduce(
        (acc, w) =>
          acc + w.days.reduce((a, d) => a + (d.exercises?.length ?? 0), 0),
        0
      ),
    [weeks]
  );

  const handleDelete = () => {
    Alert.alert(
      "Eliminar plan",
      "¿Estás seguro? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await database.transaction(async (tx) => {
              const weekRows = await tx
                .select({ id: custom_plan_weeks.id })
                .from(custom_plan_weeks)
                .where(eq(custom_plan_weeks.plan_id, id));
              const weekIds = weekRows.map((w) => w.id);

              if (weekIds.length) {
                const dayRows = await tx
                  .select({ id: custom_plan_week_days.id })
                  .from(custom_plan_week_days)
                  .where(inArray(custom_plan_week_days.week_id, weekIds));
                const dayIds = dayRows.map((d) => d.id);

                if (dayIds.length) {
                  const exRows = await tx
                    .select({ id: custom_plan_week_day_exercises.id })
                    .from(custom_plan_week_day_exercises)
                    .where(
                      inArray(
                        custom_plan_week_day_exercises.week_day_id,
                        dayIds
                      )
                    );
                  const exIds = exRows.map((e) => e.id);

                  if (exIds.length) {
                    await tx
                      .update(custom_plan_week_day_exercise_sets)
                      .set({ sync_status: "deleted" })
                      .where(
                        inArray(
                          custom_plan_week_day_exercise_sets.exercise_id,
                          exIds
                        )
                      );
                  }

                  await tx
                    .update(custom_plan_week_day_exercises)
                    .set({ sync_status: "deleted" })
                    .where(
                      inArray(
                        custom_plan_week_day_exercises.week_day_id,
                        dayIds
                      )
                    );
                }

                await tx
                  .update(custom_plan_week_days)
                  .set({ sync_status: "deleted" })
                  .where(inArray(custom_plan_week_days.week_id, weekIds));

                await tx
                  .update(custom_plan_weeks)
                  .set({ sync_status: "deleted" })
                  .where(inArray(custom_plan_weeks.plan_id, [id]));
              }

              await tx
                .update(custom_plans)
                .set({ sync_status: "deleted" })
                .where(eq(custom_plans.id, id));
            });

            queryClient.invalidateQueries({ queryKey: ["custom_plans"] });
            queryClient.invalidateQueries({
              queryKey: ["custom_plan_detail_weeks", id],
            });
            checkNetInfoAndSync();
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || !plan) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  const imageUrl = plan.cover_image_uri
    ? plan.cover_image_uri.startsWith("file://")
      ? plan.cover_image_uri
      : getCloudinaryUrl(
          plan.cover_image_uri,
          "w_1200,h_900,c_fill,f_auto,q_auto"
        )
    : null;

  const ObjectiveIcon = OBJECTIVE_ICON[plan.objective] ?? Barbell;
  const objectiveLabel = OBJECTIVE_LABELS[plan.objective];
  const levelLabel = LEVEL_LABELS[plan.level];
  const selectedWeek = weeks[selectedWeekIdx];

  // Fade inferior del hero — se adapta al fondo
  const heroFadeColors = isDark
    ? [
        "rgba(15,13,32,0)",
        "rgba(15,13,32,0.4)",
        "rgba(15,13,32,0.92)",
        SURFACE_DARK,
      ]
    : [
        "rgba(245,245,248,0)",
        "rgba(245,245,248,0.4)",
        "rgba(245,245,248,0.92)",
        SURFACE_LIGHT,
      ];

  return (
    <View className="flex-1" style={{ backgroundColor: bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <View style={{ height: 380, position: "relative" }}>
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
                  position: "absolute",
                  right: -40,
                  top: -20,
                  opacity: 0.14,
                  transform: [{ rotate: "-12deg" }],
                }}
              >
                <ObjectiveIcon size={300} color="white" />
              </View>
            </>
          )}

          {/* Scrim superior */}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 130,
            }}
          />

          {/* Fade inferior hacia el fondo de la pantalla */}
          <LinearGradient
            colors={heroFadeColors}
            locations={[0, 0.4, 0.85, 1]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 220,
            }}
          />

          {/* Botón back */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:scale-90"
            style={{
              position: "absolute",
              top: insets.top + 10,
              left: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(15,13,32,0.6)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color="white" />
          </Pressable>

          {/* Botones Edit + Delete */}
          <View
            style={{
              position: "absolute",
              top: insets.top + 10,
              right: 20,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/planes/builder/custom-plan?id=${id}`);
              }}
              className="active:scale-90"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(15,13,32,0.6)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pencil size={16} color="white" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="active:scale-90"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(239,68,68,0.2)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.35)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash size={16} color="#ef4444" />
            </Pressable>
          </View>

          {/* Título sobre scrim inferior */}
          <View
            style={{
              position: "absolute",
              bottom: 28,
              left: 20,
              right: 20,
              gap: 12,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
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

            {objectiveLabel && (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.5)",
                  }}
                />
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.7)",
                    letterSpacing: 1.8,
                  }}
                >
                  {objectiveLabel}
                </Text>
              </View>
            )}

            <Text
              className="font-jakarta-bold text-white"
              style={{
                fontSize: 36,
                lineHeight: 40,
                letterSpacing: -1.2,
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
              }}
              numberOfLines={3}
            >
              {plan.name}
            </Text>
          </View>
        </View>

        {/* ── STATS ROW ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 4, marginBottom: 24 }}>
          <View
            className="flex-row items-stretch rounded-2xl"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.1)",
              paddingVertical: 16,
              paddingHorizontal: 4,
            }}
          >
            {plan.duration_weeks ? (
              <>
                <StatBlock
                  value={plan.duration_weeks}
                  label="Semanas"
                  isDark={isDark}
                />
                <Divider isDark={isDark} />
                <StatBlock
                  value={plan.weekly_days}
                  label="Días/sem"
                  isDark={isDark}
                />
                <Divider isDark={isDark} />
                <StatBlock
                  value={plan.duration_weeks * plan.weekly_days}
                  label="Total días"
                  isDark={isDark}
                />
              </>
            ) : (
              <>
                <StatBlock value="∞" label="Flexible" isDark={isDark} />
                <Divider isDark={isDark} />
                <StatBlock
                  value={plan.weekly_days}
                  label="Días/sem"
                  isDark={isDark}
                />
              </>
            )}
          </View>
        </View>

        {/* ── DESCRIPCIÓN / NIVEL ────────────────────────────────────── */}
        {(plan.description || levelLabel) && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28, gap: 12 }}>
            {levelLabel && (
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: "rgba(45,212,191,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(45,212,191,0.25)",
                }}
              >
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 10,
                    color: BRAND_MINT,
                    letterSpacing: 1.4,
                  }}
                >
                  {levelLabel}
                </Text>
              </View>
            )}
            {plan.description ? (
              <>
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 10,
                    color: BRAND_MINT,
                    letterSpacing: 2.2,
                  }}
                >
                  Sobre el plan
                </Text>
                <Text
                  className="font-manrope"
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: isDark
                      ? "rgba(255,255,255,0.78)"
                      : "rgba(0,0,0,0.72)",
                  }}
                >
                  {plan.description}
                </Text>
              </>
            ) : null}
          </View>
        )}

        {/* ── PROGRAMA ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            className="flex-row items-center"
            style={{ gap: 8, marginBottom: 14 }}
          >
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
              style={{ fontSize: 10, color: BRAND_MINT, letterSpacing: 2.2 }}
            >
              El Programa
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.1)",
              }}
            />
            <Text
              className="font-manrope-bold"
              style={{
                fontSize: 10,
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                letterSpacing: 1.5,
              }}
            >
              {totalExercises} EJ.
            </Text>
          </View>
        </View>

        {isDetailLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={BRAND_PRIMARY} />
          </View>
        ) : weeks.length === 0 ? (
          <View
            style={{
              marginHorizontal: 20,
              paddingVertical: 36,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.12)",
              borderStyle: "dashed",
              alignItems: "center",
            }}
          >
            <Text
              className="font-manrope"
              style={{
                fontSize: 13,
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              Este plan aún no tiene contenido.{"\n"}Tocá el lápiz para armar la
              rutina.
            </Text>
          </View>
        ) : (
          <>
            {/* Tabs de semanas */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 18,
                gap: 8,
              }}
            >
              {weeks.map((w, i) => {
                const isActive = i === selectedWeekIdx;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedWeekIdx(i);
                    }}
                    className="active:scale-95"
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: isActive
                        ? BRAND_PRIMARY
                        : isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                      borderWidth: 1,
                      borderColor: isActive
                        ? BRAND_PRIMARY
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {isActive && (
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: BRAND_MINT,
                          ...makeShadow({ color: BRAND_MINT, opacity: 1, radius: 4 }),
                        }}
                      />
                    )}
                    <Text
                      className="font-manrope-bold uppercase"
                      style={{
                        fontSize: 11,
                        color: isActive
                          ? "white"
                          : isDark
                            ? "rgba(255,255,255,0.55)"
                            : "rgba(0,0,0,0.55)",
                        letterSpacing: 1.2,
                      }}
                    >
                      {weeks.length === 1 && w.week_number === 0
                        ? "Semana tipo"
                        : `Semana ${w.week_number}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Días de la semana activa */}
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              {selectedWeek?.days.length === 0 ? (
                <Text
                  className="font-manrope italic"
                  style={{
                    fontSize: 13,
                    color: isDark
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(0,0,0,0.35)",
                    textAlign: "center",
                    paddingVertical: 24,
                  }}
                >
                  Sin días configurados en esta semana.
                </Text>
              ) : (
                selectedWeek?.days.map((day) => (
                  <DayCard key={day.id} day={day} isDark={isDark} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── CTA STICKY ────────────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          paddingHorizontal: 20,
          backgroundColor: isDark
            ? "rgba(15,13,32,0.92)"
            : "rgba(245,245,248,0.92)",
          borderTopWidth: 1,
          borderTopColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.08)",
        }}
      >
        <Pressable
          disabled={alreadyActive || isFollowing || !ready}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (hasOtherActive) {
              const activeName = currentPlan.plan?.name ?? "tu plan actual";
              Alert.alert(
                "¿Reemplazar plan actual?",
                `Estás haciendo "${activeName}". Si arrancás este, el anterior queda como completado.`,
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sí, cambiar",
                    onPress: () => followPlan({ customPlanId: id }),
                  },
                ]
              );
            } else {
              followPlan({ customPlanId: id });
            }
          }}
          className="active:scale-[0.98]"
        >
          <LinearGradient
            colors={
              alreadyActive
                ? ["#1e1b4b", "#1e1b4b"]
                : [BRAND_PRIMARY, "#6366f1"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              ...makeShadow({ color: alreadyActive ? "transparent" : BRAND_PRIMARY, opacity: alreadyActive ? 0 : 0.5, radius: 16, offset: { width: 0, height: 6 } }),
              opacity: isFollowing || !ready ? 0.7 : 1,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play size={13} color="white" />
              </View>
              <Text
                className="font-manrope-bold uppercase text-white"
                style={{ fontSize: 13, letterSpacing: 1.4 }}
              >
                {isFollowing
                  ? "Guardando…"
                  : alreadyActive
                    ? "Plan activo ✓"
                    : !ready
                      ? "Cargando…"
                      : "Seguir este plan"}
              </Text>
            </View>
            {!alreadyActive && (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={14} color={BRAND_PRIMARY} />
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function StatBlock({ value, label, isDark }) {
  return (
    <View className="flex-1 items-center">
      <Text
        className="font-jakarta-bold"
        style={{
          fontSize: 24,
          letterSpacing: -0.8,
          lineHeight: 26,
          color: isDark ? "white" : "#1a1a2e",
        }}
      >
        {value ?? 0}
      </Text>
      <Text
        className="font-manrope-bold uppercase"
        style={{
          fontSize: 9,
          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
          letterSpacing: 1.4,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Divider({ isDark }) {
  return (
    <View
      style={{
        width: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        marginVertical: 4,
      }}
    />
  );
}

function DayCard({ day, isDark }) {
  const exCount = day.exercises?.length ?? 0;
  const hasSession = !!day.session_name;

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header del día */}
      <View
        className="flex-row items-center"
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 12,
          borderBottomWidth: exCount > 0 ? 1 : 0,
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.08)",
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(74,68,228,0.18)",
            borderWidth: 1,
            borderColor: "rgba(74,68,228,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="font-manrope-bold uppercase"
            style={{ fontSize: 8, color: BRAND_MINT, letterSpacing: 1 }}
          >
            Día
          </Text>
          <Text
            className="font-jakarta-bold"
            style={{
              fontSize: 14,
              lineHeight: 16,
              color: isDark ? "white" : "#1a1a2e",
            }}
          >
            {day.day_number}
          </Text>
        </View>

        <View className="flex-1">
          <Text
            className="font-jakarta-bold"
            style={{
              fontSize: 14,
              color: hasSession
                ? isDark
                  ? "white"
                  : "#1a1a2e"
                : isDark
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(0,0,0,0.35)",
            }}
            numberOfLines={1}
          >
            {day.session_name ?? "Sin sesión asignada"}
          </Text>
          <Text
            className="font-manrope-semi uppercase"
            style={{
              fontSize: 9,
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
              letterSpacing: 1.2,
              marginTop: 2,
            }}
          >
            {exCount === 0
              ? "Sin ejercicios"
              : `${exCount} ejercicio${exCount !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {/* Lista de ejercicios */}
      {exCount > 0 && (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          {day.exercises.map((ex, idx) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              index={idx}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ExerciseRow({ exercise, index, isDark }) {
  const sets = exercise.sets ?? [];
  return (
    <View className="flex-row items-start" style={{ gap: 10 }}>
      <Text
        className="font-jakarta-bold"
        style={{
          fontSize: 11,
          color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
          letterSpacing: 1,
          minWidth: 18,
          marginTop: 2,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </Text>
      <View className="flex-1">
        <Text
          className="font-manrope-semi"
          style={{
            fontSize: 13,
            color: isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)",
          }}
          numberOfLines={1}
        >
          {exercise.exercise_name ?? "—"}
        </Text>
        {sets.length > 0 && (
          <View className="flex-row flex-wrap" style={{ gap: 4, marginTop: 4 }}>
            {sets.map((s) => (
              <SetChip key={s.set_number} set={s} isDark={isDark} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function SetChip({ set, isDark }) {
  let label;
  if (set.duration_seconds) label = `${set.duration_seconds}s`;
  else if (set.reps_min != null && set.reps_max != null)
    label =
      set.reps_min === set.reps_max
        ? `${set.reps_min}`
        : `${set.reps_min}-${set.reps_max}`;
  else label = "—";

  return (
    <View
      className="flex-row items-center"
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: "rgba(45,212,191,0.1)",
        borderWidth: 1,
        borderColor: "rgba(45,212,191,0.2)",
        gap: 4,
      }}
    >
      <Text
        className="font-manrope-bold uppercase"
        style={{
          fontSize: 8,
          color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
          letterSpacing: 0.8,
        }}
      >
        S{set.set_number}
      </Text>
      <Text
        className="font-manrope-bold"
        style={{ fontSize: 10, color: BRAND_MINT }}
      >
        {label}
      </Text>
    </View>
  );
}
