import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
  Lock,
  ChevronRight,
  UserPlus,
} from "../../../../assets/icons";

import { ui } from "../../../../src/theme/colors";
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";
import { canAccessModule } from "../../../../src/constants/roles";

const buildStats = (brandPrimary) => [
  {
    label: "Socios activos",
    value: "—",
    icon: Users,
    dot: "bg-brandPrimary-600",
    bubble: "bg-brandPrimary-50",
    iconColor: brandPrimary[600],
  },
  {
    label: "Sesiones totales",
    value: "—",
    icon: ClipboardList,
    dot: "bg-violet-600",
    bubble: "bg-violet-50",
    iconColor: "#7c3aed",
  },
  {
    label: "Planes activos",
    value: "—",
    icon: ClipboardList,
    dot: "bg-sky-600",
    bubble: "bg-sky-50",
    iconColor: "#0284c7",
  },
  {
    label: "Facturación mes",
    value: "—",
    icon: Receipt,
    dot: "bg-amber-600",
    bubble: "bg-amber-50",
    iconColor: "#d97706",
  },
];

const buildModules = (brandPrimary, brandSecondary) => [
  {
    icon: Users,
    label: "Usuarios",
    sub: "Socios y Staff",
    path: "users",
    color: brandPrimary[600],
    bar: "bg-brandPrimary-600",
    bubble: "bg-brandPrimary-600/10",
  },
  {
    icon: Barbell,
    label: "Ejercicios",
    sub: "Catálogo maestro",
    path: "exercises",
    color: brandSecondary[500],
    bar: "bg-brandSecondary-500",
    bubble: "bg-brandSecondary-500/10",
  },
  {
    icon: Barbell,
    label: "Máquinas",
    sub: "Inventario del gimnasio",
    path: "equipments",
    color: "#f43f5e",
    bar: "bg-rose-500",
    bubble: "bg-rose-500/10",
  },
  {
    icon: ClipboardList,
    label: "Sesiones",
    sub: "Armador técnico",
    path: "sessions",
    color: "#7c3aed",
    bar: "bg-violet-600",
    bubble: "bg-violet-600/10",
  },
  {
    icon: ClipboardList,
    label: "Planes",
    sub: "Plantillas de entreno",
    path: "plans",
    color: "#0284c7",
    bar: "bg-sky-600",
    bubble: "bg-sky-600/10",
  },
  {
    icon: Receipt,
    label: "Contabilidad",
    sub: "Membresías y pagos",
    path: "billing",
    color: "#d97706",
    bar: "bg-amber-600",
    bubble: "bg-amber-600/10",
  },
];

const buildQuickActions = (brandPrimary, brandSecondary) => [
  {
    label: "Registrar socio",
    sub: "Nuevo miembro",
    path: "users/register",
    color: brandPrimary[600],
    bubble: "bg-brandPrimary-600/10",
    icon: UserPlus,
  },
  {
    label: "Crear ejercicio",
    sub: "Builder de ejercicios",
    path: "exercises/builder",
    color: brandSecondary[500],
    bubble: "bg-brandSecondary-500/10",
    icon: Barbell,
  },
  {
    label: "Armar sesión",
    sub: "Constructor técnico",
    path: "sessions/builder",
    color: "#7c3aed",
    bubble: "bg-violet-600/10",
    icon: ClipboardList,
  },
  {
    label: "Crear plan",
    sub: "Plantilla semanal",
    path: "plans/builder",
    color: "#0284c7",
    bubble: "bg-sky-600/10",
    icon: ClipboardList,
  },
];

const COMING_SOON = [
  { icon: ChartBar, label: "Reportes", sub: "Estadísticas del gimnasio" },
  { icon: Settings, label: "Ajustes", sub: "Configuración del sistema" },
];

