import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Search, X } from "../../assets/icons";
import { ui } from "../theme/colors";

/**
 * Barra de búsqueda editorial.
 * Estilo Kinetic Precision con soporte light/dark.
 */
const SearchBar = ({
  placeholder = "Buscar...",
  value,
  onChangeText,
  containerStyle = "",
}) => {
  return (
    <View className={`px-5 mb-4 ${containerStyle}`}>
      <View className="flex-row items-center bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl px-3.5 py-3">
        <Search
          size={18}
          className="text-ui-text-muted dark:text-ui-text-mutedDark"
        />
        <TextInput
          className="flex-1 ml-2.5 font-manrope text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
          placeholder={placeholder}
          placeholderTextColor={ui.text.muted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
        />
        {value?.length > 0 && (
          <Pressable onPress={() => onChangeText("")} className="p-1">
            <X
              size={14}
              className="text-ui-text-muted dark:text-ui-text-mutedDark"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default SearchBar;
