import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import Screen from "../../../../../src/components/Screen";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { useAuth } from "../../../../../src/auth/lib/getSession";
import { useUserRole } from "../../../../../src/hooks/shared/use-user-role";
import { isAdminRole } from "../../../../../src/constants/roles";
import { useActivityClasses } from "@gymtrack/core/hooks/activities/use-activity-classes";
import { useActivityClassMutations } from "@gymtrack/core/hooks/activities/use-activity-class-mutations";
import { useGymStaff } from "@gymtrack/core/hooks/users/use-gym-staff";
import { shortTime } from "../../../../../src/constants/schedule-options";
import {
  Calendar,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  SwitchHorizontal,
} from "../../../../../assets/icons";

const fullName = (p) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Sin coach";

const toISO = (d) => d.toISOString().split("T")[0];

// Rango [1° del mes, último del mes] del mes mostrado.
const monthRange = (year, month) => ({
  fromISO: toISO(new Date(Date.UTC(year, month, 1))),
  toISO: toISO(new Date(Date.UTC(year, month + 1, 0))),
});

const monthTitle = (year, month) => {
  const label = new Date(year, month, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const dayTitle = (iso) => {
  const label = new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const STATUS_BADGE = {
  scheduled: { label: "Programada", chip: "bg-brandPrimary-100 dark:bg-brandPrimary-900/30", text: "text-brandPrimary-700 dark:text-brandPrimary-300" },
  completed: { label: "Dictada", chip: "bg-green-500/10", text: "text-green-600" },
  cancelled: { label: "Cancelada", chip: "bg-red-500/10", text: "text-red-500" },
};

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { userId: myProfileId } = useAuth();
  const { role } = useUserRole();
  const isAdmin = isAdminRole(role);

  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { fromISO, toISO: toISODate } = monthRange(cursor.year, cursor.month);

  const { data: classes, isLoading } = useActivityClasses(
    gymId,
    fromISO,
    toISODate
  );
  const { generate, setStatus, changeCoach } = useActivityClassMutations(gymId);

  // Clase a la que se le está cambiando el coach (suplencia); null = modal cerrado.
  const [substituting, setSubstituting] = useState(null);

  const moveMonth = (delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const onGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const created = await generate.mutateAsync({
        fromISO,
        toISO: toISODate,
      });
      Toast.show({
        type: "success",
        text1:
          created > 0
            ? `${created} ${created === 1 ? "clase generada" : "clases generadas"}`
            : "La agenda del mes ya estaba generada",
        position: "bottom",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "No se pudo generar la agenda",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  const onSetStatus = (cls, status) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus.mutate(
      { id: cls.id, status },
      {
        onError: (error) =>
          Toast.show({
            type: "error",
            text1: "No se pudo actualizar la clase",
            text2: error.message ?? "Intentá de nuevo.",
            position: "bottom",
          }),
      }
    );
  };

  // Agrupar por fecha para render por día.
  const byDay = useMemo(() => {
    const map = new Map();
    for (const c of classes ?? []) {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date).push(c);
    }
    return [...map.entries()];
  }, [classes]);

  const todayISO = toISO(today);

  return (
    <Screen safe={Platform.OS === "android"}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4">
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandSecondary-500 dark:text-brandSecondary-400">
            Operativo
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Agenda de clases
          </Text>
        </View>

        {/* Selector de mes */}
        <View className="flex-row items-center justify-between px-6 mb-4">
          <Pressable
            onPress={() => moveMonth(-1)}
            className="p-2.5 rounded-xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:scale-95"
          >
            <ChevronLeft size={16} color={ui.text.muted} />
          </Pressable>
          <Text className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark">
            {monthTitle(cursor.year, cursor.month)}
          </Text>
          <Pressable
            onPress={() => moveMonth(1)}
            className="p-2.5 rounded-xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:scale-95"
          >
            <ChevronRight size={16} color={ui.text.muted} />
          </Pressable>
        </View>

        {/* Generar clases del mes (solo admin/owner) */}
        {isAdmin && (
          <View className="px-6 mb-4">
            <Pressable
              onPress={onGenerate}
              disabled={generate.isPending}
              className={`flex-row justify-center items-center gap-2 rounded-xl py-3 active:scale-95 ${
                generate.isPending ? "bg-ui-input-border" : "bg-brandPrimary-600"
              }`}
            >
              <Calendar size={15} color="#fff" />
              <Text className="text-white text-[13px] font-jakarta-bold tracking-wider">
                {generate.isPending
                  ? "GENERANDO..."
                  : "GENERAR CLASES DEL MES"}
              </Text>
            </Pressable>
            <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1.5">
              Crea las clases a partir de los horarios de cada actividad. Se
              puede repetir: no duplica ni pisa clases editadas.
            </Text>
          </View>
        )}

        {/* Lista por día */}
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color={brandPrimary[600]} />
          </View>
        ) : byDay.length === 0 ? (
          <View className="mx-6 py-12 items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-dashed border-ui-input-border rounded-2xl">
            <Calendar size={36} color={ui.text.muted} />
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mt-3 px-8">
              No hay clases este mes. Cargá horarios en las actividades y
              generá la agenda.
            </Text>
          </View>
        ) : (
          <View className="px-6 gap-4">
            {byDay.map(([date, rows]) => (
              <View key={date}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text
                    className={`text-[12px] font-manrope-bold uppercase tracking-wider ${
                      date === todayISO
                        ? "text-brandPrimary-600 dark:text-brandPrimary-400"
                        : "text-ui-text-muted dark:text-ui-text-mutedDark"
                    }`}
                  >
                    {dayTitle(date)}
                    {date === todayISO ? " · Hoy" : ""}
                  </Text>
                  <View className="flex-1 h-px bg-ui-input-border" />
                </View>
                <View className="gap-2">
                  {rows.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      brandPrimary={brandPrimary}
                      canManage={isAdmin}
                      isMine={cls.coach_id === myProfileId}
                      onComplete={() => onSetStatus(cls, "completed")}
                      onCancel={() => onSetStatus(cls, "cancelled")}
                      onRestore={() => onSetStatus(cls, "scheduled")}
                      onSubstitute={() => setSubstituting(cls)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de suplencia */}
      <SubstituteModal
        cls={substituting}
        onClose={() => setSubstituting(null)}
        brandPrimary={brandPrimary}
        insets={insets}
        onPick={(coachId) => {
          changeCoach.mutate(
            { id: substituting.id, coachId },
            {
              onSuccess: () => setSubstituting(null),
              onError: (error) =>
                Toast.show({
                  type: "error",
                  text1: "No se pudo cambiar el coach",
                  text2: error.message ?? "Intentá de nuevo.",
                  position: "bottom",
                }),
            }
          );
        }}
      />
    </Screen>
  );
}

function ClassCard({
  cls,
  brandPrimary,
  canManage,
  isMine,
  onComplete,
  onCancel,
  onRestore,
  onSubstitute,
}) {
  const color = cls.activities?.color ?? brandPrimary[600];
  const badge = STATUS_BADGE[cls.status] ?? STATUS_BADGE.scheduled;
  const cancelled = cls.status === "cancelled";
  const completed = cls.status === "completed";

  return (
    <View
      className={`bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 ${
        cancelled ? "opacity-60" : ""
      }`}
    >
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Calendar size={18} color={color} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {cls.activities?.name ?? "Actividad"} ·{" "}
            {shortTime(cls.start_time)}–{shortTime(cls.end_time)}
          </Text>
          <Text
            className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
            numberOfLines={1}
          >
            {fullName(cls.coach)}
            {cls.capacity != null ? ` · Cupo ${cls.capacity}` : ""}
          </Text>
        </View>
        <View className={`px-2 py-0.5 rounded-md ${badge.chip}`}>
          <Text
            className={`text-[9px] font-manrope-bold uppercase tracking-wider ${badge.text}`}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Acciones: admin todo; coach solo marcar SU clase como dictada. */}
      {(canManage || (isMine && !cancelled)) && (
        <View className="flex-row items-center justify-end gap-2 mt-3">
          {!completed && !cancelled && (
            <Pressable
              onPress={onComplete}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 active:scale-95"
            >
              <Check size={13} color="#16a34a" />
              <Text className="text-[11px] font-manrope-semi text-green-600">
                Dictada
              </Text>
            </Pressable>
          )}
          {canManage && !cancelled && (
            <Pressable
              onPress={onSubstitute}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brandPrimary-100 dark:bg-brandPrimary-900/30 active:scale-95"
            >
              <SwitchHorizontal size={13} color={brandPrimary[600]} />
              <Text className="text-[11px] font-manrope-semi text-brandPrimary-700 dark:text-brandPrimary-300">
                Coach
              </Text>
            </Pressable>
          )}
          {canManage && !cancelled && (
            <Pressable
              onPress={onCancel}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 active:scale-95"
            >
              <X size={13} color="#ef4444" />
              <Text className="text-[11px] font-manrope-semi text-red-500">
                Cancelar
              </Text>
            </Pressable>
          )}
          {canManage && cancelled && (
            <Pressable
              onPress={onRestore}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brandPrimary-100 dark:bg-brandPrimary-900/30 active:scale-95"
            >
              <Check size={13} color={brandPrimary[600]} />
              <Text className="text-[11px] font-manrope-semi text-brandPrimary-700 dark:text-brandPrimary-300">
                Restaurar
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// Bottom-sheet para elegir el coach efectivo de una clase (suplencia).
function SubstituteModal({ cls, onClose, onPick, brandPrimary, insets }) {
  const { gymId } = useActiveGym();
  const { data: staff = [], isLoading } = useGymStaff(gymId);

  return (
    <Modal
      visible={!!cls}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl max-h-[70%]"
          style={{ paddingBottom: insets.bottom + 12 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-ui-input-border" />
          </View>
          <View className="px-6 pt-2 pb-3">
            <Text className="text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
              Coach de la clase
            </Text>
            <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
              El suplente cobra por clase solo si tiene tarifa asignada en esta
              actividad.
            </Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color={brandPrimary[600]} />
              </View>
            ) : (
              staff.map((s) => {
                const selected = cls?.coach_id === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => onPick(s.id)}
                    className="mx-5 mb-2.5 flex-row items-center p-3.5 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-80"
                  >
                    <View className="flex-1">
                      <Text
                        className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                        numberOfLines={1}
                      >
                        {fullName(s)}
                      </Text>
                    </View>
                    {selected && <Check size={16} color={brandPrimary[600]} />}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
