// ── React Native ──
import { ScrollView, View, Text } from "react-native";

// ── Expo ──
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Componentes ──
import Screen from "../../../../src/components/Screen";
import AdminHeader from "../../../../src/components/AdminHeader";
import AdminModuleCard from "../../../../src/components/cards/AdminModuleCard";

// ── Roles ──
import { useUserRole } from "../../../../src/hooks/shared/use-user-role";
import { canAccessModule } from "../../../../src/constants/roles";

// ── Tema ──
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";

// ── Assets ──
import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
} from "../../../../assets/icons";

const buildModules = ({ brandSecondary, gradient }) => [
  {
    n: "01",
    icon: Users,
    kicker: "DIRECTORIO",
    title: "Usuarios",
    subtitle: "Socios y staff",
    accent: gradient.primary,
    path: "users",
  },
  {
    n: "02",
    icon: Barbell,
    kicker: "CATÁLOGO",
    title: "Ejercicios",
    subtitle: "Maestro técnico",
    accent: [brandSecondary[500], brandSecondary[400]],
    path: "exercises",
  },
  {
    n: "03",
    icon: Barbell,
    kicker: "INVENTARIO",
    title: "Máquinas",
    subtitle: "Equipamiento",
    accent: ["#f43f5e", "#e11d48"],
    path: "equipments",
  },
  {
    n: "04",
    icon: ClipboardList,
    kicker: "OPERATIVO",
    title: "Sesiones",
    subtitle: "Armador técnico",
    accent: ["#a78bfa", "#7c3aed"],
    path: "sessions",
  },
  {
    n: "05",
    icon: ClipboardList,
    kicker: "PROGRAMACIÓN",
    title: "Planes",
    subtitle: "Plantillas",
    accent: ["#0ea5e9", "#0284c7"],
    path: "plans",
  },
  {
    n: "06",
    icon: Receipt,
    kicker: "FINANZAS",
    title: "Contabilidad",
    subtitle: "Membresías",
    accent: ["#f59e0b", "#d97706"],
    path: "billing",
  },
  {
    n: "07",
    icon: ChartBar,
    kicker: "ANÁLISIS",
    title: "Reportes",
    subtitle: "Estadísticas",
    comingSoon: true,
    path: "reports",
  },
  {
    n: "08",
    icon: Settings,
    kicker: "SISTEMA",
    title: "Ajustes",
    subtitle: "Configuración",
    comingSoon: true,
    path: "settings",
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useUserRole();
  const { brandSecondary, gradient } = useGymTheme();

  const nav = (path) => router.push(`/admin/${path}`);

  // Solo los módulos permitidos para el rol (coach no ve Billing/Reportes/Ajustes).
  const modules = buildModules({ brandSecondary, gradient }).filter((m) =>
    canAccessModule(role, m.path)
  );

  return (
    <Screen safe>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <AdminHeader title="Panel de Control" subtitle="Administración" />

        {/* ── Módulos ── */}
        <View className="px-5">
          <View className="flex-row items-center mb-3.5" style={{ gap: 8 }}>
            <View
              className="bg-brandSecondary-400"
              style={{ width: 16, height: 2, borderRadius: 1 }}
            />
            <Text
              className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
              style={{ fontSize: 10, letterSpacing: 2.2 }}
            >
              Módulos
            </Text>
            <View
              className="flex-1 bg-[#0f0d20]/8 dark:bg-white/8"
              style={{ height: 1 }}
            />
          </View>

          <View className="flex-row flex-wrap justify-between">
            {modules.map((m) => (
              <AdminModuleCard
                key={m.path}
                icon={m.icon}
                kicker={m.kicker}
                title={m.title}
                subtitle={m.subtitle}
                editorialNumber={m.n}
                accentColor={m.accent}
                comingSoon={m.comingSoon}
                onPress={() => nav(m.path)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
