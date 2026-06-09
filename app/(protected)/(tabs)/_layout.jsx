import { Tabs } from "expo-router";
import { Barbell, Home, Logs, ShieldHalf } from "../../../assets/icons";
import { useUserRole } from "../../../src/hooks/shared/use-user-role";
import { Pressable, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { ui } from "../../../src/theme/colors";
import { useGymTheme } from "../../../src/contexts/gym-theme-context";

export default function TabsLayout() {
  const { isStaff } = useUserRole();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: isDark ? ui.background.dark : ui.background.light,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontFamily: "Lexend_700Bold",
          color: isDark ? ui.text.mainDark : ui.text.main,
        },
        headerRight: () => (
          <Pressable
            onPress={() => toggleColorScheme()}
            className="mr-4 bg-ui-secondary-light dark:bg-ui-secondary-dark p-2 rounded-lg active:opacity-70"
          >
            <Text className="text-xs font-bold text-ui-text-main dark:text-ui-text-mainDark uppercase">
              {colorScheme}
            </Text>
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: isDark ? ui.background.dark : ui.background.light,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: brandPrimary[500],
        tabBarInactiveTintColor: isDark ? ui.text.mutedDark : ui.text.muted,
      }}
    >
      <Tabs.Screen
        name="(home)/index"
        options={{
          title: "GYMTRACK",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => (
            <Home color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="registros"
        options={{
          title: "Registros",
          headerShown: false,
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => (
            <Logs color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="planes"
        options={{
          title: "Planes",
          popToTopOnBlur: true,
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Barbell color={color} width={24} height={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          headerShown: false,
          href: isStaff ? undefined : null,
          popToTopOnBlur: true,
          tabBarIcon: ({ color }) => (
            <ShieldHalf color={color} width={24} height={24} />
          ),
        }}
      />
    </Tabs>
  );
}
