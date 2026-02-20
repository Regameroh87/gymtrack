import { Text, View } from "react-native";
import { SafeAreaProvider, sa } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold text-red-500">INDEX</Text>
      </View>
    </SafeAreaProvider>
  );
}
