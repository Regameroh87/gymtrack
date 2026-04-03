import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../../../../src/components/Screen";
import { ClipboardList, Plus } from "../../../../assets/icons";
import { brandPrimary, ui } from "../../../../src/theme/colors";

export default function RoutinesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 mb-8">
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Gestión de Entrenamientos
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Rutinas
          </Text>
        </View>

        {/* Empty State */}
        <View className="mx-5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
          <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
            <ClipboardList size={32} color={brandPrimary[600]} />
          </View>

          <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
            Construye planes de entrenamiento
          </Text>
          <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
            Crea rutinas personalizadas combinando ejercicios del catálogo con
            series y repeticiones.
          </Text>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/admin/routines/builder");
            }}
            className="w-full active:scale-[0.98]"
          >
            <LinearGradient
              colors={[brandPrimary[600], brandPrimary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-3.5 rounded-xl items-center flex-row justify-center"
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-jakarta-semi text-sm ml-2">
                Nueva Rutina
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Recently Created */}
        <View className="mt-10 px-6">
          <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mb-4 ml-1">
            Recientemente creadas
          </Text>
          <View className="items-center py-8">
            <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark">
              No hay rutinas guardadas todavía.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
