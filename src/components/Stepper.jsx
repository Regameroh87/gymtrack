import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function Stepper({ value, onChange, min, max, unit, zeroLabel }) {
  const canDecrease = value > min;
  const canIncrease = max == null || value < max;
  const showZeroLabel = zeroLabel && value === 0;

  return (
    <View className="flex-row items-center bg-ui-input-light dark:bg-ui-input-dark rounded-xl border border-ui-input-border overflow-hidden">
      <Pressable
        onPress={() => {
          if (!canDecrease) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value - 1);
        }}
        disabled={!canDecrease}
        hitSlop={4}
        className="w-14 h-14 items-center justify-center active:opacity-50"
        style={{ opacity: canDecrease ? 1 : 0.3 }}
      >
        <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark leading-none">
          −
        </Text>
      </Pressable>

      <View className="flex-1 items-center py-2 border-x border-ui-input-border">
        {showZeroLabel ? (
          <Text className="text-base font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark leading-tight py-2">
            {zeroLabel}
          </Text>
        ) : (
          <>
            <Text className="text-3xl font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark leading-tight">
              {value}
            </Text>
            <Text className="text-[10px] font-manrope-semi uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
              {unit}
            </Text>
          </>
        )}
      </View>

      <Pressable
        onPress={() => {
          if (!canIncrease) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(value + 1);
        }}
        disabled={!canIncrease}
        hitSlop={4}
        className="w-14 h-14 items-center justify-center active:opacity-50"
        style={{ opacity: canIncrease ? 1 : 0.3 }}
      >
        <Text className="text-2xl font-jakarta text-ui-text-main dark:text-ui-text-mainDark leading-none">
          +
        </Text>
      </Pressable>
    </View>
  );
}
