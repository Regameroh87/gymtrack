import { ScrollView, View, Text, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import Screen from "../../../src/components/Screen";
import AdminHeader from "../../../src/components/AdminHeader";
import AdminModuleCard from "../../../src/components/cards/AdminModuleCard";
import { brandSecondary, gradient } from "../../../src/theme/colors";
import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
} from "../../../assets/icons";
import { resetDatabase } from "../../../src/database/utils";

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const handleResetDB = () => {
    Alert.alert(
      "Reiniciar Base de Datos",
      "¿Estás seguro? Esta acción borrará TODO el contenido local (ejercicios, máquinas, etc). Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "SÍ, BORRAR TODO",
          style: "destructive",
          onPress: async () => {
            const result = await resetDatabase();
            if (result.success) {
              queryClient.invalidateQueries();
              Alert.alert("Éxito", "La base de datos ha sido reiniciada.");
            } else {
              Alert.alert(
                "Error",
                "Hubo un problema al reiniciar la base de datos."
              );
            }
          },
        },
      ]
    );
  };

  const nav = (path) => router.push(`/admin/${path}`);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <AdminHeader title="Panel de Control" subtitle="Administración" />

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
              icon={Barbell}
              title="Máquinas"
              subtitle="Inventario"
              accentColor={["#f43f5e", "#e11d48"]}
              onPress={() => nav("equipments")}
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

        {/* ── Zona de Desarrollo ── */}
        <View className="px-5 mt-8">
          <Text className="text-[11px] font-manrope-semi text-red-500 uppercase tracking-widest mb-3 ml-1">
            Zona de Desarrollo
          </Text>

          <Pressable
            onPress={handleResetDB}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl active:bg-red-500/20"
          >
            <Text className="text-red-500 font-jakarta-bold text-center">
              REINICIAR BASE DE DATOS LOCAL
            </Text>
            <Text className="text-red-500/60 font-manrope text-[10px] text-center mt-1">
              Borra ejercicios, máquinas y relaciones
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
