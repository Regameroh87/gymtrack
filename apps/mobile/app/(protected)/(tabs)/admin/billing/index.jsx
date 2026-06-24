import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Screen from "../../../../../src/components/Screen";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useGymSubscriptions } from "../../../../../src/hooks/activities/use-gym-subscriptions";
import { useActivitySubscriptionMutations } from "../../../../../src/hooks/activities/use-activity-subscription-mutations";
import { useGymMembers } from "../../../../../src/hooks/users/use-gym-members";
import { useActivities } from "../../../../../src/hooks/activities/use-activities";
import { paymentBadge, isOverdue } from "@gymtrack/core";
import {
  Receipt,
  Plus,
  Search,
  Flame,
  Trash,
  ChevronRight,
  ChevronLeft,
} from "../../../../../assets/icons";

const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const fullName = (p) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Socio";
const freqText = (f) => (f == null ? "Libre" : `${f}x/sem`);
const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
};

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "ok", label: "Al día" },
  { key: "overdue", label: "Vencidas" },
];

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [altaOpen, setAltaOpen] = useState(false);

  const { data: subs, isLoading } = useGymSubscriptions();
  const { registerPayment, cancel } = useActivitySubscriptionMutations();

  const stats = useMemo(() => {
    const rows = subs ?? [];
    const revenue = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const overdue = rows.filter((r) => isOverdue(r.due_date)).length;
    return { revenue, overdue, ok: rows.length - overdue };
  }, [subs]);

  const filtered = useMemo(() => {
    let rows = subs ?? [];
    if (filter === "overdue") rows = rows.filter((r) => isOverdue(r.due_date));
    else if (filter === "ok") rows = rows.filter((r) => !isOverdue(r.due_date));
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => fullName(r.member).toLowerCase().includes(q));
    return rows;
  }, [subs, filter, search]);

  const onRegisterPayment = (sub) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    registerPayment.mutate({ id: sub.id, memberId: sub.user_id });
  };

  const onCancel = (sub) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Dar de baja",
      `¿Dar de baja la membresía de ${fullName(sub.member)} en ${sub.activities?.name ?? "esta actividad"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Dar de baja",
          style: "destructive",
          onPress: () => cancel.mutate({ id: sub.id, memberId: sub.user_id }),
        },
      ]
    );
  };

  return (
    <Screen safe={Platform.OS === "android"}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4 flex-row items-end justify-between">
          <View>
            <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-amber-600">
              Contabilidad
            </Text>
            <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
              Membresías
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAltaOpen(true);
            }}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brandPrimary-600 active:opacity-80"
          >
            <Plus size={15} color="#fff" />
            <Text className="text-[12px] font-manrope-bold text-white">Agregar</Text>
          </Pressable>
        </View>

        {/* Resumen */}
        <View className="flex-row gap-2.5 px-6 mb-4">
          <MiniStat label="Ingreso/mes" value={money(stats.revenue)} tone="text-ui-text-main dark:text-ui-text-mainDark" />
          <MiniStat label="Al día" value={stats.ok} tone="text-green-600" />
          <MiniStat label="Vencidas" value={stats.overdue} tone="text-red-500" />
        </View>

        {/* Filtros */}
        <View className="flex-row gap-2 px-6 mb-3">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  active
                    ? "bg-brandPrimary-600 border-brandPrimary-600"
                    : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                }`}
              >
                <Text
                  className={`text-[12px] font-manrope-semi ${
                    active ? "text-white" : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Buscador */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center gap-2.5 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl px-3.5 py-2.5 border border-ui-input-border">
            <Search size={15} color={ui.text.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar socio..."
              placeholderTextColor={ui.text.muted}
              className="flex-1 text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
            />
          </View>
        </View>

        {/* Lista */}
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color={brandPrimary[600]} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="mx-6 py-12 items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-dashed border-ui-input-border rounded-2xl">
            <Receipt size={36} color={ui.text.muted} />
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mt-3 px-8">
              {search || filter !== "all"
                ? "Sin resultados con este filtro."
                : "Agregá la primera membresía de un socio."}
            </Text>
          </View>
        ) : (
          <View className="px-6 gap-2.5">
            {filtered.map((sub) => (
              <SubRow
                key={sub.id}
                sub={sub}
                brandPrimary={brandPrimary}
                onRegisterPayment={() => onRegisterPayment(sub)}
                onCancel={() => onCancel(sub)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AltaMembresiaModal
        visible={altaOpen}
        onClose={() => setAltaOpen(false)}
        brandPrimary={brandPrimary}
        insets={insets}
      />
    </Screen>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <View className="flex-1 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3">
      <Text className={`text-[17px] font-jakarta-bold ${tone}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
        {label}
      </Text>
    </View>
  );
}

