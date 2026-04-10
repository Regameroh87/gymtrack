import { View, Text } from "react-native";

/**
 * Generic form field wrapper with a styled uppercase label.
 * Replaces the repeated <View mb-5><Text label></Text>...</View> pattern.
 */
export default function FormField({ label, children, error, className = "" }) {
  return (
    <View className={`mb-5 ${className}`}>
      {label ? (
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-[11px] mt-1.5 ml-1 font-manrope-semi italic">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
