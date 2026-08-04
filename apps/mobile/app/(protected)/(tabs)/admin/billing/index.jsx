import { useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import Screen from "../../../../../src/components/Screen";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useGymSubscriptions } from "@gymtrack/core/hooks/activities/use-gym-subscriptions";
import { useSubscriptionPayments } from "@gymtrack/core/hooks/activities/use-subscription-payments";
import { useActivitySubscriptionMutations } from "../../../../../src/hooks/activities/use-activity-subscription-mutations";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { useAuth } from "../../../../../src/auth/lib/getSession";
import { useGymPermissions } from "../../../../../src/hooks/shared/use-gym-permissions";
import { isAdminRole } from "../../../../../src/constants/roles";
import { useGymMembers } from "@gymtrack/core/hooks/users/use-gym-members";
import { useActivities } from "@gymtrack/core/hooks/activities/use-activities";
import { PERMISSIONS } from "@gymtrack/core/permissions";
import { useBillingSettings } from "@gymtrack/core/hooks/activities/use-billing-settings";
import { paymentBadge, isOverdue } from "@gymtrack/core";
import {
  owedPeriods,
  periodAt,
  cycleIndexAt,
  periodLabel,
} from "@gymtrack/core/billing-period";
import {
  Receipt,
  Plus,
  Search,
  Flame,
  Trash,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  CheckCircle,
  Clock,
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

const todayISO = () => new Date().toISOString().slice(0, 10);

// Los ciclos que un socio debe. Es solo para pintar la lista y el contador — la
// plata la calcula el RPC — pero tiene que dar exactamente lo mismo que él, o la
// pantalla ofrece un período que después no se cobra. Por eso sale de core y no
// se recalcula acá.
const owed = (sub, dueDayIsCovered) =>
  owedPeriods(sub.start_date, sub.due_date, todayISO(), dueDayIsCovered);

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "ok", label: "Al día" },
  { key: "overdue", label: "Vencidas" },
];

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { userId: myProfileId } = useAuth();
  const { role, can } = useGymPermissions();
  // Un coach puede llegar acá solo con grant de cobro: ve registrar pago, pero no
  // la gestión de altas/bajas de membresía (rol admin; la RLS igual la corta).
  const canVoidAny = can(PERMISSIONS.PAYMENTS_VOID);
  const canRegister = can(PERMISSIONS.PAYMENTS_REGISTER);
  const canManage = isAdminRole(role);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [altaOpen, setAltaOpen] = useState(false);
  const [payingSub, setPayingSub] = useState(null);
  const [detailSub, setDetailSub] = useState(null);

  const { data: subs, isLoading } = useGymSubscriptions(gymId);
  const { data: billing } = useBillingSettings(gymId);
  const { cancel } = useActivitySubscriptionMutations();

  // Qué pasa el día exacto del vencimiento lo decide el gym. Se baja una sola vez
  // acá y se pasa hacia abajo: si cada fila lo resolviera por su cuenta, alcanza
  // con que una se olvide para que la lista se contradiga a sí misma.
  const dueDayIsCovered = billing?.dueDayIsCovered === true;

  const stats = useMemo(() => {
    const rows = subs ?? [];
    const revenue = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const overdue = rows.filter((r) =>
      isOverdue(r.due_date, dueDayIsCovered)
    ).length;
    return { revenue, overdue, ok: rows.length - overdue };
  }, [subs, dueDayIsCovered]);

  const filtered = useMemo(() => {
    let rows = subs ?? [];
    if (filter === "overdue")
      rows = rows.filter((r) => isOverdue(r.due_date, dueDayIsCovered));
    else if (filter === "ok")
      rows = rows.filter((r) => !isOverdue(r.due_date, dueDayIsCovered));
    const q = search.trim().toLowerCase();
    if (q)
      rows = rows.filter((r) => fullName(r.member).toLowerCase().includes(q));
    return rows;
  }, [subs, filter, search, dueDayIsCovered]);

  const onRegisterPayment = (sub) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayingSub(sub);
  };

  const onDetail = (sub) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailSub(sub);
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
          {canManage && (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/admin/billing/coaches");
                }}
                className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border active:opacity-80"
              >
                <Users size={15} color={brandPrimary[600]} />
                <Text className="text-[12px] font-manrope-bold text-ui-text-main dark:text-ui-text-mainDark">
                  Coaches
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAltaOpen(true);
                }}
                className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brandPrimary-600 active:opacity-80"
              >
                <Plus size={15} color="#fff" />
                <Text className="text-[12px] font-manrope-bold text-white">
                  Agregar
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Resumen */}
        <View className="flex-row gap-2.5 px-6 mb-4">
          <MiniStat
            label="Ingreso/mes"
            value={money(stats.revenue)}
            tone="text-ui-text-main dark:text-ui-text-mainDark"
          />
          <MiniStat label="Al día" value={stats.ok} tone="text-green-600" />
          <MiniStat
            label="Vencidas"
            value={stats.overdue}
            tone="text-red-500"
          />
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
                    active
                      ? "text-white"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
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
                canRegister={canRegister}
                canManage={canManage}
                onRegisterPayment={() => onRegisterPayment(sub)}
                onDetail={() => onDetail(sub)}
                onCancel={() => onCancel(sub)}
                dueDayIsCovered={dueDayIsCovered}
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

      <RegistrarPagoModal
        sub={payingSub}
        onClose={() => setPayingSub(null)}
        brandPrimary={brandPrimary}
        insets={insets}
        dueDayIsCovered={dueDayIsCovered}
      />

      <DetallePagosModal
        sub={detailSub}
        onClose={() => setDetailSub(null)}
        brandPrimary={brandPrimary}
        insets={insets}
        canVoidAny={canVoidAny}
        myProfileId={myProfileId}
      />
    </Screen>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <View className="flex-1 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3">
      <Text
        className={`text-[17px] font-jakarta-bold ${tone}`}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
        {label}
      </Text>
    </View>
  );
}

