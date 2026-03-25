import { View, TextInput } from "react-native";
import { ui } from "../../../theme/colors";

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
        className={`bg-ui-surface-highLight dark:bg-ui-surface-highDark rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope ${icon ? "pl-10" : ""}`}
        style={{
          borderWidth: 1,
          borderColor: ui.input.border,
        }}
        {...props}
      />
    </View>
  );
}
