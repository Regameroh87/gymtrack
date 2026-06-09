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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Base de datos
import { database } from "../../../../../src/database";
import {
  exercises_base,
  plan_assignments,
  plan_week_day_exercise_sets,
  plan_week_day_exercises,
  plan_week_days,
  plan_weeks,
  session_exercises,
  sessions,
  training_plans,
} from "../../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../../src/database/sync";

// Hooks
import { useRecordById } from "../../../../../src/hooks/shared/use-record-by-id";
import { useTogglePlanPublish } from "../../../../../src/hooks/plans/plan-publish";

// Componentes
import Screen from "../../../../../src/components/Screen";

// Constantes
import {
  SESSION_OBJECTIVES,
  SESSION_LEVELS,
} from "../../../../../src/constants/sessionOptions";

// Utils
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";

// Tema / assets
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { Barbell, Pencil, Trash, Upload } from "../../../../../assets/icons";

// ─── Constantes de display ────────────────────────────────────────────────────

const OBJECTIVE_ACCENT = {
  hipertrofia: "#6366f1",
  fuerza: "#ef4444",
  perdida_grasa: "#22c55e",
  resistencia: "#38bdf8",
  acondicionamiento: "#f59e0b",
  rehabilitacion: "#a855f7",
};

const OBJECTIVE_LABELS = Object.fromEntries(
  SESSION_OBJECTIVES.map((o) => [o.value, o.label])
);
const LEVEL_LABELS = Object.fromEntries(
  SESSION_LEVELS.map((l) => [l.value, l.label])
);

// ─── Chip de estadística ──────────────────────────────────────────────────────

function StatChip({ value, label }) {
  return (
    <View className="flex-row items-baseline gap-1 px-3 py-2 rounded-xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border">
      {value !== null && value !== undefined && (
        <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
          {value}
        </Text>
      )}
      <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
        {label}
      </Text>
    </View>
  );
}

// ─── Fila de ejercicio ────────────────────────────────────────────────────────

function SetChip({ set, accent }) {
  let label;
  if (set.duration_seconds) {
    label = `${set.duration_seconds}s`;
  } else if (set.reps_min != null && set.reps_max != null) {
    label =
      set.reps_min === set.reps_max
        ? `${set.reps_min}`
        : `${set.reps_min}-${set.reps_max}`;
  } else {
    label = "—";
  }
  return (
    <View
      className="flex-row items-center px-2 py-0.5 rounded-lg mr-1.5 mb-1"
      style={{ backgroundColor: accent + "14" }}
    >
      <Text className="text-[9px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mr-0.5">
        S{set.set_number}
      </Text>
      <Text className="text-[10px] font-manrope-semi" style={{ color: accent }}>
        {label}
      </Text>
    </View>
  );
}