function SubRow({
  sub,
  brandPrimary,
  canRegister,
  canManage,
  onRegisterPayment,
  onDetail,
  onCancel,
  dueDayIsCovered,
}) {
  const badge = paymentBadge(sub.due_date, dueDayIsCovered);
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
          <Text
            className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
            numberOfLines={1}
          >
            {sub.activities?.name ?? "Actividad"} ·{" "}
            {sub.activity_plans?.label ?? "Pase"} · {money(sub.price)}/mes
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

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
          Vence {formatDate(sub.due_date)}
        </Text>
        <View className="flex-row items-center gap-2">
          {canRegister && (
            <Pressable
              onPress={onRegisterPayment}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 active:scale-95"
            >
              <Receipt size={13} color="#16a34a" />
              <Text className="text-[11px] font-manrope-semi text-green-600">
                Registrar pago
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={onDetail}
            className="p-2 rounded-lg bg-brandPrimary-50 dark:bg-brandPrimary-900/30 active:scale-95"
          >
            <Clock size={14} color={brandPrimary[600]} />
          </Pressable>
          {canManage && (
            <Pressable
              onPress={onCancel}
              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 active:scale-95"
            >
              <Trash size={14} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// Alta: socio → actividad → pase → primer ciclo.
//
// El cuarto paso existe porque el alta ya no puede dar por cobrado el primer
// ciclo. La membresía se crea SIEMPRE debiendo; cobrarlo es una decisión explícita
// del staff y va por el mismo RPC que el resto de los cobros. "Dejar pendiente" es
// una salida de primera clase: sirve para el socio que se anota hoy y paga mañana,
// que antes no se podía representar.
//
// El día del alta fija el ancla de cobro del socio para siempre, así que el paso
// muestra el ciclo completo y no solo el precio.
function AltaMembresiaModal({ visible, onClose, brandPrimary, insets }) {
  const { gymId } = useActiveGym();
  const { user } = useAuth();
  const { data: members, isLoading: membersLoading } = useGymMembers(
    gymId,
    user?.user_id ?? null,
    { onlyRole: "member" }
  );
  const { data: activities, isLoading: activitiesLoading } =
    useActivities(gymId);
  const { assign, registerPayment } = useActivitySubscriptionMutations();

  const [pickedMember, setPickedMember] = useState(null);
  const [pickedActivity, setPickedActivity] = useState(null);
  const [pickedPass, setPickedPass] = useState(null);
  const [amount, setAmount] = useState("");

  const today = todayISO();
  // El ciclo que la membresía va a deber al crearse: arranca hoy y dura un mes.
  const primerCiclo = periodAt(today, 0);
  const busy = assign.isPending || registerPayment.isPending;

  const close = () => {
    setPickedMember(null);
    setPickedActivity(null);
    setPickedPass(null);
    setAmount("");
    onClose();
  };

  const assignableActivities = (activities ?? []).filter(
    (a) => a.is_active && (a.activity_plans ?? []).some((p) => p.is_active)
  );

  const onPickPass = (pass) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickedPass(pass);
    // El primer ciclo es un mes completo (del día del alta al mismo día del mes
    // que viene), así que el sugerido es el precio del pase. Editable igual.
    setAmount(pass.price == null ? "" : String(pass.price));
  };

  // Alta + (opcional) cobro del primer ciclo. Son dos escrituras, no una
  // transacción, y el orden importa: si el alta entra y el cobro falla, queda una
  // membresía real marcada como impaga, visible en la lista y con su botón de
  // cobro al lado. El caso feo —cobro sin alta— no puede pasar, porque el cobro
  // necesita el id que devuelve el alta.
  const darDeAlta = (charge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    assign.mutate(
      {
        memberId: pickedMember.id,
        activityId: pickedActivity.id,
        activityPlanId: pickedPass.id,
        price: pickedPass.price,
      },
      {
        onSuccess: ({ id, period: debe }) => {
          if (!charge) {
            close();
            return;
          }
          registerPayment.mutate(
            {
              id,
              // Un ciclo, el que acaba de quedar debiendo: el RPC arranca siempre
              // en el vencimiento actual.
              months: 1,
              price: amount === "" ? null : amount,
              memberId: pickedMember.id,
            },
            {
              onSuccess: close,
              // El alta ya entró: cerrar igual. Dejarlo abierto invitaría a darla
              // de alta dos veces, y el cobro se reintenta desde la lista.
              onError: (error) => {
                close();
                Alert.alert(
                  "Membresía creada, sin cobrar",
                  `No se pudo cobrar el primer ciclo: ${error.message}\n\nQueda debiendo ${periodLabel(debe.start, debe.end)}.`
                );
              },
            }
          );
        },
        onError: (error) =>
          Alert.alert("No se pudo agregar la membresía", error.message),
      }
    );
  };

  const step = !pickedMember
    ? 1
    : !pickedActivity
      ? 2
      : !pickedPass
        ? 3
        : 4;
  const title =
    step === 1
      ? "Elegí el socio"
      : step === 2
        ? "Elegí la actividad"
        : step === 3
          ? "Elegí el pase"
          : "Primer ciclo";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
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
                disabled={busy}
                onPress={() => {
                  if (step === 4) setPickedPass(null);
                  else if (step === 3) setPickedActivity(null);
                  else setPickedMember(null);
                }}
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
                  <PickRow
                    key={m.id}
                    title={fullName(m)}
                    subtitle={m.email}
                    onPress={() => setPickedMember(m)}
                  />
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
                    onPress={() => onPickPass(pass)}
                  />
                ))}

            {/* Paso 4: primer mes — cobrarlo o dejarlo pendiente */}
            {step === 4 && (
              <View className="px-6">
                <Text className="text-[13px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize">
                  {fullName(pickedMember)}
                </Text>
                <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-4">
                  {pickedActivity.name ?? "Actividad"} ·{" "}
                  {pickedPass.label ?? "Pase"}
                </Text>

                {/* El día del alta fija el día de cobro del socio para siempre,
                    así que conviene que el staff lo vea antes de confirmar y no
                    lo descubra el mes que viene. */}
                <View className="flex-row gap-2.5 items-start rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark px-3.5 py-3 mb-4">
                  <Calendar size={15} color={ui.text.muted} />
                  <Text className="flex-1 text-[12px] leading-[18px] font-manrope text-ui-text-main dark:text-ui-text-mainDark">
                    La membresía arranca debiendo el ciclo{" "}
                    <Text className="font-manrope-bold">
                      {periodLabel(primerCiclo.start, primerCiclo.end)}
                    </Text>
                    , y de ahí en más vence todos los {Number(today.slice(8, 10))} de
                    cada mes. Si ya pagó, cobralo acá; si no, queda pendiente y lo
                    cobrás después con el botón de cobro.
                  </Text>
                </View>

                {/* Monto */}
                <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
                  Monto
                </Text>
                <View className="flex-row items-center gap-2 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl px-3.5 py-3 border border-ui-input-border">
                  <Text className="text-[14px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark">
                    $
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={ui.text.muted}
                    className="flex-1 text-[14px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
                  />
                </View>
                <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1.5 mb-5">
                  Precio del pase. El ciclo es un mes completo.
                </Text>

                <Pressable
                  onPress={() => darDeAlta(true)}
                  disabled={busy}
                  className="items-center py-3.5 rounded-2xl bg-brandPrimary-600 active:opacity-80"
                  style={{ opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-[14px] font-manrope-bold text-white">
                      Dar de alta y cobrar {money(amount)}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => darDeAlta(false)}
                  disabled={busy}
                  className="items-center py-3 mt-2 active:opacity-70"
                  style={{ opacity: busy ? 0.6 : 1 }}
                >
                  <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                    Dar de alta sin cobrar
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickRow({ title, subtitle, color, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-5 mb-2.5 flex-row items-center p-3.5 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-80"
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: color ? `${color}1A` : "#eef" }}
      >
        <Flame size={18} color={color ?? "#4A44E4"} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
            numberOfLines={1}
          >
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

// Modal de cobro: el admin elige CUÁNTOS ciclos abona. Arranca en el vencimiento
// actual y avanza sin huecos — se pueden saldar varios ciclos atrasados de una, o
// adelantar si el socio está al día.
//
// Antes acá había un carrusel donde se elegía cualquier mes, y era un agujero: la
// deuda se deriva de due_date, así que cobrar un ciclo salteado empujaba el
// vencimiento hacia adelante y hacía desaparecer los del medio. No quedaban
// impagos, dejaban de existir. Por eso la selección es un prefijo: tocar un ciclo
// marca ese y todos los anteriores. Web ya funcionaba así.
function RegistrarPagoModal({ sub, onClose, brandPrimary, insets, dueDayIsCovered }) {
  const { registerPayment } = useActivitySubscriptionMutations();
  const [count, setCount] = useState(1);
  const [amount, setAmount] = useState("");

  // Los ciclos adeudados más tres por adelantado. Los dos tramos salen de periodAt
  // sobre el mismo ancla, así que el ciclo que muestra la lista es exactamente el
  // que va a cobrar el RPC.
  const { options, debe } = useMemo(() => {
    if (!sub) return { options: [], debe: 0 };
    const vencidos = owed(sub, dueDayIsCovered);
    const anchor = sub.start_date ?? todayISO();
    const primeroK = vencidos.length
      ? cycleIndexAt(anchor, vencidos[vencidos.length - 1].start) + 1
      : cycleIndexAt(anchor, sub.due_date ?? todayISO());
    const adelantados = [];
    for (let i = 0; i < 3; i += 1) adelantados.push(periodAt(anchor, primeroK + i));
    return {
      debe: vencidos.length,
      options: [...vencidos, ...adelantados].map((p, k) => ({
        ...p,
        overdue: k < vencidos.length,
      })),
    };
  }, [sub, dueDayIsCovered]);

  useEffect(() => {
    if (sub) {
      // Por defecto viene toda la deuda marcada: es lo que se cobra casi siempre.
      setCount(Math.max(owed(sub, dueDayIsCovered).length, 1));
      setAmount(sub.price == null ? "" : String(sub.price));
    }
  }, [sub, dueDayIsCovered]);

  const total = (amount === "" ? 0 : Number(amount)) * count;

  const onConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    registerPayment.mutate(
      {
        id: sub.id,
        months: count,
        price: amount === "" ? null : amount,
        memberId: sub.user_id,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal
      visible={!!sub}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-ui-input-border" />
          </View>

          {sub && (
            <View className="px-6 pt-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
                  Registrar pago
                </Text>
                <Pressable onPress={onClose} className="p-1">
                  <X size={20} color={ui.text.muted} />
                </Pressable>
              </View>
              <Text className="text-[13px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize">
                {fullName(sub.member)}
              </Text>
              <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-4">
                {sub.activities?.name ?? "Actividad"} ·{" "}
                {sub.activity_plans?.label ?? "Pase"}
              </Text>

              {/* Estado de deuda, para que el staff sepa qué está cobrando */}
              {debe > 1 && (
                <View className="flex-row gap-2.5 items-start rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-3 mb-4">
                  <Clock size={15} color="#d97706" />
                  <Text className="flex-1 text-[12px] leading-[18px] font-manrope text-amber-900 dark:text-amber-200">
                    Debe <Text className="font-manrope-bold">{debe} cuotas</Text>. Se
                    cobran desde la más vieja: tocá un ciclo para incluirlo junto con
                    los anteriores.
                  </Text>
                </View>
              )}

              {/* Ciclos que se pagan: selección por prefijo, nunca con huecos */}
              <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
                {debe > 1 ? "Cuotas que paga" : "Cuota que paga"}
              </Text>
              <View className="gap-1.5 mb-4">
                {options.map((opt, k) => {
                  const selected = k < count;
                  return (
                    <Pressable
                      key={opt.start}
                      onPress={() => setCount(k + 1)}
                      className={`flex-row items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
                        selected
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300"
                          : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
                      }`}
                    >
                      {selected ? (
                        <CheckCircle size={15} color="#16a34a" />
                      ) : (
                        <Calendar size={15} color={ui.text.muted} />
                      )}
                      <Text
                        className={`flex-1 text-[13px] font-manrope ${
                          selected
                            ? "font-manrope-semi text-green-900 dark:text-green-200"
                            : "text-ui-text-main dark:text-ui-text-mainDark"
                        }`}
                      >
                        {periodLabel(opt.start, opt.end)}
                      </Text>
                      <Text
                        className={`text-[10px] font-manrope-bold uppercase tracking-wider ${
                          opt.overdue
                            ? "text-amber-600"
                            : "text-ui-text-muted dark:text-ui-text-mutedDark"
                        }`}
                      >
                        {opt.overdue ? "vencida" : "adelanta"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Monto */}
              <Text className="text-[10px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark mb-2">
                Monto por cuota
              </Text>
              <View className="flex-row items-center gap-2 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl px-3.5 py-3 border border-ui-input-border mb-5">
                <Text className="text-[14px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark">
                  $
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={ui.text.muted}
                  className="flex-1 text-[14px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
                />
              </View>

              <Pressable
                onPress={onConfirm}
                disabled={registerPayment.isPending}
                className="items-center py-3.5 rounded-2xl bg-brandPrimary-600 active:opacity-80"
                style={{ opacity: registerPayment.isPending ? 0.6 : 1 }}
              >
                {registerPayment.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-[14px] font-manrope-bold text-white">
                    {count === 1
                      ? `Cobrar ${money(total)} · ${periodLabel(options[0]?.start ?? null, options[0]?.end ?? null)}`
                      : `Cobrar ${money(total)} · ${count} cuotas`}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Modal de detalle: historial de cobros de la suscripción, con el mes que cubre
// cada uno, cuándo se cobró y el monto. Permite anular un cobro (insert-only:
// nunca se edita/borra) si el staff tiene payments.void o registró ese cobro
// hoy mismo (ventana de gracia que valida el RPC).
function DetallePagosModal({
  sub,
  onClose,
  brandPrimary,
  insets,
  canVoidAny,
  myProfileId,
}) {
  const { data: payments, isLoading } = useSubscriptionPayments(
    sub?.id ?? null
  );
  const { voidPayment } = useActivitySubscriptionMutations();
  const [voidingPayment, setVoidingPayment] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState(null);
  const rows = payments ?? [];
  const total = rows
    .filter((p) => !p.voided_at)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const startVoid = (payment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoidError(null);
    setVoidReason("");
    setVoidingPayment(payment);
  };

  const confirmVoid = () => {
    const reason = voidReason.trim();
    if (!reason || !voidingPayment) return;
    setVoidError(null);
    voidPayment.mutate(
      { paymentId: voidingPayment.id, reason, memberId: sub?.user_id },
      {
        onSuccess: () => setVoidingPayment(null),
        onError: (err) =>
          setVoidError(err?.message || "No se pudo anular el pago."),
      }
    );
  };

  return (
    <Modal
      visible={!!sub}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl max-h-[78%]"
          style={{ paddingBottom: insets.bottom + 12 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-ui-input-border" />
          </View>

          {sub && (
            <>
              <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark capitalize"
                    numberOfLines={1}
                  >
                    {fullName(sub.member)}
                  </Text>
                  <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                    {sub.activities?.name ?? "Actividad"} · Historial de pagos
                  </Text>
                </View>
                <Pressable onPress={onClose} className="p-1">
                  <X size={20} color={ui.text.muted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <Loading color={brandPrimary[600]} />
                ) : rows.length === 0 ? (
                  <Empty text="Todavía no hay pagos registrados." />
                ) : (
                  rows.map((p) => {
                    const voided = !!p.voided_at;
                    const canVoid =
                      !voided &&
                      (canVoidAny || p.registered_by === myProfileId);
                    return (
                      <View
                        key={p.id}
                        className={`flex-row items-center px-6 py-3 border-b border-ui-input-border ${voided ? "opacity-50" : ""}`}
                      >
                        <View className="w-9 h-9 rounded-[10px] items-center justify-center bg-green-500/10 mr-3">
                          <Calendar size={15} color="#16a34a" />
                        </View>
                        <View className="flex-1">
                          {/* Con año: el historial cruza años y "12 ago – 11 sep"
                              solo no alcanza para saber de cuál. */}
                          <Text
                            className={`text-[13px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark ${voided ? "line-through" : ""}`}
                          >
                            {periodLabel(p.period_start, p.period_end, { year: true })}
                          </Text>
                          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
                            {voided
                              ? `Anulado · ${p.void_reason ?? ""}`
                              : `Cobrado el ${formatDate(p.paid_at)}`}
                          </Text>
                        </View>
                        <Text
                          className={`text-[14px] font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark ${voided ? "line-through" : ""}`}
                        >
                          {money(p.amount)}
                        </Text>
                        {canVoid && (
                          <Pressable
                            onPress={() => startVoid(p)}
                            className="ml-3 p-1.5"
                          >
                            <Trash size={15} color="#dc2626" />
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {voidingPayment ? (
                <View className="px-6 py-4 border-t border-ui-input-border">
                  <Text className="text-[12px] font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark mb-2">
                    Anular {money(voidingPayment.amount)} ·{" "}
                    {periodLabel(
                      voidingPayment.period_start,
                      voidingPayment.period_end
                    )}
                  </Text>
                  <TextInput
                    value={voidReason}
                    onChangeText={setVoidReason}
                    placeholder="Motivo (obligatorio)"
                    placeholderTextColor={ui.text.muted}
                    multiline
                    className="bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl px-3.5 py-3 border border-ui-input-border text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark mb-3"
                  />
                  {voidError && (
                    <Text className="text-[11px] font-manrope text-red-600 mb-2">
                      {voidError}
                    </Text>
                  )}
                  <View className="flex-row gap-2.5">
                    <Pressable
                      onPress={() => setVoidingPayment(null)}
                      className="flex-1 items-center py-3 rounded-xl border border-ui-input-border"
                    >
                      <Text className="text-[13px] font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
                        Cancelar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={confirmVoid}
                      disabled={voidPayment.isPending || !voidReason.trim()}
                      style={{
                        opacity:
                          voidPayment.isPending || !voidReason.trim() ? 0.6 : 1,
                      }}
                      className="flex-1 items-center py-3 rounded-xl bg-red-600"
                    >
                      {voidPayment.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-[13px] font-manrope-bold text-white">
                          Anular
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                rows.length > 0 && (
                  <View className="flex-row items-center justify-between px-6 py-3 border-t border-ui-input-border">
                    <Text className="text-[12px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark">
                      {rows.length} {rows.length === 1 ? "pago" : "pagos"}
                    </Text>
                    <Text className="text-[15px] font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
                      Total {money(total)}
                    </Text>
                  </View>
                )
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
