import { View, TextInput } from "react-native";
import { ui } from "../../theme/colors";

/**
 * Base styled TextInput for the form.
 * Accepts an optional `icon` prop to render a leading icon on the left.
 */
export default function StyledTextInput({ icon, ...props }) {
  return (
    <View className="flex relative">
      {icon && (
        <View className="absolute top-0 left-1 translate-y-1/2 z-10 rotate-45">
          {icon}
        </View>
      )}
      <TextInput
        placeholderTextColor={ui.text.muted}
        value={props.value}
        onChangeText={props.onChangeText}
        onFocus={props.onFocus}
        className={`bg-ui-surface-highLight border border-ui-input-border dark:bg-ui-surface-highDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope ${icon ? "pl-10" : ""}`}
        {...props}
      />
    </View>
  );
}
