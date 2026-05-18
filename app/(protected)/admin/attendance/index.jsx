import { View, Text } from "react-native";
import Screen from "../../../../src/components/Screen";

export default function AttendanceListMobile() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-base font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark text-center">
          Asistencias
        </Text>
        <Text className="mt-2 text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
          La gestión de asistencias está disponible desde el panel web.
        </Text>
      </View>
    </Screen>
  );
}