function SubRow({ sub, brandPrimary, onRegisterPayment, onCancel }) {
  const badge = paymentBadge(sub.due_date);
  const color = sub.activities?.color ?? brandPrimary[600];
  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5">
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Flame size={18} color={color} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
            numberOfLines={1}
          >
            {fullName(sub.member)}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark" numberOfLines={1}>
            {sub.activities?.name ?? "Actividad"} · {sub.activity_plans?.label ?? "Pase"} · {money(sub.price)}/mes
          </Text>
        </View>
        <View className={`px-2 py-0.5 rounded-md ${badge.chip}`}>
          <Text className={`text-[9px] font-manrope-bold uppercase tracking-wider ${badge.text}`}>
            {badge.label}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
          Vence {formatDate(sub.due_date)}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onRegisterPayment}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 active:scale-95"
          >
            <Receipt size={13} color="#16a34a" />
            <Text className="text-[11px] font-manrope-semi text-green-600">Registrar pago</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 active:scale-95"
          >
            <Trash size={14} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function AltaMembresiaModal({ visible, onClose, brandPrimary, insets }) {
  const { data: members, isLoading: membersLoading } = useGymMembers({ onlyRole: "member" });
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { assign } = useActivitySubscriptionMutations();

  const [pickedMember, setPickedMember] = useState(null);
  const [pickedActivity, setPickedActivity] = useState(null);

  const close = () => {
    setPickedMember(null);
    setPickedActivity(null);
    onClose();
  };

  const assignableActivities = (activities ?? []).filter(
    (a) => a.is_active && (a.activity_plans ?? []).some((p) => p.is_active)
  );

  const onPickPass = (pass) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    assign.mutate(
      {
        memberId: pickedMember.id,
        activityId: pickedActivity.id,
        activityPlanId: pass.id,
        price: pass.price,
      },
      { onSuccess: close }
    );
  };

  const step = !pickedMember ? 1 : !pickedActivity ? 2 : 3;
  const title =
    step === 1 ? "Elegí el socio" : step === 2 ? "Elegí la actividad" : "Elegí el pase";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={close}>
        <Pressable
          className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl max-h-[78%]"
          style={{ paddingBottom: insets.bottom + 12 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-ui-input-border" />
          </View>
          <View className="flex-row items-center px-6 pt-2 pb-3 gap-2">
            {step > 1 && (
              <Pressable
                onPress={() => (step === 3 ? setPickedActivity(null) : setPickedMember(null))}
                className="p-1 -ml-1"
              >
                <ChevronLeft size={20} color={ui.text.muted} />
              </Pressable>
            )}
            <Text className="text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
              {title}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 1 &&
              (membersLoading ? (
                <Loading color={brandPrimary[600]} />
              ) : (members ?? []).length === 0 ? (
                <Empty text="No hay socios para mostrar." />
              ) : (
                members.map((m) => (
                  <PickRow key={m.id} title={fullName(m)} subtitle={m.email} onPress={() => setPickedMember(m)} />
                ))
              ))}

            {step === 2 &&
              (activitiesLoading ? (
                <Loading color={brandPrimary[600]} />
              ) : assignableActivities.length === 0 ? (
                <Empty text="No hay actividades con pases activos." />
              ) : (
                assignableActivities.map((a) => (
                  <PickRow
                    key={a.id}
                    color={a.color ?? brandPrimary[600]}
                    title={a.name}
                    subtitle={`${(a.activity_plans ?? []).filter((p) => p.is_active).length} pases`}
                    onPress={() => setPickedActivity(a)}
                  />
                ))
              ))}

            {step === 3 &&
              (pickedActivity.activity_plans ?? [])
                .filter((p) => p.is_active)
                .map((pass) => (
                  <PickRow
                    key={pass.id}
                    color={pickedActivity.color ?? brandPrimary[600]}
                    title={pass.label}
                    subtitle={`${freqText(pass.frequency_per_week)} · ${money(pass.price)}/mes`}
                    disabled={assign.isPending}
                    onPress={() => onPickPass(pass)}
                  />
                ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickRow({ title, subtitle, color, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="mx-5 mb-2.5 flex-row items-center p-3.5 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-80"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: color ? `${color}1A` : "#eef" }}
      >
        <Flame size={18} color={color ?? "#4A44E4"} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={ui.text.muted} />
    </Pressable>
  );
}

function Loading({ color }) {
  return (
    <View className="py-10 items-center">
      <ActivityIndicator size="small" color={color} />
    </View>
  );
}

function Empty({ text }) {
  return (
    <View className="py-10 items-center px-10">
      <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
        {text}
      </Text>
    </View>
  );
}
