// ── React Native ──
import React from "react";
import { View, Text, Pressable } from "react-native";

// ── Expo ──
import { useRouter } from "expo-router";

// ── Assets ──
import { ChevronRight } from "../../assets/icons";

const AdminHeader = ({ title, subtitle, showBack = false }) => {
  const router = useRouter();

  return (
    <View className="px-5 pt-14 pb-6">
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          className="mb-4 w-9 h-9 rounded-xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950"
        >
          <View className="rotate-180">
            <ChevronRight size={18} className="text-brandPrimary-600" />
          </View>
        </Pressable>
      )}

      <View className="flex-row items-center gap-2 mb-4">
        <View className="bg-brandSecondary-400 w-7 h-1 rounded-sm" />
        <View className="bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40 w-2.5 h-1 rounded-sm" />
      </View>

      {subtitle && (
        <Text className="font-manrope-bold uppercase tracking-wide mb-1 text-brandSecondary-700 dark:text-brandSecondary-400 text-xs">
          {subtitle}
        </Text>
      )}
      <Text className="text-3xl font-jakarta-bold tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
        {title}
      </Text>
    </View>
  );
};

export default AdminHeader;
