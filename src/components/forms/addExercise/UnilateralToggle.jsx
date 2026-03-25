import { View, Text, Switch } from "react-native";
import { SwitchHorizontal } from "../../../../assets/icons";
import { ui, brandPrimary, brandSecondary } from "../../../theme/colors";
import { useColorScheme } from "nativewind";

/**
 * Toggle row for the "is_unilateral" field.
 * Self-contained — reads color scheme internally.
 */
export default function UnilateralToggle({ value, onChange }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="flex-row items-center justify-between rounded-2xl bg-ui-surface-light dark:bg-ui-surface-dark"
      style={{ paddingVertical: 16, paddingHorizontal: 20 }}
    >
      <View className="flex-row items-center flex-1 mr-3">
        <SwitchHorizontal
          color={isDark ? brandSecondary[300] : brandSecondary[500]}
          size={20}
        />
        <Text className="font-manrope-semi ml-3 text-ui-text-main dark:text-ui-text-mainDark text-sm">
          ¿Es un ejercicio unilateral?
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: isDark ? ui.surface.highDark : ui.surface.dimLight,
          true: brandPrimary[600],
        }}
        thumbColor="#ffffff"
        ios_backgroundColor={isDark ? ui.surface.highDark : ui.surface.dimLight}
      />
    </View>
  );
}