function ExerciseRow({ exercise, index, accent }) {
  const sets = exercise.sets ?? [];

  return (
    <View className="py-2">
      <View className="flex-row items-center">
        <View
          className="w-5 h-5 rounded-md items-center justify-center mr-2.5 shrink-0"
          style={{ backgroundColor: accent + "18" }}
        >
          <Text
            className="text-[9px] font-jakarta-bold"
            style={{ color: accent }}
          >
            {index + 1}
          </Text>
        </View>
        <Text
          className="flex-1 text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {exercise.exercise_name ?? "—"}
        </Text>
      </View>
      {sets.length > 0 && (
        <View className="flex-row flex-wrap ml-7 mt-1">
          {sets.map((s) => (
            <SetChip key={s.set_number} set={s} accent={accent} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Tarjeta de día ───────────────────────────────────────────────────────────

function DayCard({ day, accent }) {
  const exCount = day.exercises.length;
  const hasSession = !!day.session_name;
  const imageUri = day.cover_image_uri
    ? (getCloudinaryUrl(day.cover_image_uri) ?? day.cover_image_uri)
    : null;

  return (
    <View className="mb-2.5 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark overflow-hidden">
      {/* Encabezado del día */}
      <View
        className="flex-row items-center px-4 py-3"
        style={
          exCount > 0
            ? { borderBottomWidth: 1, borderBottomColor: ui.input.border }
            : null
        }
      >
        <View className="w-11 h-11 rounded-xl overflow-hidden mr-3 relative">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[accent + "cc", accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <View className="opacity-30 -rotate-12">
                <Barbell size={20} color="white" />
              </View>
            </LinearGradient>
          )}
        </View>
        <View className="flex-1 mr-3">
          <Text
            className={`text-sm font-jakarta-semi ${hasSession ? "text-ui-text-main dark:text-ui-text-mainDark" : "text-ui-text-muted dark:text-ui-text-mutedDark"}`}
            numberOfLines={1}
          >
            {day.session_name ?? "Sin sesión asignada"}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
            {exCount === 0
              ? "Sin ejercicios"
              : `${exCount} ejercicio${exCount !== 1 ? "s" : ""}`}
          </Text>
        </View>
        {/* Indicador de día al extremo derecho */}
        <View
          className="items-center justify-center px-2.5 py-1 rounded-lg shrink-0"
          style={{ backgroundColor: accent + "18" }}
        >
          <Text
            className="text-[8px] font-manrope-semi uppercase tracking-wider"
            style={{ color: accent }}
          >
            Día
          </Text>
          <Text
            className="text-base font-jakarta-bold leading-tight"
            style={{ color: accent }}
          >
            {day.day_number}
          </Text>
        </View>
      </View>

      {/* Lista de ejercicios */}
      {exCount > 0 && (
        <View className="px-4 pt-1 pb-3">
          {day.exercises.map((ex, idx) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              index={idx}
              accent={accent}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Sección de semana ────────────────────────────────────────────────────────

function WeekSection({ week, accent }) {
  return (
    <View className="mb-6">
      {/* Header de semana */}
      <View className="flex-row items-center mb-3">
        <View
          className="w-7 h-7 rounded-lg items-center justify-center mr-2"
          style={{ backgroundColor: accent + "22" }}
        >
          <Text className="text-xs font-jakarta-bold" style={{ color: accent }}>
            {week.week_number}
          </Text>
        </View>
        <Text className="text-xs font-manrope-semi uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
          Semana {week.week_number}
        </Text>
        <View
          className="flex-1 ml-3"
          style={{ height: 1, backgroundColor: ui.input.border }}
        />
      </View>

      {/* Días */}
      {week.days.length === 0 ? (
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark ml-9 italic">
          Sin días configurados.
        </Text>
      ) : (
        week.days.map((day) => (
          <DayCard key={day.id} day={day} accent={accent} />
        ))
      )}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();

  const { data: plan, isLoading } = useRecordById(
    "training_plan",
    training_plans,
    id
  );

  const { data: weeks = [], isLoading: isDetailLoading } = useQuery({
    queryKey: ["plan_detail_weeks", id],
    enabled: !!id,
    queryFn: async () => {
      const weeksRows = await database
        .select()
        .from(plan_weeks)
        .where(
          and(eq(plan_weeks.plan_id, id), ne(plan_weeks.sync_status, "deleted"))
        )
        .orderBy(asc(plan_weeks.week_number));

      if (!weeksRows.length) return [];

      const weekIds = weeksRows.map((w) => w.id);

      const daysRows = await database
        .select({
          id: plan_week_days.id,
          week_id: plan_week_days.week_id,
          day_number: plan_week_days.day_number,
          session_id: plan_week_days.session_id,
          session_name: sessions.name,
          cover_image_uri: sessions.cover_image_uri,
        })
        .from(plan_week_days)
        .leftJoin(sessions, eq(plan_week_days.session_id, sessions.id))
        .where(
          and(
            inArray(plan_week_days.week_id, weekIds),
            ne(plan_week_days.sync_status, "deleted")
          )
        )
        .orderBy(asc(plan_week_days.day_number));

      const dayIds = daysRows.map((d) => d.id);

      let exRows = [];
      if (dayIds.length) {
        exRows = await database
          .select({
            id: plan_week_day_exercises.id,
            week_day_id: plan_week_day_exercises.week_day_id,
            exercise_name: exercises_base.name,
            muscle_group: exercises_base.muscle_group,
            position: plan_week_day_exercises.position,
          })
          .from(plan_week_day_exercises)
          .leftJoin(
            session_exercises,
            eq(
              plan_week_day_exercises.session_exercise_id,
              session_exercises.id
            )
          )
          .leftJoin(
            exercises_base,
            eq(session_exercises.exercise_id, exercises_base.id)
          )
          .where(
            and(
              inArray(plan_week_day_exercises.week_day_id, dayIds),
              ne(plan_week_day_exercises.sync_status, "deleted")
            )
          )
          .orderBy(asc(plan_week_day_exercises.position));
      }

      const exIds = exRows.map((e) => e.id);
      const setDataByEx = {};
      if (exIds.length) {
        const setRows = await database
          .select({
            exercise_id: plan_week_day_exercise_sets.exercise_id,
            set_number: plan_week_day_exercise_sets.set_number,
            reps_min: plan_week_day_exercise_sets.reps_min,
            reps_max: plan_week_day_exercise_sets.reps_max,
            duration_seconds: plan_week_day_exercise_sets.duration_seconds,
          })
          .from(plan_week_day_exercise_sets)
          .where(inArray(plan_week_day_exercise_sets.exercise_id, exIds))
          .orderBy(asc(plan_week_day_exercise_sets.set_number));
        for (const s of setRows) {
          if (!setDataByEx[s.exercise_id]) setDataByEx[s.exercise_id] = [];
          setDataByEx[s.exercise_id].push(s);
        }
      }

      const exByDayId = {};
      for (const ex of exRows) {
        if (!exByDayId[ex.week_day_id]) exByDayId[ex.week_day_id] = [];
        const sets = setDataByEx[ex.id] ?? [];
        const first = sets[0];
        let set_summary = null;
        if (sets.length > 0) {
          if (first?.duration_seconds) {
            set_summary = `${sets.length}×${first.duration_seconds}s`;
          } else if (first?.reps_min != null && first?.reps_max != null) {
            const reps =
              first.reps_min === first.reps_max
                ? `${first.reps_min}`
                : `${first.reps_min}-${first.reps_max}`;
            set_summary = `${sets.length}×${reps}`;
          } else {
            set_summary = `${sets.length} ser.`;
          }
        }
        exByDayId[ex.week_day_id].push({
          ...ex,
          set_count: sets.length,
          set_summary,
          sets,
        });
      }

      const daysByWeekId = {};
      for (const d of daysRows) {
        if (!daysByWeekId[d.week_id]) daysByWeekId[d.week_id] = [];
        daysByWeekId[d.week_id].push({
          ...d,
          exercises: exByDayId[d.id] ?? [],
        });
      }

      return weeksRows.map((w) => ({
        ...w,
        days: daysByWeekId[w.id] ?? [],
      }));
    },
  });

  const { mutate: togglePublish, isPending: isTogglingPublish } =
    useTogglePlanPublish();

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
              await tx
                .update(plan_assignments)
                .set({ sync_status: "deleted" })
                .where(eq(plan_assignments.plan_id, id));
              await tx
                .update(training_plans)
                .set({ sync_status: "deleted" })
                .where(eq(training_plans.id, id));
            });
            queryClient.invalidateQueries({ queryKey: ["training_plans"] });
            queryClient.invalidateQueries({ queryKey: ["plan_assignments"] });
            checkNetInfoAndSync();
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading || !plan) {
    return (
      <View className="flex-1 items-center justify-center bg-ui-background-light dark:bg-ui-background-dark">
        <ActivityIndicator size="large" color={brandPrimary[600]} />
      </View>
    );
  }

  const accent = OBJECTIVE_ACCENT[plan.objective] ?? brandPrimary[600];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="px-5 pt-5 pb-4">
          <View className="flex-row items-start justify-between mb-1">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark leading-tight">
                {plan.name}
              </Text>
              {OBJECTIVE_LABELS[plan.objective] ? (
                <View
                  className="mt-2.5 self-start rounded-full px-3 py-1 border"
                  style={{
                    backgroundColor: accent + "18",
                    borderColor: accent + "44",
                  }}
                >
                  <Text
                    className="text-[11px] font-manrope-semi"
                    style={{ color: accent }}
                  >
                    {OBJECTIVE_LABELS[plan.objective]}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row gap-2 mt-1">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/admin/plans/builder?id=${id}`);
                }}
                className="w-9 h-9 rounded-xl items-center justify-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:opacity-60"
              >
                <Pencil
                  size={16}
                  color={isDark ? ui.text.mainDark : ui.text.main}
                />
              </Pressable>
              <Pressable
                onPress={handleDelete}
                className="w-9 h-9 rounded-xl items-center justify-center bg-red-500/10 border border-red-500/20 active:opacity-60"
              >
                <Trash size={16} color="#ef4444" />
              </Pressable>
            </View>
          </View>

          {plan.description ? (
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark leading-[21px] mt-3">
              {plan.description}
            </Text>
          ) : null}
        </View>

        {/* ── Estado de publicación ── */}
        <View className="px-5 mb-4">
          <Pressable
            disabled={isTogglingPublish}
            onPress={() =>
              togglePublish({ id, publish: !plan.is_published })
            }
            className="active:opacity-70"
          >
            {plan.is_published ? (
              <View className="flex-row items-center self-start gap-2 px-3 py-1.5 rounded-xl bg-brandPrimary-500/10 border border-brandPrimary-500/25">
                <View className="w-2 h-2 rounded-full bg-brandPrimary-500" />
                <Text className="font-manrope-bold text-[12px] text-brandPrimary-500 dark:text-brandPrimary-400 uppercase tracking-wider">
                  Publicado · Tocá para despublicar
                </Text>
              </View>
            ) : (
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-row items-center self-start gap-2 px-3 py-1.5 rounded-xl"
              >
                <Upload size={13} color="white" />
                <Text className="font-manrope-bold text-[12px] text-white uppercase tracking-wider">
                  {isTogglingPublish ? "Publicando…" : "Publicar plan"}
                </Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {/* ── Stats ── */}
        <View className="px-5 mb-6 flex-row flex-wrap gap-2">
          <StatChip value={plan.duration_weeks} label="semanas" />
          <StatChip value={plan.weekly_days} label="días / sem" />
          {plan.level ? (
            <StatChip
              value={null}
              label={LEVEL_LABELS[plan.level] ?? plan.level}
            />
          ) : null}
        </View>

        {/* ── Rutina ── */}
        <View className="px-5">
          <Text className="text-[10px] font-manrope-semi uppercase tracking-widest text-brandPrimary-500 dark:text-brandPrimary-400 mb-5">
            Rutina del plan
          </Text>

          {isDetailLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator color={brandPrimary[500]} />
            </View>
          ) : weeks.length === 0 ? (
            <View className="py-10 items-center rounded-2xl border border-dashed border-ui-input-border">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center px-6 leading-6">
                Este plan aún no tiene semanas configuradas.{"\n"}Tocá el lápiz
                para armar la rutina.
              </Text>
            </View>
          ) : (
            weeks.map((week) => (
              <WeekSection key={week.id} week={week} accent={accent} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
