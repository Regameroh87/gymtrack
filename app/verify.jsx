import { Text, View } from "react-native";
import { Link } from "expo-router";

export default function Verify() {
  return (
    <View className="flex w-[90%] h-72 mt-24 rounded-2xl items-center justify-around bg-white/70">
      <Link href="/login">Volver</Link>
      <Text>Verify</Text>
    </View>
  );
}
