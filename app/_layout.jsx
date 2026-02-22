import "../global.css";
import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Barbell } from "../icons/barbell";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Tabs screenOptions={{ headerTitleAlign: "center" }}>
        <Tabs.Screen
          name="index"
          options={{ title: "GYMTRACK", tabBarLabel: "Inicio" }}
        />
        <Tabs.Screen
          name="rutinas/index"
          options={{
            title: "Rutinas",
            tabBarIcon: ({ color }) => (
              <Barbell color={color} width={24} height={24} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
