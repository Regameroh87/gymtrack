import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import StyledTextInput from "../forms/StyledTextInput";
import { useActivitySchedules } from "@gymtrack/core/hooks/activities/use-activity-schedules";
import { useActivityScheduleMutations } from "@gymtrack/core/hooks/activities/use-activity-schedule-mutations";
import { useActivityCoaches } from "@gymtrack/core/hooks/activities/use-activity-coaches";
import { useGymStaff } from "@gymtrack/core/hooks/users/use-gym-staff";
import { useActiveGym } from "../../contexts/active-gym-context";
import { useGymTheme } from "../../contexts/gym-theme-context";
import {
  WEEKDAYS,
  weekdayLabel,
  shortTime,
  isValidTime,
} from "../../constants/schedule-options";
import { Plus, Pencil, Trash, X, Clock } from "../../../assets/icons";
import { ui } from "@gymtrack/core/colors";

const EMPTY = {
  id: null,
  weekday: null,
  start_time: "",
  end_time: "",
  capacity: "",
  coach_id: null,
  is_active: true,
};

const fullName = (p) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Sin nombre";

// Confirmación cross-platform (mismo criterio que los otros managers).
const confirmDelete = (label, onConfirm) => {
  if (Platform.OS === "web") {
    if (
      typeof window !== "undefined" &&
      window.confirm(`¿Eliminar el horario de ${label}?`)
    ) {
      onConfirm();
    }
  } else {
    onConfirm();
  }
};

