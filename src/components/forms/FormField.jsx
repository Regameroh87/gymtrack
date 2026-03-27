import { View, Text } from "react-native";

/**
 * Generic form field wrapper with a styled uppercase label.
 * Replaces the repeated <View mb-5><Text label></Text>...</View> pattern.
 */
export default function FormField({ label, children, className = "" }) {
  return (
    <View className={`mb-5 ${className}`}>
      {label ? (
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
