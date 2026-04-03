import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "../../assets/icons";

/**
 * Cabecera editorial para pantallas del panel admin.
 * Estilo: Kinetic Precision — tipografía grande, limpia.
 * Usa el mismo patrón que addExercise.jsx
 */
const AdminHeader = ({ title, subtitle, showBack = false }) => {
  const router = useRouter();

  return (
    <View className="px-6 pt-14 pb-6">
      <View className="flex-row items-center">
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 rounded-xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950"
          >
            <View className="rotate-180">
              <ChevronRight size={18} className="text-brandPrimary-600" />
            </View>
          </Pressable>
        )}
        <View className="flex-1">
          {subtitle && (
            <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
              {subtitle}
            </Text>
          )}
          <Text className="text-3xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AdminHeader;
