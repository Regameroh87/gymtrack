import React from "react";
import { ScrollView, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen from "../../../src/components/Screen";
import AdminHeader from "../../../src/components/AdminHeader";
import AdminModuleCard from "../../../src/components/cards/AdminModuleCard";
import { brandPrimary, brandSecondary, gradient } from "../../../src/theme/colors";
import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
} from "../../../assets/icons";

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const nav = (path) => router.push(`/admin/${path}`);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <AdminHeader
          title="Panel de Control"
          subtitle="Administración"
        />

        {/* ── Módulos ── */}
        <View className="px-5">
          <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mb-3 ml-1">
            Módulos
          </Text>

          <View className="flex-row flex-wrap justify-between">
            <AdminModuleCard
              icon={Users}
              title="Usuarios"
              subtitle="Socios y Staff"
              accentColor={gradient.primary}
              onPress={() => nav("users")}
            />
            <AdminModuleCard
              icon={Barbell}
              title="Ejercicios"
              subtitle="Catálogo maestro"
              accentColor={[brandSecondary[500], brandSecondary[400]]}
              onPress={() => nav("exercises")}
            />
            <AdminModuleCard
              icon={ClipboardList}
              title="Rutinas"
              subtitle="Armador técnico"
              accentColor={["#a78bfa", "#7c3aed"]}
              onPress={() => nav("routines")}
            />
            <AdminModuleCard
              icon={Receipt}
              title="Contabilidad"
              subtitle="Membresías y pagos"
              accentColor={["#f59e0b", "#d97706"]}
              onPress={() => nav("billing")}
            />
            <AdminModuleCard
              icon={ChartBar}
              title="Reportes"
              subtitle="Estadísticas"
              comingSoon
              onPress={() => nav("reports")}
            />
            <AdminModuleCard
              icon={Settings}
              title="Ajustes"
              subtitle="Configuración"
              comingSoon
              onPress={() => nav("settings")}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
