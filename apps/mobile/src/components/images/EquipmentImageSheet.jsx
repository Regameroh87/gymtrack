import { View, Text } from "react-native";
import { useState, useCallback } from "react";
import { useSheetBackHandler } from "../../hooks/use-sheet-back-handler";

import { BottomSheetModal, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";

import { ui } from "@gymtrack/core/colors";

const SNAP_POINTS = ["55%"];
const HEADER_HEIGHT = 56;

export default function EquipmentImageSheet({ sheetRef, imageUri, name }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  useSheetBackHandler(sheetRef, isOpen);

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

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onChange={(index) => setIsOpen(index >= 0)}
      backgroundStyle={{
        backgroundColor: isDark ? ui.surface.dark : ui.surface.light,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark
          ? ui.surfaceSecondary.dark
          : ui.surfaceSecondary.light,
        width: 40,
        height: 4,
        borderRadius: 2,
      }}
    >
      <View
        style={{
          height: HEADER_HEIGHT,
          paddingHorizontal: 20,
          justifyContent: "center",
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontFamily: "PlusJakartaSans_700Bold",
            color: isDark ? ui.text.mainDark : ui.text.main,
          }}
        >
          {name ?? "Equipamiento"}
        </Text>
      </View>

      <View style={{ flex: 1, padding: 20, paddingTop: 8 }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ flex: 1, borderRadius: 16 }}
            contentFit="contain"
          />
        ) : null}
      </View>
    </BottomSheetModal>
  );
}
