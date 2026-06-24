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
import { useActivityPlans } from "../../hooks/activities/use-activities";
import { useActivityPlanMutations } from "../../hooks/activities/use-activity-plan-mutations";
import { FREQUENCY_OPTIONS } from "../../constants/activity-options";
import { Plus, Pencil, Trash, X } from "../../../assets/icons";
import { ui } from "@gymtrack/core/colors";

const EMPTY = { id: null, label: "", frequency_per_week: null, price: "", is_active: true };

const formatPrice = (price) =>
  price == null ? "Sin precio" : `$${Number(price).toLocaleString("es-AR")}`;

const freqLabel = (f) =>
  f == null ? "Libre" : `${f} ${f === 1 ? "vez" : "veces"}/semana`;

// Confirmación cross-platform (web usa window.confirm; nativo, un flujo simple).
const confirmDelete = (label, onConfirm) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`¿Eliminar el pase "${label}"?`)) {
      onConfirm();
    }
  } else {
    // En nativo se resuelve con el botón de borrar del editor; acá confirmamos directo.
    onConfirm();
  }
};

export default function ActivityPlansManager({ activityId }) {
  const { data: plans, isLoading } = useActivityPlans(activityId);
  const { create, update, remove } = useActivityPlanMutations(activityId);

  // null = sin editor abierto; objeto = editando (id null ⇒ nuevo).
  const [draft, setDraft] = useState(null);

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({ ...EMPTY });
  };
  const openEdit = (plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft({
      id: plan.id,
      label: plan.label ?? "",
      frequency_per_week: plan.frequency_per_week ?? null,
      price: plan.price == null ? "" : String(plan.price),
      is_active: plan.is_active ?? true,
    });
  };
  const close = () => setDraft(null);

  const pickFrequency = (opt) => {
    setDraft((d) => ({
      ...d,
      frequency_per_week: opt.value,
      // Autocompleta el nombre si estaba vacío.
      label: d.label?.trim() ? d.label : opt.label,
    }));
  };

  const save = async () => {
    const label = (draft.label || "").trim();
    if (label.length < 2) {
      Toast.show({
        type: "error",
        text1: "Falta el nombre del pase",
        position: "bottom",
      });
      return;
    }
    try {
      if (draft.id) {
        await update.mutateAsync({
          id: draft.id,
          label,
          frequency_per_week: draft.frequency_per_week,
          price: draft.price,
          is_active: draft.is_active,
        });
      } else {
        await create.mutateAsync({
          label,
          frequency_per_week: draft.frequency_per_week,
          price: draft.price,
          is_active: draft.is_active,
          sort_order: plans?.length ?? 0,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "No se pudo guardar el pase",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  const del = async (plan) => {
    confirmDelete(plan.label, async () => {
      try {
        await remove.mutateAsync(plan.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (draft?.id === plan.id) close();
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "No se pudo eliminar",
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
          Pases
        </Text>
        {!draft && (
          <Pressable
            onPress={openNew}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-brandPrimary-600 active:scale-95"
            style={{ cursor: "pointer" }}
          >
            <Plus size={14} color="#fff" />
            <Text className="text-[12px] font-manrope-bold text-white">
              Agregar pase
            </Text>
          </Pressable>
        )}
      </View>

      {/* Editor inline */}
      {draft && (
        <View className="gap-3 bg-ui-input-light dark:bg-ui-input-dark border border-ui-input-border rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
              {draft.id ? "Editar pase" : "Nuevo pase"}
            </Text>
            <Pressable onPress={close} style={{ cursor: "pointer" }}>
              <X size={16} color={ui.text.muted} />
            </Pressable>
          </View>

          {/* Frecuencia (chips) */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Frecuencia
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((opt) => {
                const selected = draft.frequency_per_week === opt.value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => pickFrequency(opt)}
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
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Nombre del pase */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Nombre del pase
            </Text>
            <StyledTextInput
              value={draft.label}
              onChangeText={(t) => setDraft((d) => ({ ...d, label: t }))}
              placeholder="Ej: 3 veces/semana"
            />
          </View>

          {/* Precio */}
          <View className="gap-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
              Precio mensual
            </Text>
            <StyledTextInput
              value={draft.price}
              onChangeText={(t) => setDraft((d) => ({ ...d, price: t }))}
              placeholder="0.00"
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
              Pase activo
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

      {/* Lista de pases */}
      {isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color="#4A44E4" />
        </View>
      ) : (plans?.length ?? 0) === 0 ? (
        !draft && (
          <View className="py-6 items-center bg-ui-input-light/40 dark:bg-ui-input-dark/40 rounded-2xl border border-dashed border-ui-input-border">
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center px-6">
              Aún no hay pases. Agregá el primero (ej. 2 veces/semana) para poder
              vender esta actividad.
            </Text>
          </View>
        )
      ) : (
        <View className="gap-2">
          {plans.map((plan) => (
            <View
              key={plan.id}
              className="flex-row items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5"
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
                    numberOfLines={1}
                  >
                    {plan.label}
                  </Text>
                  {!plan.is_active && (
                    <View className="bg-ui-input-light dark:bg-ui-input-dark px-1.5 py-0.5 rounded">
                      <Text className="text-[9px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
                        Inactivo
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                  {freqLabel(plan.frequency_per_week)} · {formatPrice(plan.price)}
                  <Text className="text-ui-text-muted dark:text-ui-text-mutedDark">
                    /mes
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => openEdit(plan)}
                  className="p-2.5 bg-brandPrimary-100 dark:bg-brandPrimary-900/30 rounded-xl active:scale-95"
                  style={{ cursor: "pointer" }}
                >
                  <Pencil size={15} color="#3b82f6" />
                </Pressable>
                <Pressable
                  onPress={() => del(plan)}
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
