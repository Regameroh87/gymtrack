import { forwardRef } from "react";
import { View, TextInput } from "react-native";
import { ui } from "../../theme/colors";

const StyledTextInput = forwardRef(function StyledTextInput(
  { icon, error, ...props },
  ref
) {
  return (
    <View className="flex relative">
      {icon && (
        <View className="absolute top-0 left-1 translate-y-1/2 z-10 rotate-45">
          {icon}
        </View>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={ui.placeholder.light}
        value={props.value}
        onChangeText={props.onChangeText}
        onFocus={props.onFocus}
        className={` bg-ui-input-light dark:bg-ui-input-dark border rounded-xl p-4 text-ui-text-main dark:text-ui-text-mainDark font-manrope ${
          icon ? "pl-10" : ""
        } ${error ? "border-red-500/50" : "border-ui-input-border"}`}
        {...props}
      />
    </View>
  );
});

export default StyledTextInput;
