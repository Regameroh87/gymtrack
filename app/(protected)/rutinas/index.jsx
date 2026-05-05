// React Native
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks
import { useActivePlan } from "../../../src/hooks/useActivePlan";
import { useAuth } from "../../../src/auth/lib/getSession";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import { Barbell, ClipboardList, Plus } from "../../../assets/icons";

const OBJECTIVE_ACCENT = {
  hipertrofia: "#6366f1",
  fuerza: "#ef4444",
  perdida_grasa: "#22c55e",
  resistencia: "#38bdf8",
  acondicionamiento: "#f59e0b",
  rehabilitacion: "#a855f7",
};

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: activePlan, isLoading } = useActivePlan();

  return (
    <Screen>
      {/* Header */}
      <View className="px-6 pt-4 pb-5 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Entrenamiento
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            {activePlan ? activePlan.plan.name : "Sin plan activo"}
          </Text>
          {activePlan && (
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mt-1">
              {activePlan.days.length}{" "}
              {activePlan.days.length === 1 ? "día" : "días"}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/rutinas/select");
          }}
          className="active:scale-[0.95]"
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-3.5 h-10 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-jakarta-semi text-xs">
              {activePlan ? "Cambiar" : "Elegir plan"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : !activePlan ? (
        /* ── Empty state ── */
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
        >
          <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center mb-4">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
              <ClipboardList size={32} color={brandPrimary[600]} />
            </View>
            <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
              No tenés un plan activo
            </Text>
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
              Elegí una plantilla de tu entrenador o creá tu propio plan de días
              y rutinas.
            </Text>
            <View className="w-full gap-3">
              <Pressable
                onPress={() => router.push("/rutinas/select")}
                className="w-full active:scale-[0.98]"
              >
                <LinearGradient
                  colors={[brandPrimary[600], brandPrimary[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-3.5 rounded-xl items-center flex-row justify-center"
                >
                  <ClipboardList size={18} color="white" />
                  <Text className="text-white font-jakarta-semi text-sm ml-2">
                    Elegir un plan
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => router.push("/rutinas/builder")}
                className="py-3.5 rounded-xl items-center flex-row justify-center border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-70"
              >
                <Plus size={18} color={brandPrimary[500]} />
                <Text className="font-jakarta-semi text-sm ml-2 text-brandPrimary-500 dark:text-brandPrimary-400">
                  Crear mi propio plan
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ── Plan activo: lista de días ── */
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 gap-2.5">
            {activePlan.days.map((day) => {
              const accent =
                OBJECTIVE_ACCENT[day.routine_objective] ?? "#6366f1";
              return (
                <View
                  key={day.id}
                  className="flex-row items-center p-4 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark"
                >
                  {/* Número de día */}
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: accent + "22" }}
                  >
                    <Text
                      className="text-[10px] font-manrope-semi uppercase"
                      style={{ color: accent }}
                    >
                      Día
                    </Text>
                    <Text
                      className="text-[16px] font-jakarta-bold leading-tight"
                      style={{ color: accent }}
                    >
                      {day.day_number}
                    </Text>
                  </View>

                  {/* Nombre de rutina */}
                  <View className="flex-1">
                    <Text
                      className="font-jakarta-semi text-[15px] text-ui-text-main dark:text-ui-text-mainDark"
                      numberOfLines={1}
                    >
                      {day.routine_name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Barbell size={11} color={accent} />
                      <Text
                        className="text-[11px] font-manrope ml-1"
                        style={{ color: accent }}
                      >
                        {day.routine_objective ?? "Entrenamiento"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
