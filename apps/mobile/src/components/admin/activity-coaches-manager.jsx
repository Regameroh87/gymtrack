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
import { useActivityCoaches } from "@gymtrack/core/hooks/activities/use-activity-coaches";
import { useActivityCoachMutations } from "@gymtrack/core/hooks/activities/use-activity-coach-mutations";
import { useGymStaff } from "@gymtrack/core/hooks/users/use-gym-staff";
import { useActiveGym } from "../../contexts/active-gym-context";
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Plus, Pencil, Trash, X, Users } from "../../../assets/icons";
import { ui } from "@gymtrack/core/colors";

const EMPTY = {
  id: null,
  coach_id: null,
  monthly_fee: "",
  revenue_share_pct: "",
  rate_per_class: "",
  is_active: true,
};

const fullName = (p) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Sin nombre";

const money = (v) => `$${Number(v).toLocaleString("es-AR")}`;

// Resumen legible del esquema de pago: "$50.000 fijo · 10% ingresos · $3.000/clase".
const schemeSummary = (row) => {
  const parts = [];
  if (row.monthly_fee != null) parts.push(`${money(row.monthly_fee)} fijo`);
  if (row.revenue_share_pct != null)
    parts.push(`${Number(row.revenue_share_pct)}% ingresos`);
  if (row.rate_per_class != null)
    parts.push(`${money(row.rate_per_class)}/clase`);
  return parts.length ? parts.join(" · ") : "Sin esquema de pago";
};

// Confirmación cross-platform (mismo criterio que ActivityPlansManager).
const confirmDelete = (label, onConfirm) => {
  if (Platform.OS === "web") {
    if (
      typeof window !== "undefined" &&
      window.confirm(`¿Quitar a ${label} de esta actividad?`)
    ) {
      onConfirm();
    }
  } else {
    onConfirm();
  }
};

// Gestión de coaches de una actividad (activity_coaches): quién la dicta y cómo
// cobra (fijo mensual, % de ingresos y/o tarifa por clase — combinables). Patrón
// de editor inline calcado de ActivityPlansManager.
export default function ActivityCoachesManager({ activityId }) {
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const { data: coaches, isLoading } = useActivityCoaches(activityId);
  const { data: staff = [] } = useGymStaff(gymId);
  const { create, update, remove } = useActivityCoachMutations(activityId, gymId);

  // null = sin editor abierto; objeto = editando (id null ⇒ nuevo).
  const [draft, setDraft] = useState(null);

  const assignedIds = new Set((coaches ?? []).map((c) => c.coach_id));

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({ ...EMPTY });
  };
  const openEdit = (row) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({
      id: row.id,
      coach_id: row.coach_id,
      monthly_fee: row.monthly_fee == null ? "" : String(row.monthly_fee),
      revenue_share_pct:
        row.revenue_share_pct == null ? "" : String(row.revenue_share_pct),
      rate_per_class:
        row.rate_per_class == null ? "" : String(row.rate_per_class),
      is_active: row.is_active ?? true,
    });
  };
  const close = () => setDraft(null);

  const save = async () => {
    if (!draft.coach_id) {
      Toast.show({
        type: "error",
        text1: "Elegí un coach",
        position: "bottom",
      });
      return;
    }
    const pct =
      draft.revenue_share_pct === "" ? null : Number(draft.revenue_share_pct);
    if (pct != null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      Toast.show({
        type: "error",
        text1: "El % de ingresos debe estar entre 0 y 100",
        position: "bottom",
      });
      return;
    }
    try {
      const value = {
        coach_id: draft.coach_id,
        monthly_fee: draft.monthly_fee,
        revenue_share_pct: draft.revenue_share_pct,
        rate_per_class: draft.rate_per_class,
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
        text1: "No se pudo guardar el coach",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  const del = async (row) => {
    confirmDelete(fullName(row.coach), async () => {
      try {
        await remove.mutateAsync(row.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (draft?.id === row.id) close();
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "No se pudo quitar",
          text2: error.message ?? "Intentá de nuevo.",
          position: "bottom",
        });
      }
    });
  };

  const saving = create.isPending || update.isPending;

  return (
    <View className="gap-3">
      {/* Header de sección */}
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
          Coaches
        </Text>
        {!draft && (
          <Pressable
            onPress={openNew}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-brandPrimary-600 active:scale-95"
            style={{ cursor: "pointer" }}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-[12px] font-manrope-bold text-white">
              Asignar coach
            </Text>
          </Pressable>
        )}
      </View>

      {/* Editor inline */}
      {draft && (
        <View className="gap-3 bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
              {draft.id ? "Editar coach" : "Asignar coach"}
            </Text>
            <Pressable onPress={close} style={{ cursor: "pointer" }}>
              <X size={16} color={ui.text.muted} />
            </Pressable>
          </View>

          {/* Coach (chips de staff; al editar queda fijo) */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Coach
            </Text>
            {staff.length === 0 ? (
              <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                No hay coaches en este gimnasio todavía.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {staff
                  .filter(
                    (s) => draft.id
                      ? s.id === draft.coach_id
                      : !assignedIds.has(s.id)
                  )
                  .map((s) => {
                    const selected = draft.coach_id === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        disabled={!!draft.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraft((d) => ({
                            ...d,
                            coach_id: selected ? null : s.id,
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
                          {fullName(s)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Esquema de pago (los tres campos son opcionales y combinables) */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Fijo mensual
            </Text>
            <StyledTextInput
              value={draft.monthly_fee}
              onChangeText={(t) => setDraft((d) => ({ ...d, monthly_fee: t }))}
              placeholder="0.00 (opcional)"
              keyboardType="decimal-pad"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              % de los ingresos de la actividad
            </Text>
            <StyledTextInput
              value={draft.revenue_share_pct}
              onChangeText={(t) =>
                setDraft((d) => ({ ...d, revenue_share_pct: t }))
              }
              placeholder="Ej: 10 (opcional)"
              keyboardType="decimal-pad"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Tarifa por clase dictada
            </Text>
            <StyledTextInput
              value={draft.rate_per_class}
              onChangeText={(t) =>
                setDraft((d) => ({ ...d, rate_per_class: t }))
              }
              placeholder="0.00 (opcional)"
              keyboardType="decimal-pad"
            />
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
              Asignación activa
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
                {saving ? "GUARDANDO..." : draft.id ? "GUARDAR" : "ASIGNAR"}
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

      {/* Lista de coaches asignados */}
      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
        </View>
      ) : (coaches?.length ?? 0) === 0 ? (
        !draft && (
          <View className="py-6 items-center bg-ui-input-light/40 dark:bg-ui-input-dark/40 rounded-2xl border border-dashed border-ui-input-border">
            <Users size={22} color={ui.text.muted} />
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center px-6 mt-2">
              Sin coaches asignados. Asigná quién dicta esta actividad y cómo
              cobra para poder calcular sus pagos.
            </Text>
          </View>
        )
      ) : (
        <View className="gap-2">
          {coaches.map((row) => (
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
                    {fullName(row.coach)}
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
                  {schemeSummary(row)}
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
