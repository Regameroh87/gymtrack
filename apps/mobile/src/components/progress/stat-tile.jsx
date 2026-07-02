// Tile de estadística compartido por las secciones de la pestaña Progreso.
import { Text, View } from "react-native";

export default function StatTile({ value, label, accent, Icon }) {
  return (
    <View className="flex-1 bg-ui-surface-light dark:bg-ui-surface-dark rounded-2xl px-4 py-3.5 border border-ui-input-border overflow-hidden">
      <View
        className="absolute rounded-full"
        style={{
          width: 64,
          height: 64,
          top: -24,
          right: -24,
          backgroundColor: accent,
          opacity: 0.1,
        }}
      />
      {Icon && <Icon size={16} color={accent} />}
      <Text
        className="font-jakarta-bold text-[24px] leading-[28px] mt-1"
        style={{ color: accent }}
      >
        {value}
      </Text>
      <Text className="text-[10px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
        {label}
      </Text>
    </View>
  );
}
