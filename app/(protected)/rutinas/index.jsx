// React Native
import { Pressable, ScrollView, Text, View } from "react-native";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks

import { useAuth } from "../../../src/auth/lib/getSession";

// Componentes
import Screen from "../../../src/components/Screen";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import { ClipboardList, Plus } from "../../../assets/icons";

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <Screen>
      {/* Header */}
      <View className="px-6 pt-4 pb-5 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Entrenamiento
          </Text>
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
              Elegir plan
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Empty state */}
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
            Elegí una plantilla de tu entrenador o creá tu propio plan de días y
            rutinas.
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
    </Screen>
  );
}
