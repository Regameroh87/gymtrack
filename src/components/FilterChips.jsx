import React from "react";
import { ScrollView, Text, Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Chips de filtrado horizontal.
 * Estilo Kinetic Precision con soporte light/dark.
 */
const FilterChips = ({
  options = [],
  selected,
  onSelect,
  containerStyle = "",
}) => {
  return (
    <View className={`mb-5 ${containerStyle}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {options.map((option, idx) => {
          const isActive = selected === option;
          return (
            <Pressable
              key={idx}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option);
              }}
              className={`mr-2 px-4 py-2 rounded-lg border ${
                isActive
                  ? "bg-brandPrimary-600 dark:bg-brandPrimary-500 border-brandPrimary-600 dark:border-brandPrimary-500"
                  : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
              }`}
            >
              <Text
                className={`text-[12px] font-jakarta-semi ${
                  isActive
                    ? "text-white"
                    : "text-ui-text-muted dark:text-ui-text-mutedDark"
                }`}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default FilterChips;
