import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { brandPrimary, gradient } from "../../theme/colors";
import { ChevronRight, Lock } from "../../../assets/icons";

const AdminModuleCard = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  comingSoon = false,
  accentColor,
}) => {
  const handlePress = () => {
    if (comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={comingSoon}
      className="w-[48%] mb-4"
      style={{ opacity: comingSoon ? 0.45 : 1 }}
    >
      <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl overflow-hidden">
        {/* Gradient accent bar */}
        <LinearGradient
          colors={
            comingSoon
              ? ["#e8e6f0", "#e8e6f0"]
              : accentColor || gradient.primary
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />

        <View className="p-4">
          {/* Icon */}
          <View className={`w-11 h-11 rounded-xl items-center justify-center mb-3 ${
            comingSoon
              ? "bg-ui-input-light dark:bg-ui-input-dark"
              : "bg-brandPrimary-50 dark:bg-brandPrimary-950"
          }`}>
            {comingSoon ? (
              <Lock size={20} className="text-ui-text-muted dark:text-ui-text-mutedDark" />
            ) : (
              <Icon size={20} color={accentColor?.[0] || brandPrimary[600]} />
            )}
          </View>

          {/* Label */}
          <Text
            className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
            numberOfLines={1}
          >
            {comingSoon ? "Próximamente" : subtitle}
          </Text>

          {/* Arrow */}
          {!comingSoon && (
            <View className="absolute top-4 right-3">
              <ChevronRight size={14} className="text-ui-text-muted dark:text-ui-text-mutedDark" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default AdminModuleCard;
