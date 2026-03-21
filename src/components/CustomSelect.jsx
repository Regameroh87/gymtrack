import React, { useRef, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { ui } from "../theme/colors";

const CustomSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  snapPoints = ["40%"],
  isDark = true, // Podríamos usar useColorScheme de NativeWind pero lo pasamos para simplificar o lo deducimos
}) => {
  const bottomSheetModalRef = useRef(null);

  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-lexend-light mb-2 uppercase tracking-wider">
          {label}
        </Text>
      )}

      <Pressable
        onPress={handlePresentModalPress}
        className="dark:bg-ui-input-dark bg-ui-input-light border border-ui-input-border dark:border-ui-input-borderDark rounded-xl p-4 flex-row justify-between items-center active:opacity-70"
      >
        <Text
          className={`font-lexend ${value ? "text-ui-text-main dark:text-ui-text-mainDark" : "text-ui-text-muted dark:text-ui-text-mutedDark"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text className="text-ui-text-muted">▼</Text>
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? ui.card.dark : ui.card.light,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "#475569" : "#cbd5e1",
        }}
      >
        <BottomSheetView className="p-6">
          <Text className="text-lg font-lexend-bold text-ui-text-main dark:text-ui-text-mainDark mb-6">
            {label ? `Seleccionar ${label.toLowerCase()}` : "Seleccionar"}
          </Text>

          <View className="gap-2">
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  bottomSheetModalRef.current?.dismiss();
                }}
                className={`p-4 rounded-xl flex-row justify-between items-center ${
                  value === option.value
                    ? "bg-brandPrimary-500/10 border border-brandPrimary-500/20"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-base font-lexend ${
                    value === option.value
                      ? "text-brandPrimary-500 font-lexend-bold"
                      : "text-ui-text-main dark:text-ui-text-mainDark"
                  }`}
                >
                  {option.label}
                </Text>
                {value === option.value && (
                  <Text className="text-brandPrimary-500">✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default CustomSelect;
