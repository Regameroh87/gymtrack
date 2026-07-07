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
import StyledTextInput from "../../../../../src/components/forms/StyledTextInput";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { useCoachPaymentSummary } from "@gymtrack/core/hooks/coaches/use-coach-payment-summary";
import { useCoachPayments } from "@gymtrack/core/hooks/coaches/use-coach-payments";
import { useCoachPaymentMutations } from "../../../../../src/hooks/coaches/use-coach-payment-mutations";
import {
  Receipt,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "../../../../../assets/icons";

const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const fullName = (p) =>
  [p?.name, p?.last_name].filter(Boolean).join(" ") || "Coach";

const toISO = (d) => d.toISOString().split("T")[0];

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

const formatPaidAt = (ts) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
};

export default function CoachPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();

  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const { fromISO, toISO: toISODate } = monthRange(cursor.year, cursor.month);

  const { data: summary, isLoading } = useCoachPaymentSummary(
    gymId,
    fromISO,
    toISODate
  );
  const { data: payments } = useCoachPayments(gymId, fromISO, toISODate);
  const { register } = useCoachPaymentMutations();

  // Fila del summary a la que se le está registrando un pago; null = cerrado.
  const [paying, setPaying] = useState(null);

  const moveMonth = (delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // Total ya pagado en el período, por coach.
  const paidByCoach = useMemo(() => {
    const map = {};
    for (const p of payments ?? []) {
      map[p.coach_id] = (map[p.coach_id] ?? 0) + Number(p.total_amount || 0);
    }
    return map;
  }, [payments]);

  const totals = useMemo(() => {
    const rows = summary ?? [];
    const due = rows.reduce((s, r) => s + Number(r.total || 0), 0);
    const paid = Object.values(paidByCoach).reduce((s, v) => s + v, 0);
    return { due, paid, balance: due - paid };
  }, [summary, paidByCoach]);

  return (
    <Screen safe={Platform.OS === "android"}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4">
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-amber-600">
            Contabilidad
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Pagos a coaches
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

        {/* Resumen del mes */}
        <View className="flex-row gap-2.5 px-6 mb-4">
          <MiniStat label="A pagar" value={money(totals.due)} tone="text-ui-text-main dark:text-ui-text-mainDark" />
          <MiniStat label="Pagado" value={money(totals.paid)} tone="text-green-600" />
          <MiniStat
            label="Saldo"
            value={money(totals.balance)}
            tone={totals.balance > 0 ? "text-amber-600" : "text-green-600"}
          />
        </View>

        {/* Cards por coach */}
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="large" color={brandPrimary[600]} />
          </View>
        ) : (summary?.length ?? 0) === 0 ? (
          <View className="mx-6 py-12 items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-dashed border-ui-input-border rounded-2xl">
            <Users size={36} color={ui.text.muted} />
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mt-3 px-8">
              No hay nada para liquidar este mes. Asigná coaches con esquema de
              pago en las actividades.
            </Text>
          </View>
        ) : (
          <View className="px-6 gap-2.5">
            {summary.map((row) => (
              <CoachRow
                key={row.coach_id}
                row={row}
                paid={paidByCoach[row.coach_id] ?? 0}
                brandPrimary={brandPrimary}
                onPay={() => setPaying(row)}
              />
            ))}
          </View>
        )}

        {/* Historial del mes */}
        {(payments?.length ?? 0) > 0 && (
          <View className="px-6 mt-6">
            <Text className="text-xs font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mb-2">
              Pagos registrados
            </Text>
            <View className="gap-2">
              {payments.map((p) => (
                <View
                  key={p.id}
                  className="flex-row items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5"
                >
                  <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-green-500/10">
                    <Receipt size={18} color="#16a34a" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
                      numberOfLines={1}
                    >
                      {fullName(p.coach)}
                    </Text>
                    <Text
                      className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
                      numberOfLines={1}
                    >
                      {formatPaidAt(p.paid_at)}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
                    {money(p.total_amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <PayModal
        row={paying}
        fromISO={fromISO}
        toISO={toISODate}
        alreadyPaid={paying ? (paidByCoach[paying.coach_id] ?? 0) : 0}
        onClose={() => setPaying(null)}
        register={register}
        insets={insets}
      />
    </Screen>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <View className="flex-1 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3">
      <Text className={`text-[15px] font-jakarta-bold ${tone}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
        {label}
      </Text>
    </View>
  );
}

function CoachRow({ row, paid, brandPrimary, onPay }) {
  const [open, setOpen] = useState(false);
  const balance = Number(row.total || 0) - paid;

  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center"
      >
        <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-brandPrimary-100 dark:bg-brandPrimary-900/30">
          <Users size={18} color={brandPrimary[600]} />
        </View>
        <View className="flex-1">
          <Text
            className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark capitalize"
            numberOfLines={1}
          >
            {fullName(row.coach)}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
            Pagado {money(paid)} de {money(row.total)}
          </Text>
        </View>
        <Text
          className={`text-[15px] font-jakarta-bold mr-2 ${
            balance > 0
              ? "text-amber-600"
              : "text-green-600"
          }`}
        >
          {money(balance)}
        </Text>
        <ChevronDown
          size={15}
          color={ui.text.muted}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {open && (
        <View className="mt-3 pt-3 border-t border-ui-input-border gap-1.5">
          <BreakdownLine label="Fijo mensual" value={money(row.fixed_total)} />
          <BreakdownLine
            label="% de ingresos"
            value={money(row.revenue_total)}
          />
          <BreakdownLine
            label={`Clases dictadas (${row.classes_count})`}
            value={money(row.classes_total)}
          />
          <Pressable
            onPress={onPay}
            className="flex-row justify-center items-center gap-2 rounded-xl py-2.5 mt-2 bg-brandPrimary-600 active:scale-95"
          >
            <Receipt size={14} color="#fff" />
            <Text className="text-white text-[12px] font-jakarta-bold tracking-wider">
              REGISTRAR PAGO
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function BreakdownLine({ label, value }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[12px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
        {label}
      </Text>
      <Text className="text-[12px] font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark">
        {value}
      </Text>
    </View>
  );
}

// Bottom-sheet para registrar un pago: monto prellenado con el saldo del
// período, notas opcionales; guarda el snapshot del desglose calculado.
function PayModal({ row, fromISO, toISO, alreadyPaid, onClose, register, insets }) {
  const balance = row ? Math.max(Number(row.total || 0) - alreadyPaid, 0) : 0;
  const [amount, setAmount] = useState(null); // null ⇒ usar saldo
  const [notes, setNotes] = useState("");

  const close = () => {
    setAmount(null);
    setNotes("");
    onClose();
  };

  const submit = async () => {
    const value = amount == null || amount === "" ? balance : Number(amount);
    if (Number.isNaN(value) || value < 0) {
      Toast.show({ type: "error", text1: "Monto inválido", position: "bottom" });
      return;
    }
    try {
      await register.mutateAsync({
        coachId: row.coach_id,
        periodStart: fromISO,
        periodEnd: toISO,
        fixedAmount: row.fixed_total,
        revenueShareAmount: row.revenue_total,
        classesCount: row.classes_count,
        classesAmount: row.classes_total,
        totalAmount: value,
        notes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Pago registrado",
        text2: `${money(value)} a ${fullName(row.coach)}.`,
        position: "bottom",
      });
      close();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "No se pudo registrar el pago",
        text2: error.message ?? "Intentá de nuevo.",
        position: "bottom",
      });
    }
  };

  return (
    <Modal
      visible={!!row}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={close}>
        <Pressable
          className="bg-ui-background-light dark:bg-ui-background-dark rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-ui-input-border" />
          </View>
          <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
            <Text className="text-lg font-jakarta tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
              Pagar a {row ? fullName(row.coach) : ""}
            </Text>
            <Pressable onPress={close}>
              <X size={18} color={ui.text.muted} />
            </Pressable>
          </View>

          <View className="px-6 gap-3">
            <View className="gap-1.5">
              <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                Monto (saldo: {money(balance)})
              </Text>
              <StyledTextInput
                value={amount == null ? String(balance) : amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="gap-1.5">
              <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                Notas
              </Text>
              <StyledTextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: adelanto, transferencia... (opcional)"
              />
            </View>
            <Pressable
              onPress={submit}
              disabled={register.isPending}
              className={`flex-row justify-center items-center gap-2 rounded-xl py-3.5 mt-1 active:scale-95 ${
                register.isPending ? "bg-ui-input-border" : "bg-brandPrimary-600"
              }`}
            >
              <Text className="text-white text-[13px] font-jakarta-bold tracking-wider">
                {register.isPending ? "GUARDANDO..." : "CONFIRMAR PAGO"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
