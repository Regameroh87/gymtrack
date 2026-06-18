// ── React Native ──
import React from "react";
import { View, Text, Pressable } from "react-native";

// ── Libs ──
import * as Haptics from "expo-haptics";

// ── Tema / Assets ──
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Lock } from "../../../assets/icons";
import { makeShadow } from "../../utils/box-shadow";

const AdminModuleCard = ({
  icon: Icon,
  title,
  subtitle,
  kicker,
  editorialNumber,
  onPress,
  comingSoon = false,
  accentColor,
}) => {
  const { brandPrimary } = useGymTheme();

  const handlePress = () => {
    if (comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const accent = accentColor?.[0] || brandPrimary[600];
  const displayKicker = comingSoon ? "PRÓXIMAMENTE" : kicker;

  return (
    <Pressable
      onPress={handlePress}
      disabled={comingSoon}
      className="w-[48%] mb-3 active:scale-[0.985]"
      style={{ opacity: comingSoon ? 0.45 : 1 }}
    >
      <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-4 overflow-hidden">
        {/* Top row: icon + número editorial */}
        <View className="flex-row items-start justify-between mb-4">
          <View
            className={`w-11 h-11 rounded-2xl items-center justify-center ${
              comingSoon
                ? "bg-ui-input-light dark:bg-ui-input-dark"
                : "bg-brandPrimary-50 dark:bg-brandPrimary-950"
            }`}
            style={
              comingSoon
                ? null
                : makeShadow({ color: accent, opacity: 0.25, radius: 8, offset: { width: 0, height: 4 } })
            }
          >
            {comingSoon ? (
              <Lock
                size={20}
                className="text-ui-text-muted dark:text-ui-text-mutedDark"
              />
            ) : (
              <Icon size={20} color={accent} />
            )}
          </View>

          {editorialNumber && (
            <Text
              className="font-jakarta-bold tracking-tighter text-ui-text-main/10 dark:text-ui-text-mainDark/15"
              style={{ fontSize: 20, lineHeight: 22 }}
            >
              {editorialNumber}
            </Text>
          )}
        </View>

        {/* Kicker con dot mint */}
        {displayKicker && (
          <View className="flex-row items-center gap-1.5 mb-1">
            <View className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400" />
            <Text
              className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
              style={{ fontSize: 9, letterSpacing: 1.6 }}
              numberOfLines={1}
            >
              {displayKicker}
            </Text>
          </View>
        )}

        {/* Title */}
        <Text
          className="font-jakarta-bold text-[15px] text-ui-text-main dark:text-ui-text-mainDark"
          style={{ letterSpacing: -0.3 }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Description */}
        {subtitle && (
          <Text
            className="font-manrope text-[11px] text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

export default AdminModuleCard;
