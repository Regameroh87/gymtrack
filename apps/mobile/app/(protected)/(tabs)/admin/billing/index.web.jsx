import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";

import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useGymSubscriptions } from "../../../../../src/hooks/activities/use-gym-subscriptions";
import { useActivitySubscriptionMutations } from "../../../../../src/hooks/activities/use-activity-subscription-mutations";
import { useGymMembers } from "../../../../../src/hooks/users/use-gym-members";
import { useActivities } from "../../../../../src/hooks/activities/use-activities";
import { paymentBadge, isOverdue } from "@gymtrack/core";

import {
  Receipt,
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle,
  Clock,
  Trash,
  X,
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

export default function BillingWeb() {
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
    return { revenue, total: rows.length, overdue, ok: rows.length - overdue };
  }, [subs]);

  const filtered = useMemo(() => {
    let rows = subs ?? [];
    if (filter === "overdue") rows = rows.filter((r) => isOverdue(r.due_date));
    else if (filter === "ok") rows = rows.filter((r) => !isOverdue(r.due_date));
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => fullName(r.member).toLowerCase().includes(q));
    return rows;
  }, [subs, filter, search]);

  const onRegisterPayment = (sub) =>
    registerPayment.mutate({ id: sub.id, memberId: sub.user_id });

  const onCancel = (sub) => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        `¿Dar de baja la membresía de ${fullName(sub.member)} en ${sub.activities?.name ?? "esta actividad"}?`
      )
    ) {
      cancel.mutate({ id: sub.id, memberId: sub.user_id });
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-end justify-between mb-6">
        <View>
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Administración
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-amber-600 tracking-[1.4px] uppercase">
              Contabilidad
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Membresías y cobranza
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Inscripciones activas, cuotas y estado de pago de tus socios
          </Text>
        </View>

        <Pressable
          onPress={() => setAltaOpen(true)}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Agregar membresía
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={Receipt}
          label="Ingreso mensual"
          value={money(stats.revenue)}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={CheckCircle}
          label="Al día"
          value={stats.ok}
          iconColor="#16a34a"
          bubble="bg-emerald-50"
        />
        <StatCard
          icon={Clock}
          label="Vencidas"
          value={stats.overdue}
          iconColor="#ef4444"
          bubble="bg-red-50"
        />
      </View>

      {/* Toolbar */}
      <View className="flex-row items-center gap-3 mb-5">
        <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
          <Search size={15} color={ui.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar socio..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>
        <View className="flex-row gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`px-3.5 py-2.5 rounded-xl border ${
                  active
                    ? "bg-brandPrimary-600 border-brandPrimary-600"
                    : "bg-white border-ui-input-border hover:bg-brandPrimary-50/60"
                }`}
                style={{ cursor: "pointer" }}
              >
                <Text
                  className={`text-xs font-manrope-semi ${
                    active ? "text-white" : "text-ui-text-muted"
                  }`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
          <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
            Cargando membresías...
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-amber-50 items-center justify-center mb-3">
            <Receipt size={20} color="#d97706" />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search || filter !== "all"
              ? "Sin resultados"
              : "Aún no hay membresías"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search || filter !== "all"
              ? "Probá con otro filtro."
              : "Agregá la primera membresía de un socio."}
          </Text>
        </View>
      ) : (
        <View className="bg-white rounded-[18px] border border-ui-input-border overflow-hidden">
          {filtered.map((sub, i) => (
            <SubRow
              key={sub.id}
              sub={sub}
              last={i === filtered.length - 1}
              brandPrimary={brandPrimary}
              onRegisterPayment={() => onRegisterPayment(sub)}
              onCancel={() => onCancel(sub)}
              busy={registerPayment.isPending || cancel.isPending}
            />
          ))}
        </View>
      )}

      {/* Alta modal */}
      <AltaMembresiaModal
        visible={altaOpen}
        onClose={() => setAltaOpen(false)}
        brandPrimary={brandPrimary}
      />
    </ScrollView>
  );
}

// ── Subcomponents ──

function StatCard({ icon: Icon, label, value, iconColor, bubble }) {
  return (
    <View className="flex-1 flex-row items-center gap-3.5 bg-white rounded-2xl p-4 border border-ui-input-border">
      <View
        className={`w-[42px] h-[42px] rounded-xl items-center justify-center ${bubble}`}
      >
        <Icon size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[22px] font-jakarta-bold text-ui-text-main tracking-tight"
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text className="text-[11px] font-manrope text-ui-text-muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

function SubRow({ sub, last, brandPrimary, onRegisterPayment, onCancel, busy }) {
  const badge = paymentBadge(sub.due_date);
  const color = sub.activities?.color ?? brandPrimary[600];
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        last ? "" : "border-b border-ui-input-border"
      }`}
    >
      {/* Socio */}
      <View className="flex-row items-center gap-3 flex-1 min-w-0">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Flame size={18} color={color} />
        </View>
        <View className="flex-1 min-w-0">
          <Text
            className="text-[14px] font-jakarta-bold text-ui-text-main capitalize"
            numberOfLines={1}
          >
            {fullName(sub.member)}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted" numberOfLines={1}>
            {sub.activities?.name ?? "Actividad"} · {sub.activity_plans?.label ?? "Pase"} ·{" "}
            {freqText(sub.activity_plans?.frequency_per_week)}
          </Text>
        </View>
      </View>

      {/* Cuota */}
      <Text className="text-[14px] font-jakarta-bold text-ui-text-main w-28 text-right">
        {money(sub.price)}
        <Text className="text-[10px] font-manrope text-ui-text-muted">/mes</Text>
      </Text>

      {/* Estado de pago */}
      <View className="w-32 items-center">
        <View className={`px-2 py-0.5 rounded-md ${badge.chip}`}>
          <Text
            className={`text-[9px] font-manrope-bold tracking-wider uppercase ${badge.text}`}
          >
            {badge.label}
          </Text>
        </View>
        <Text className="text-[10px] font-manrope text-ui-text-muted mt-0.5">
          vence {formatDate(sub.due_date)}
        </Text>
      </View>

      {/* Acciones */}
      <View className="flex-row items-center gap-2 w-44 justify-end">
        <Pressable
          disabled={busy}
          onPress={onRegisterPayment}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/15"
          style={{ cursor: "pointer" }}
        >
          <Receipt size={13} color="#16a34a" />
          <Text className="text-[11px] font-manrope-semi text-green-600">
            Registrar pago
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onCancel}
          className="p-2 rounded-lg bg-red-100 hover:bg-red-200/70"
          style={{ cursor: "pointer" }}
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

