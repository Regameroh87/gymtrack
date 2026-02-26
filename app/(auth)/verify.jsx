import { View, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Verify() {
  const router = useRouter();
  return (
    <View className="flex-1 mt-24 rounded-2xl items-center justify-around bg-gray-400">
      <Button title="Volver" onPress={() => router.back()} />
    </View>
  );
}
