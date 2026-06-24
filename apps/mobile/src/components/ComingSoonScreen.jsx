import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Screen from "./Screen";
import { Lock } from "../../assets/icons";

/**
 * Pantalla placeholder para módulos en desarrollo.
 * Estilo editorial Kinetic Precision con soporte completo light/dark.
 */
const ComingSoonScreen = ({ title, features = [] }) => {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 px-6 pt-20 items-center">
        {/* Icon */}
        <View className="w-20 h-20 rounded-2xl items-center justify-center mb-8 bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Lock size={36} className="text-brandPrimary-500 dark:text-brandPrimary-400" />
        </View>

        {/* Title & Body */}
        <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
          {title}
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-10 max-w-[280px]">
          Este módulo estará disponible próximamente.
        </Text>

        {/* Feature List */}
        {features.length > 0 && (
          <View className="w-full bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl p-5 mb-10 border border-ui-input-border">
            <Text className="text-[10px] font-jakarta-semi uppercase tracking-widest mb-4 text-brandPrimary-500 dark:text-brandPrimary-400">
              Funcionalidades planeadas
            </Text>
            {features.map((feature, idx) => (
              <View key={idx} className="flex-row items-start mb-2.5">
                <View className="w-1 h-1 rounded-full mt-1.5 mr-3 bg-brandPrimary-400 dark:bg-brandPrimary-300" />
                <Text className="text-[13px] font-manrope text-ui-text-main dark:text-ui-text-mainDark leading-5 flex-1">
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={() => router.back()}
          className="py-3.5 px-8 rounded-xl bg-brandPrimary-50 dark:bg-brandPrimary-950 active:opacity-80"
        >
          <Text className="font-jakarta-semi text-sm text-brandPrimary-600 dark:text-brandPrimary-400">
            Volver al Panel
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

export default ComingSoonScreen;
