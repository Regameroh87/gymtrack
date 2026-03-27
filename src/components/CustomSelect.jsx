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
    <View className="flex w-full mb-4">
      {label && (
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs font-manrope-semi mb-2 uppercase tracking-label">
          {label}
        </Text>
      )}

      {/* Trigger — surface_container_high bg, Ghost Border */}
      <Pressable
        onPress={handlePresentModalPress}
        className="bg-ui-input-light dark:bg-ui-input-dark rounded-xl p-4 flex-row justify-between items-center active:scale-[0.97]"
        style={{
          borderWidth: 1,
          borderColor: ui.input.border,
        }}
      >
        <Text
          className={`font-manrope ${
            value
              ? "text-ui-text-main dark:text-ui-text-mainDark"
              : "text-ui-text-muted dark:text-ui-text-mutedDark"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-xs">
          ▼
        </Text>
      </Pressable>

      {/* Bottom Sheet — tonal layered surface */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor:
            colorScheme === "dark" ? ui.background.dark : ui.background.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor:
            colorScheme === "dark" ? ui.background.dark : ui.background.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
      >
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item) => item.value.toString()}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
          }}
          ListHeaderComponent={() => (
            <Text className="text-lg font-jakarta tracking-editorial text-ui-text-main dark:text-ui-text-mainDark mb-6 mt-6">
              {label
                ? `Seleccionar ${label.charAt(0) + label.slice(1).toLowerCase()}`
                : "Seleccionar"}
            </Text>
          )}
          renderItem={({ item: option }) => {
            const isSelected = value === option.value;
            return (
              <Pressable
                onPress={() => {
                  onChange(option.value);
                  bottomSheetModalRef.current?.dismiss();
                }}
                className="p-4 mb-2 rounded-xl flex-row justify-between items-center active:scale-[0.97]"
                style={{
                  backgroundColor: isSelected
                    ? "rgba(48, 35, 205, 0.08)"
                    : colorScheme === "dark"
                      ? ui.background.dark
                      : ui.background.light,
                }}
              >
                <Text
                  className={`text-base font-manrope ${
                    isSelected
                      ? "text-brandPrimary-600 font-manrope-bold"
                      : "text-ui-text-main dark:text-ui-text-mainDark"
                  }`}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Text className="text-brandPrimary-600 font-manrope-bold">
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      </BottomSheetModal>
    </View>
  );
};

export default CustomSelect;