// Modal de alta: socio → actividad → pase.
function AltaMembresiaModal({ visible, onClose, brandPrimary }) {
  const { data: members, isLoading: membersLoading } = useGymMembers({
    onlyRole: "member",
  });
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { assign } = useActivitySubscriptionMutations();

  const [memberSearch, setMemberSearch] = useState("");
  const [pickedMember, setPickedMember] = useState(null);
  const [pickedActivity, setPickedActivity] = useState(null);

  const reset = () => {
    setMemberSearch("");
    setPickedMember(null);
    setPickedActivity(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const assignableActivities = (activities ?? []).filter(
    (a) => a.is_active && (a.activity_plans ?? []).some((p) => p.is_active)
  );

  const filteredMembers = (members ?? []).filter((m) =>
    fullName(m).toLowerCase().includes(memberSearch.trim().toLowerCase())
  );

  const onPickPass = (pass) => {
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
    step === 1
      ? "Elegí el socio"
      : step === 2
        ? `Actividad · ${fullName(pickedMember)}`
        : `Pase · ${pickedActivity.name}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <Pressable
        className="flex-1 bg-black/40 items-center justify-center"
        onPress={close}
      >
        <Pressable
          className="bg-white rounded-2xl w-[460px] max-h-[80%] overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-ui-input-border">
            <View className="flex-row items-center gap-2">
              {step > 1 && (
                <Pressable
                  onPress={() =>
                    step === 3 ? setPickedActivity(null) : setPickedMember(null)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <ChevronLeft size={20} color={ui.text.muted} />
                </Pressable>
              )}
              <Text className="text-[16px] font-jakarta-bold text-ui-text-main">
                {title}
              </Text>
            </View>
            <Pressable onPress={close} style={{ cursor: "pointer" }}>
              <X size={18} color={ui.text.muted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 14 }}>
            {/* Paso 1: socio */}
            {step === 1 &&
              (membersLoading ? (
                <Loading color={brandPrimary[600]} />
              ) : (
                <>
                  <View className="flex-row items-center gap-2.5 bg-ui-background-light rounded-xl px-3.5 py-2.5 border border-ui-input-border mb-3">
                    <Search size={15} color={ui.text.muted} />
                    <TextInput
                      value={memberSearch}
                      onChangeText={setMemberSearch}
                      placeholder="Buscar socio..."
                      placeholderTextColor={ui.text.muted}
                      className="flex-1 text-[13px] font-manrope text-ui-text-main"
                      style={{ outlineWidth: 0 }}
                    />
                  </View>
                  {filteredMembers.length === 0 ? (
                    <Empty text="No hay socios para mostrar." />
                  ) : (
                    filteredMembers.map((m) => (
                      <PickRow
                        key={m.id}
                        title={fullName(m)}
                        subtitle={m.email}
                        onPress={() => setPickedMember(m)}
                      />
                    ))
                  )}
                </>
              ))}

            {/* Paso 2: actividad */}
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

            {/* Paso 3: pase */}
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
      className="flex-row items-center gap-3 p-3 mb-2 rounded-xl border border-ui-input-border bg-white hover:border-brandPrimary-600/30"
      style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: color ? `${color}1A` : "#eef" }}
      >
        <Flame size={16} color={color ?? "#4A44E4"} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[14px] font-jakarta-semi text-ui-text-main capitalize" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-[11px] font-manrope text-ui-text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={15} color={ui.text.muted} />
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
    <View className="py-10 items-center">
      <Text className="text-xs font-manrope text-ui-text-muted">{text}</Text>
    </View>
  );
}