export default function AdminDashboardWeb() {
  const router = useRouter();
  const { role } = useUserRole();
  const { brandPrimary, brandSecondary, gymName } = useGymTheme();
  const STATS = buildStats(brandPrimary);
  const QUICK_ACTIONS = buildQuickActions(brandPrimary, brandSecondary);

  // Solo los módulos permitidos para el rol (coach no ve Contabilidad).
  const modules = buildModules(brandPrimary, brandSecondary).filter((mod) =>
    canAccessModule(role, mod.path)
  );

  const dateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nav = (path) => path && router.push(`/admin/${path}`);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View className="flex-row items-end justify-between mb-7">
        <View>
          <Text className="text-xs font-manrope text-ui-text-muted capitalize mb-0.5">
            {dateStr}
          </Text>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Panel de Control
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 bg-white rounded-xl px-3.5 py-2 border border-ui-input-border">
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-xs font-manrope-semi text-ui-text-main">
            Admin activo
          </Text>
        </View>
      </View>

      {/* Welcome Banner */}
      <LinearGradient
        colors={[brandPrimary[800], brandPrimary[600], brandPrimary[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 30, marginBottom: 24, overflow: "hidden" }}
      >
        <View className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full bg-white/5" />
        <View className="absolute right-[100px] -bottom-[50px] w-[140px] h-[140px] rounded-full bg-white/5" />
        <View className="absolute right-2.5 top-2.5 w-20 h-20 rounded-full bg-white/[0.05]" />

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400" />
              <Text className="text-xs font-manrope-semi text-white/65 tracking-wide">
                Bienvenido de vuelta
              </Text>
            </View>
            <Text className="text-[28px] font-jakarta-bold text-white tracking-tight mb-2">
              Hola, Administrador
            </Text>
            <Text className="text-[13px] font-manrope text-white/55 leading-5 max-w-[380px]">
              Gestiona tu gimnasio desde aquí. Usuarios, rutinas, equipos y más, todo centralizado.
            </Text>

            <View className="flex-row gap-5 mt-5">
              {[
                { label: "Módulos activos", val: "6" },
                { label: "Próximamente", val: "2" },
              ].map((s, i) => (
                <View key={i}>
                  <Text className="text-[22px] font-jakarta-bold text-white tracking-tight">
                    {s.val}
                  </Text>
                  <Text className="text-[11px] font-manrope text-white/45">
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="ml-8 bg-white/10 rounded-[20px] p-6 items-center justify-center border border-white/10">
            <Barbell size={36} color="rgba(255,255,255,0.9)" />
            <Text className="text-[9px] font-manrope-semi text-white/55 mt-2 tracking-widest uppercase">
              {gymName ?? "GymTrack"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View className="flex-row gap-3.5 mb-7">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <View
              key={i}
              className="flex-1 bg-white rounded-[18px] p-5 border border-ui-input-border"
            >
              <View className="flex-row items-center justify-between mb-3.5">
                <View className={`w-[38px] h-[38px] rounded-[11px] items-center justify-center ${stat.bubble}`}>
                  <Icon size={17} color={stat.iconColor} />
                </View>
                <View className={`w-1.5 h-1.5 rounded-full ${stat.dot} opacity-40`} />
              </View>
              <Text className="text-[30px] font-jakarta-bold text-ui-text-main tracking-tight">
                {stat.value}
              </Text>
              <Text className="text-xs font-manrope text-ui-text-muted mt-1">
                {stat.label}
              </Text>
              <View className={`h-0.5 rounded-sm mt-4 w-[35%] opacity-30 ${stat.dot}`} />
            </View>
          );
        })}
      </View>

      {/* Bottom Section */}
      <View className="flex-row gap-5 items-start">
        <View className="flex-[3]">
          <Text className="mb-3 text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
            Módulos del sistema
          </Text>
          <View className="gap-2">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <Pressable
                  key={i}
                  onPress={() => nav(mod.path)}
                  className="flex-row items-center gap-3.5 bg-white hover:bg-brandPrimary-50/40 rounded-[15px] p-4 border border-ui-input-border active:scale-[0.99]"
                  style={{ cursor: "pointer" }}
                >
                  <View className={`w-[3px] h-[38px] rounded-sm ${mod.bar}`} />
                  <View className={`w-[38px] h-[38px] rounded-[11px] items-center justify-center ${mod.bubble}`}>
                    <Icon size={17} color={mod.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-jakarta-bold text-ui-text-main">
                      {mod.label}
                    </Text>
                    <Text className="text-[11px] font-manrope text-ui-text-muted mt-px">
                      {mod.sub}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={ui.text.muted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-[2]">
          <Text className="mb-3 text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
            Acciones rápidas
          </Text>
          <View className="gap-2 mb-6">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <Pressable
                  key={i}
                  onPress={() => nav(action.path)}
                  className="flex-row items-center gap-3 bg-white hover:bg-brandPrimary-50/40 rounded-[13px] p-3.5 border border-ui-input-border"
                  style={{ cursor: "pointer" }}
                >
                  <View className={`w-8 h-8 rounded-[9px] items-center justify-center ${action.bubble}`}>
                    <Icon size={14} color={action.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                      {action.label}
                    </Text>
                    <Text className="text-[11px] font-manrope text-ui-text-muted">
                      {action.sub}
                    </Text>
                  </View>
                  <ChevronRight size={13} color={ui.text.muted} />
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-3 text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
            Próximamente
          </Text>
          <View className="gap-2">
            {COMING_SOON.map((item, i) => {
              const Icon = item.icon;
              return (
                <View
                  key={i}
                  className="flex-row items-center gap-3 bg-ui-background-light rounded-[13px] p-3.5 border border-ui-input-border opacity-55"
                >
                  <View className="w-8 h-8 rounded-[9px] items-center justify-center bg-ui-text-muted/10">
                    <Lock size={13} color={ui.text.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[13px] font-manrope-bold text-ui-text-muted">
                      {item.label}
                    </Text>
                    <Text className="text-[11px] font-manrope text-ui-text-muted">
                      {item.sub}
                    </Text>
                  </View>
                  <View className="bg-ui-text-muted/10 px-2 py-0.5 rounded-md">
                    <Text className="text-[9px] font-manrope-semi text-ui-text-muted tracking-wider">
                      SOON
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
