import React, { useRef, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { ui } from "../theme/colors";
import { useColorScheme } from "nativewind";

const CustomSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  snapPoints = ["50%"],
  isDark = false, // Podríamos usar useColorScheme de NativeWind pero lo pasamos para simplificar o lo deducimos
}) => {
  const bottomSheetModalRef = useRef(null);
  const { colorScheme } = useColorScheme();
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
    <View className=" flex w-full mb-4">
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
          backgroundColor:
            colorScheme === "dark" ? ui.card.dark : ui.card.light,
        }}
        handleIndicatorStyle={{
          backgroundColor:
            colorScheme === "dark" ? ui.secondary.dark : ui.secondary.light,
        }}
      >
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item) => item.value.toString()}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100, // Espacio extra al final
          }}
          ListHeaderComponent={() => (
            <Text className="text-lg font-lexend-bold text-ui-text-main dark:text-ui-text-mainDark mb-6 mt-6">
              {label ? `Seleccionar ${label.toLowerCase()}` : "Seleccionar"}
            </Text>
          )}
          renderItem={({ item: option }) => (
            <Pressable
              onPress={() => {
                onChange(option.value);
                bottomSheetModalRef.current?.dismiss();
              }}
              className={`p-4 mb-2 rounded-xl flex-row justify-between items-center bg-ui-secondary-light dark:bg-ui-secondary-dark ${
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
          )}
        />
      </BottomSheetModal>
    </View>
  );
};

export default CustomSelect;
