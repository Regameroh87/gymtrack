import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { brandPrimary, ui } from "../../../../../src/theme/colors";

import {
  Receipt,
  Lock,
  Users,
  Clock,
  ChartBar,
  ClipboardList,
} from "../../../../../assets/icons";

const FEATURES = [
  {
    icon: Users,
    title: "Gestión de membresías",
    sub: "Altas, bajas, renovaciones y planes vigentes por socio",
    color: brandPrimary[600],
    bubble: "bg-brandPrimary-50",
  },
  {
    icon: Clock,
    title: "Control de pagos y vencimientos",
    sub: "Alertas automáticas y seguimiento de cuotas pendientes",
    color: "#0284c7",
    bubble: "bg-sky-50",
  },
  {
    icon: ClipboardList,
    title: "Historial de transacciones",
    sub: "Detalle completo por socio con filtros por período",
    color: "#7c3aed",
    bubble: "bg-violet-50",
  },
  {
    icon: ChartBar,
    title: "Reportes visuales de ingresos",
    sub: "Tableros de facturación mensual y proyección",
    color: "#d97706",
    bubble: "bg-amber-50",
  },
];

export default function BillingPlaceholderWeb() {
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
            Gestión contable
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Membresías, cuotas, pagos y reportes financieros del gimnasio
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 bg-white rounded-xl px-3.5 py-2 border border-ui-input-border">
          <Lock size={12} color={ui.text.muted} />
          <Text className="text-xs font-manrope-semi text-ui-text-muted tracking-wider uppercase">
            Próximamente
          </Text>
        </View>
      </View>

      {/* Hero */}
      <LinearGradient
        colors={["#1a1530", "#2518b8", "#4a44e4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          padding: 36,
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <View className="absolute -right-16 -top-16 w-[220px] h-[220px] rounded-full bg-white/[0.04]" />
        <View className="absolute right-[120px] -bottom-[60px] w-[160px] h-[160px] rounded-full bg-white/[0.04]" />
        <View className="absolute right-4 top-4 w-24 h-24 rounded-full bg-white/[0.03]" />

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]" />
              <Text className="text-[11px] font-manrope-semi text-white/65 tracking-[1.4px] uppercase">
                Módulo en construcción
              </Text>
            </View>
            <Text className="text-[30px] font-jakarta-bold text-white tracking-tight mb-2.5">
              Estamos preparando la contabilidad
            </Text>
            <Text className="text-[13px] font-manrope text-white/55 leading-5 max-w-[440px]">
              Este módulo permitirá centralizar la gestión de membresías, controlar
              pagos vencidos, registrar transacciones y visualizar reportes de
              ingresos del gimnasio.
            </Text>

            <View className="flex-row gap-3 mt-6">
              <View className="flex-row items-center gap-1.5 bg-white/[0.08] border border-white/10 rounded-[10px] px-3 py-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <Text className="text-[11px] font-manrope-semi text-white/75 tracking-wider uppercase">
                  En diseño
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-white/[0.08] border border-white/10 rounded-[10px] px-3 py-1.5">
                <Text className="text-[11px] font-manrope text-white/55">
                  4 features previstas
                </Text>
              </View>
            </View>
          </View>

          <View className="ml-8 bg-white/10 rounded-[22px] p-7 items-center justify-center border border-white/10">
            <Receipt size={40} color="rgba(255,255,255,0.9)" />
            <Text className="text-[9px] font-manrope-semi text-white/55 mt-2 tracking-widest uppercase">
              Billing
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Features */}
      <Text className="mb-3 text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
        Qué traerá este módulo
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 14 }}>
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <View
              key={i}
              className="bg-white rounded-[16px] p-5 border border-ui-input-border"
              style={{ width: "calc(50% - 7px)" }}
            >
              <View className="flex-row items-start gap-3.5">
                <View
                  className={`w-[42px] h-[42px] rounded-xl items-center justify-center ${f.bubble}`}
                >
                  <Icon size={18} color={f.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-[14px] font-jakarta-bold text-ui-text-main tracking-tight">
                      {f.title}
                    </Text>
                    <View className="bg-ui-background-light px-1.5 py-0.5 rounded-md">
                      <Text className="text-[9px] font-manrope-bold tracking-wider uppercase text-ui-text-muted">
                        Soon
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] font-manrope text-ui-text-muted leading-4">
                    {f.sub}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer note */}
      <View className="mt-6 flex-row items-center gap-2.5 bg-white rounded-[14px] p-4 border border-ui-input-border">
        <View className="w-8 h-8 rounded-[10px] bg-brandPrimary-50 items-center justify-center">
          <Lock size={14} color={brandPrimary[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-[12px] font-manrope-bold text-ui-text-main">
            Módulo bloqueado temporalmente
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5">
            La gestión contable se habilitará en una próxima entrega. Mientras
            tanto, podés seguir administrando socios, ejercicios, sesiones y
            planes desde el panel.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
