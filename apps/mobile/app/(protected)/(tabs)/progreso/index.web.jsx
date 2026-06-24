// React Native
import { ScrollView, Text, View } from "react-native";

// Hooks (web-safe: la asistencia se lee de Supabase, no de SQLite)
import { useAttendanceStreak } from "@gymtrack/core/hooks/progress/use-attendance-streak";
import { useActiveGym } from "../../../../src/contexts/active-gym-context";
import { useAuth } from "../../../../src/auth/lib/getSession";

// Componentes
import MemberNavbar from "../../../../src/components/web/MemberNavbar.jsx";
import Heatmap from "../../../../src/components/charts/heatmap.jsx";

// Tema / assets
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";
import { ChartBar, Flame } from "../../../../assets/icons.jsx";

// En web el detalle de entrenamiento/récords vive en la app móvil (depende de la
// base local SQLite, que no corre en navegador). Acá se muestra la consistencia
// de asistencia, que sí se resuelve contra Supabase.
export default function ProgresoWeb() {
  const { brandPrimary, brandSecondary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { userId } = useAuth();
  const MINT = brandSecondary[400];
  const { data, isLoading } = useAttendanceStreak(gymId, userId);
  const streak = data?.weekStreak ?? 0;
  const hasData = (data?.totalCheckins ?? 0) > 0;

  return (
    <View className="flex-1 bg-ui-background-light">
      <MemberNavbar />
      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingVertical: 36,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 760 }}>
          {/* Header */}
          <View className="mb-7">
            <Text className="text-[10px] font-manrope-bold uppercase tracking-[2.4px] text-brandPrimary-600 mb-1">
              Mi Progreso
            </Text>
            <Text
              className="font-jakarta-bold text-ui-text-main"
              style={{ fontSize: 38, lineHeight: 42, letterSpacing: -1.4 }}
            >
              Progreso
            </Text>
          </View>

          {/* Consistencia */}
          <View className="bg-ui-surface-light border border-ui-input-border rounded-[22px] p-6 mb-5">
            <Text className="text-[10px] font-manrope-bold uppercase tracking-[1.6px] text-brandSecondary-700 mb-4">
              Consistencia
            </Text>

            <View className="flex-row gap-4 mb-6">
              <Stat
                value={`${streak}${streak >= 12 ? "+" : ""}`}
                label={streak === 1 ? "semana en racha" : "semanas en racha"}
                color={MINT}
                Icon={Flame}
              />
              <Stat
                value={data?.thisWeek ?? 0}
                label="esta semana"
                color={brandPrimary[600]}
              />
            </View>

            {isLoading ? (
              <Text className="text-xs font-manrope text-ui-text-muted">
                Cargando asistencia…
              </Text>
            ) : hasData ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Heatmap weeks={data.weeks} color={MINT} />
              </ScrollView>
            ) : (
              <Text className="text-[13px] font-manrope text-ui-text-muted leading-5">
                Hacé check-in con el QR del gimnasio y acá vas a ver tu racha y
                los días que entrenaste.
              </Text>
            )}
          </View>

          {/* Nota: detalle en la app */}
          <View className="bg-ui-surface-light border border-ui-input-border rounded-[22px] p-6 flex-row items-center gap-4">
            <View
              className="w-12 h-12 rounded-[14px] items-center justify-center"
              style={{ backgroundColor: "rgba(48,35,205,0.1)" }}
            >
              <ChartBar size={22} color={brandPrimary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-jakarta-bold text-ui-text-main tracking-tight mb-1">
                Volumen, récords y adherencia
              </Text>
              <Text className="text-[13px] font-manrope text-ui-text-muted leading-5">
                El detalle de tu entrenamiento y tus récords personales está en
                la app móvil de GymTrack.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, color, Icon }) {
  return (
    <View className="flex-1 bg-ui-background-light border border-ui-input-border rounded-2xl px-4 py-3.5 overflow-hidden">
      {Icon && <Icon size={16} color={color} />}
      <Text
        className="font-jakarta-bold text-[26px] leading-[30px] mt-1"
        style={{ color }}
      >
        {value}
      </Text>
      <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5">
        {label}
      </Text>
    </View>
  );
}
