import React, { useRef, useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { ui } from "../theme/colors";
import { useColorScheme } from "nativewind";

const CustomSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  snapPoints = ["50%", "90%"],
  searchable = true,
  actionLabel,
  onActionPress,
  error,
}) => {
  const bottomSheetModalRef = useRef(null);
  const { colorScheme } = useColorScheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handlePresentModalPress = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetModalRef.current?.present();
  }, []);

  const handleSheetChange = useCallback((index) => {
    setIsOpen(index >= 0);
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

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;
    const lowerQuery = searchQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lowerQuery)
    );
  }, [options, searchQuery, searchable]);

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
        accessibilityRole="combobox"
        accessibilityLabel={
          label
            ? `${label}: ${selectedOption?.label ?? placeholder}`
            : (selectedOption?.label ?? placeholder)
        }
        accessibilityHint="Abre una lista de opciones"
        accessibilityState={{ expanded: isOpen }}
        className={`bg-ui-input-light dark:bg-ui-input-dark rounded-xl p-4 flex-row justify-between items-center active:scale-[0.97] border ${
          error ? "border-red-500/50" : "border-ui-input-border"
        }`}
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

      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-[11px] mt-1.5 ml-1 font-manrope-semi italic">
          {error}
        </Text>
      ) : null}

      {/* Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={searchable ? 1 : 0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        keyboardBehavior="extend"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={{
          backgroundColor:
            colorScheme === "dark" ? ui.surface.dark : ui.surface.light,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor:
            colorScheme === "dark"
              ? ui.surfaceSecondary.dark
              : ui.surfaceSecondary.light,
          width: 40,
          height: 4,
          borderRadius: 2,
        }}
        onChange={handleSheetChange}
        onDismiss={() => {
          setSearchQuery("");
          setIsOpen(false);
        }}
      >
        <BottomSheetView className="px-6 pt-4 pb-2 z-10">
          <Text className="text-lg font-jakarta tracking-editorial text-ui-text-main dark:text-ui-text-mainDark mb-4">
            {label
              ? `Seleccionar ${label.charAt(0) + label.slice(1).toLowerCase()}`
              : "Seleccionar"}
          </Text>

          {searchable && (
            <BottomSheetTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar..."
              placeholderTextColor={
                colorScheme === "dark" ? ui.text.mutedDark : ui.text.muted
              }
              style={{
                backgroundColor:
                  colorScheme === "dark"
                    ? ui.surfaceSecondary.dark
                    : ui.surfaceSecondary.light,
                color: colorScheme === "dark" ? ui.text.mainDark : ui.text.main,
                padding: 14,
                borderRadius: 12,
                fontFamily: "Manrope_400Regular",
                borderWidth: 1,
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
              }}
            />
          )}
        </BottomSheetView>

        <BottomSheetFlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center p-6 mt-4">
              <Text className="text-ui-text-muted dark:text-ui-text-mutedDark text-center font-manrope">
                No se encontraron opciones para "{searchQuery}"
              </Text>
            </View>
          )}
          ListFooterComponent={() => {
            if (!actionLabel || !onActionPress) return null;
            return (
              <View className="items-center justify-center pt-4 pb-6 mt-2">
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    bottomSheetModalRef.current?.dismiss();

                    // Esperar cierre antes de disparar
                    setTimeout(() => {
                      onActionPress(searchQuery);
                    }, 400);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Crear ${actionLabel}${searchQuery ? `: ${searchQuery}` : ""}`}
                  className="px-6 py-4 border border-brandPrimary-500/30 bg-brandPrimary-600/10 dark:bg-brandPrimary-600/20 rounded-xl flex-row justify-center items-center active:scale-[0.97] w-full"
                >
                  <Text className="text-brandPrimary-600 dark:text-brandPrimary-400 font-jakarta-bold">
                    + {actionLabel} {searchQuery ? `"${searchQuery}"` : ""}
                  </Text>
                </Pressable>
              </View>
            );
          }}
          renderItem={({ item: option }) => {
            const isSelected = value === option.value;
            return (
              <Pressable
                onPress={() => {
                  onChange(option.value);
                  bottomSheetModalRef.current?.dismiss();
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{
                  checked: isSelected,
                  selected: isSelected,
                }}
                className={`p-4 mb-2 rounded-xl flex-row justify-between items-center active:scale-[0.97] border ${isSelected ? "border-brandPrimary-500/20" : "border-transparent"}`}
                style={{
                  backgroundColor: isSelected
                    ? "rgba(48, 35, 205, 0.08)"
                    : colorScheme === "dark"
                      ? ui.surfaceSecondary.dark
                      : ui.surfaceSecondary.light,
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
