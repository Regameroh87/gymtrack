// Pago de la cuota del socio.
//
// Muestra el desglose de TODO lo que debe —una línea por actividad— y lo cobra
// junto. El total no se calcula acá: sale del mismo RPC que usa la edge function
// al crear el cobro, así lo que el socio ve y lo que paga no pueden discrepar.
//
// El estado "confirmando" no es decorativo: cuando el socio vuelve del checkout
// todavía no sabemos si pagó. La confirmación la da el webhook, y hasta que
// llega la pantalla dice que está procesando.

// React / React Native
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

// Librerías
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks / contextos
import { useActiveGym } from "../../../src/contexts/active-gym-context";
import { useTheme } from "../../../src/theme/theme";
import { useGymTheme } from "../../../src/contexts/gym-theme-context";
import {
  useMyPendingCharges,
  usePayDues,
} from "../../../src/hooks/activities/use-member-payment";

// Componentes / assets
import { ArrowLeft, CheckCircle, Clock, Receipt, X } from "../../../assets/icons";
import { ui } from "@gymtrack/core/colors";

const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "julio 2026" a partir de un date ISO (YYYY-MM-DD). Se parte el string en vez
// de usar new Date(iso) porque eso lo interpreta en UTC y en Argentina puede
// devolver el mes anterior.
function monthLabel(iso) {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return `${MONTHS_ES[Number(m) - 1]} ${y}`;
}

