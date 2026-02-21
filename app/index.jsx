import { Text } from "react-native";
import Screen from "../src/components/Screen";
import { Link } from "expo-router";

export default function Index() {
  return (
    <Screen>
      <Text className="text-2xl font-bold text-red-500">INDEX</Text>
      <Link href="/rutinas">Rutinas</Link>
    </Screen>
  );
}
