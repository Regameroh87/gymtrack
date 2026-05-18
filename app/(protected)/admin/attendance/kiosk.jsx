import { View, Text } from "react-native";
import Screen from "../../../../src/components/Screen";

export default function AttendanceKioskMobile() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-base font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark text-center">
          Kiosko de check-in
        </Text>
        <Text className="mt-2 text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
          El kiosko se abre desde el panel web en una tablet o monitor de
          recepción.
        </Text>
      </View>
    </Screen>
  );
}