// Horarios semanales de una actividad (activity_schedules): día, franja horaria,
// cupo y coach titular. Las clases del mes se materializan después desde la
// pantalla Agenda. Patrón de editor inline calcado de ActivityPlansManager.
export default function ActivityScheduleManager({ activityId }) {
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const { data: schedules, isLoading } = useActivitySchedules(activityId);
  const { data: activityCoaches = [] } = useActivityCoaches(activityId);
  const { data: staff = [] } = useGymStaff(gymId);
  const { create, update, remove } = useActivityScheduleMutations(
    activityId,
    gymId
  );

  // null = sin editor abierto; objeto = editando (id null ⇒ nuevo).
  const [draft, setDraft] = useState(null);

  // Titular sugerido: los coaches asignados a la actividad; si no hay, todo el staff.
  const coachOptions = activityCoaches.length
    ? activityCoaches
        .filter((c) => c.is_active !== false && c.coach)
        .map((c) => c.coach)
    : staff;

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({ ...EMPTY });
  };
  const openEdit = (row) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({
      id: row.id,
      weekday: row.weekday,
      start_time: shortTime(row.start_time),
      end_time: shortTime(row.end_time),
      capacity: row.capacity == null ? "" : String(row.capacity),
      coach_id: row.coach_id ?? null,
      is_active: row.is_active ?? true,
    });
  };
  const close = () => setDraft(null);

  const save = async () => {
    if (draft.weekday == null) {
      Toast.show({ type: "error", text1: "Elegí un día", position: "bottom" });
      return;
    }
    if (!isValidTime(draft.start_time) || !isValidTime(draft.end_time)) {
      Toast.show({
        type: "error",
        text1: "Horario inválido",
        text2: "Usá el formato HH:MM, ej. 09:00.",
        position: "bottom",
      });
      return;
    }
    if (draft.start_time >= draft.end_time) {
      Toast.show({
        type: "error",
        text1: "La hora de fin debe ser mayor a la de inicio",
        position: "bottom",
      });
      return;
    }
    try {
      const value = {
        weekday: draft.weekday,
        start_time: draft.start_time,
        end_time: draft.end_time,
        capacity: draft.capacity,
        coach_id: draft.coach_id,
        is_active: draft.is_active,
      };
      if (draft.id) {
        await update.mutateAsync({ id: draft.id, ...value });
      } else {
        await create.mutateAsync(value);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "No se pudo guardar el horario",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  const del = async (row) => {
    confirmDelete(
      `${weekdayLabel(row.weekday)} ${shortTime(row.start_time)}`,
      async () => {
        try {
          await remove.mutateAsync(row.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (draft?.id === row.id) close();
        } catch (error) {
          Toast.show({
            type: "error",
            text1: "No se pudo eliminar",
            text2: error.message ?? "Intentá de nuevo.",
            position: "bottom",
          });
        }
      }
    );
  };

  const saving = create.isPending || update.isPending;

  return (
    <View className="gap-3">
      {/* Header de sección */}
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
          Horarios
        </Text>
        {!draft && (
          <Pressable
            onPress={openNew}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-brandPrimary-600 active:scale-95"
            style={{ cursor: "pointer" }}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-[12px] font-manrope-bold text-white">
              Agregar horario
            </Text>
          </Pressable>
        )}
      </View>

      {/* Editor inline */}
      {draft && (
        <View className="gap-3 bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
              {draft.id ? "Editar horario" : "Nuevo horario"}
            </Text>
            <Pressable onPress={close} style={{ cursor: "pointer" }}>
              <X size={16} color={ui.text.muted} />
            </Pressable>
          </View>

          {/* Día (chips) */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Día
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const selected = draft.weekday === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraft((prev) => ({ ...prev, weekday: d.value }));
                    }}
                    className={`px-3 py-1.5 rounded-full border ${
                      selected
                        ? "bg-brandPrimary-600 border-brandPrimary-600"
                        : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <Text
                      className={`text-[12px] font-manrope-semi ${
                        selected
                          ? "text-white"
                          : "text-ui-text-muted dark:text-ui-text-mutedDark"
                      }`}
                    >
                      {d.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Franja horaria */}
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                Desde
              </Text>
              <StyledTextInput
                value={draft.start_time}
                onChangeText={(t) =>
                  setDraft((d) => ({ ...d, start_time: t }))
                }
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                Hasta
              </Text>
              <StyledTextInput
                value={draft.end_time}
                onChangeText={(t) => setDraft((d) => ({ ...d, end_time: t }))}
                placeholder="10:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Cupo */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Cupo
            </Text>
            <StyledTextInput
              value={draft.capacity}
              onChangeText={(t) => setDraft((d) => ({ ...d, capacity: t }))}
              placeholder="Sin cupo (opcional)"
              keyboardType="number-pad"
            />
          </View>

          {/* Coach titular */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Coach titular
            </Text>
            {coachOptions.length === 0 ? (
              <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                Asigná coaches a la actividad para poder elegir el titular.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {coachOptions.map((c) => {
                  const selected = draft.coach_id === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDraft((d) => ({
                          ...d,
                          coach_id: selected ? null : c.id,
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full border ${
                        selected
                          ? "bg-brandPrimary-600 border-brandPrimary-600"
                          : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <Text
                        className={`text-[12px] font-manrope-semi ${
                          selected
                            ? "text-white"
                            : "text-ui-text-muted dark:text-ui-text-mutedDark"
                        }`}
                      >
                        {fullName(c)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Activo */}
          <Pressable
            onPress={() =>
              setDraft((d) => ({ ...d, is_active: !(d.is_active !== false) }))
            }
            className="flex-row items-center justify-between"
            style={{ cursor: "pointer" }}
          >
            <Text className="text-sm font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
              Horario activo
            </Text>
            <View
              className={`w-12 h-7 rounded-full px-0.5 justify-center ${
                draft.is_active !== false
                  ? "bg-brandPrimary-600"
                  : "bg-ui-input-border"
              }`}
            >
              <View
                className="w-6 h-6 rounded-full bg-white"
                style={{
                  transform: [
                    { translateX: draft.is_active !== false ? 20 : 0 },
                  ],
                }}
              />
            </View>
          </Pressable>

          {/* Acciones del editor */}
          <View className="flex-row gap-2 mt-1">
            <Pressable
              onPress={save}
              disabled={saving}
              className={`flex-1 flex-row justify-center items-center gap-2 rounded-xl py-3 active:scale-95 ${
                saving ? "bg-ui-input-border" : "bg-brandPrimary-600"
              }`}
              style={{ cursor: "pointer" }}
            >
              <Text className="text-white text-[13px] font-jakarta-bold tracking-wider">
                {saving ? "GUARDANDO..." : draft.id ? "GUARDAR" : "AGREGAR"}
              </Text>
            </Pressable>
            {draft.id && (
              <Pressable
                onPress={() => del(draft)}
                className="px-4 rounded-xl bg-red-500/10 border border-red-500/20 items-center justify-center active:scale-95"
                style={{ cursor: "pointer" }}
              >
                <Trash size={15} color="#ef4444" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Lista de horarios */}
      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
        </View>
      ) : (schedules?.length ?? 0) === 0 ? (
        !draft && (
          <View className="py-6 items-center bg-ui-input-light/40 dark:bg-ui-input-dark/40 rounded-2xl border border-dashed border-ui-input-border">
            <Clock size={22} color={ui.text.muted} />
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center px-6 mt-2">
              Sin horarios. Agregá los días y franjas en que se dicta esta
              actividad; después generá las clases del mes desde la Agenda.
            </Text>
          </View>
        )
      ) : (
        <View className="gap-2">
          {schedules.map((row) => (
            <View
              key={row.id}
              className="flex-row items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5"
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
                    numberOfLines={1}
                  >
                    {weekdayLabel(row.weekday)} {shortTime(row.start_time)}–
                    {shortTime(row.end_time)}
                  </Text>
                  {!row.is_active && (
                    <View className="bg-ui-input-light dark:bg-ui-input-dark px-1.5 py-0.5 rounded">
                      <Text className="text-[9px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
                        Inactivo
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                  {row.coach ? fullName(row.coach) : "Sin coach titular"}
                  {row.capacity != null ? ` · Cupo ${row.capacity}` : ""}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => openEdit(row)}
                  className="p-2.5 bg-brandPrimary-100 dark:bg-brandPrimary-900/30 rounded-xl active:scale-95"
                  style={{ cursor: "pointer" }}
                >
                  <Pencil size={15} color={brandPrimary[600]} />
                </Pressable>
                <Pressable
                  onPress={() => del(row)}
                  className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl active:scale-95"
                  style={{ cursor: "pointer" }}
                >
                  <Trash size={15} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