export default function PagarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();

  const { data, isLoading } = useMyPendingCharges(gymId);
  const { mutate: pay, phase, isPending } = usePayDues(gymId);
  const [result, setResult] = useState(null);

  const textMain = isDark ? ui.text.mainDark : ui.text.main;
  const textMuted = isDark ? ui.text.mutedDark : ui.text.muted;

  function handlePay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setResult(null);
    pay(undefined, {
      onSuccess: (res) => setResult(res),
      onError: (err) => setResult({ status: "error", message: err.message }),
    });
  }

  const busyLabel =
    phase === "creating"
      ? "Preparando el pago..."
      : phase === "confirming"
        ? "Confirmando con MercadoPago..."
        : "Abriendo MercadoPago...";

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <ArrowLeft size={22} color={textMain} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        className="px-5"
      >
        <Text className="font-jakarta-bold text-3xl tracking-tighter text-ui-text-main dark:text-ui-text-mainDark mb-1">
          Tu cuota
        </Text>
        <Text className="font-manrope text-sm text-ui-text-muted dark:text-ui-text-mutedDark mb-7">
          Pagás con MercadoPago y el dinero va directo a tu gimnasio.
        </Text>

        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color={brandPrimary[700]} />
          </View>
        ) : !data?.items?.length ? (
          <AlDia textMuted={textMuted} />
        ) : (
          <>
            {/* ── Desglose: una línea por actividad ── */}
            <View className="rounded-3xl border border-ui-input-border dark:border-white/10 overflow-hidden mb-5">
              {data.items.map((item, i) => (
                <View
                  key={item.subscription_id}
                  className={`px-4 py-4 flex-row items-center justify-between ${
                    i > 0 ? "border-t border-ui-input-border dark:border-white/10" : ""
                  }`}
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className="font-manrope-bold text-[15px] text-ui-text-main dark:text-ui-text-mainDark"
                      numberOfLines={1}
                    >
                      {item.activity_name}
                    </Text>
                    <Text className="font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
                      {item.plan_label ? `${item.plan_label} · ` : ""}
                      {monthLabel(item.period_start)}
                    </Text>
                  </View>
                  <Text className="font-manrope-bold text-[15px] text-ui-text-main dark:text-ui-text-mainDark">
                    {money(item.amount)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Solo tiene sentido aclararlo cuando efectivamente son varias. */}
            {data.items.length > 1 && (
              <View className="flex-row items-start gap-2.5 rounded-2xl bg-brandPrimary-50 dark:bg-white/5 px-4 py-3 mb-5">
                <Receipt size={16} color={brandPrimary[700]} />
                <Text className="flex-1 font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
                  Hacés {data.items.length} actividades: se cobran todas juntas
                  en un solo pago.
                </Text>
              </View>
            )}

            {result && <ResultBanner result={result} />}
          </>
        )}
      </ScrollView>

      {/* ── Barra de pago ── */}
      {!isLoading && !!data?.items?.length && result?.status !== "approved" && (
        <View
          style={{ paddingBottom: insets.bottom + 16 }}
          className="absolute bottom-0 left-0 right-0 px-5 pt-4 bg-ui-background-light dark:bg-ui-background-dark border-t border-ui-input-border dark:border-white/10"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-manrope text-sm text-ui-text-muted dark:text-ui-text-mutedDark">
              Total a pagar
            </Text>
            <Text className="font-jakarta-bold text-2xl tracking-tight text-ui-text-main dark:text-ui-text-mainDark">
              {money(data.total)}
            </Text>
          </View>

          <Pressable
            onPress={handlePay}
            disabled={isPending}
            style={{ backgroundColor: brandPrimary[700] }}
            className="h-14 rounded-2xl items-center justify-center active:opacity-80 disabled:opacity-60 flex-row gap-2.5"
          >
            {isPending && <ActivityIndicator color="#fff" size="small" />}
            <Text className="font-manrope-bold text-[15px] text-white">
              {isPending ? busyLabel : "Pagar con MercadoPago"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function AlDia({ textMuted }) {
  return (
    <View className="items-center py-20">
      <View className="w-14 h-14 rounded-3xl bg-green-500/10 items-center justify-center mb-4">
        <CheckCircle size={24} color="#16a34a" />
      </View>
      <Text className="font-jakarta-bold text-lg text-ui-text-main dark:text-ui-text-mainDark mb-1">
        Estás al día
      </Text>
      <Text className="font-manrope text-sm text-center px-8" style={{ color: textMuted }}>
        No tenés cuotas pendientes en este gimnasio.
      </Text>
    </View>
  );
}

// El caso 'pending' NO dice "falló": el socio pudo haber pagado y la
// confirmación de MercadoPago puede tardar. Decirle que falló lo empuja a pagar
// dos veces.
function ResultBanner({ result }) {
  const CONFIG = {
    approved: {
      bg: "bg-green-500/10",
      color: "#16a34a",
      Icon: CheckCircle,
      title: "¡Pago acreditado!",
      text: "Tus cuotas quedaron al día.",
    },
    pending: {
      bg: "bg-amber-500/10",
      color: "#d97706",
      Icon: Clock,
      title: "Pago en proceso",
      text: "Si completaste el pago, se va a acreditar en unos minutos. No lo hagas de nuevo.",
    },
    rejected: {
      bg: "bg-red-500/10",
      color: "#ef4444",
      Icon: X,
      title: "Pago rechazado",
      text: "MercadoPago no aprobó el pago. Probá con otro medio.",
    },
    refunded: {
      bg: "bg-amber-500/10",
      color: "#d97706",
      Icon: Clock,
      title: "Pago devuelto",
      text: "El pago fue devuelto, así que las cuotas siguen pendientes.",
    },
  };

  const cfg = CONFIG[result.status] ?? {
    bg: "bg-red-500/10",
    color: "#ef4444",
    Icon: X,
    title: "No se pudo iniciar el pago",
    text: result.message ?? "Probá de nuevo en unos minutos.",
  };

  const { Icon } = cfg;

  return (
    <View className={`flex-row items-start gap-3 rounded-2xl px-4 py-4 ${cfg.bg}`}>
      <Icon size={18} color={cfg.color} />
      <View className="flex-1">
        <Text
          className="font-manrope-bold text-sm mb-0.5"
          style={{ color: cfg.color }}
        >
          {cfg.title}
        </Text>
        <Text className="font-manrope text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
          {cfg.text}
        </Text>
      </View>
    </View>
  );
}
