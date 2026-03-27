import { View, TextInput } from "react-native";
import { ui } from "../../../src/theme/colors";

export default function StyledInputCard({
  icon,
  value,
  onChange,
  onFocus,
  placeholder = "Pegar URL de YouTube...",
}) {
  return (
    <View className="flex-row rounded-xl h-10 items-center overflow-hidden bg-ui-surface-highLight dark:bg-ui-surface-highDark">
      <View className="pl-4">{icon}</View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={ui.text.muted}
        className="flex-1 px-3 font-manrope text-ui-text-main dark:text-ui-text-mainDark text-xs"
      />
    </View>
  );
}
