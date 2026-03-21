import { Tabs, Redirect } from "expo-router";
import { Barbell, Home, Logs } from "../../assets/icons";
import { useAuth } from "../../src/auth/lib/getSession";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { ui } from "../../src/theme/colors";

export default function ProtectedLayout() {
  const { isLoggedIn, loading } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  console.log("colorScheme", colorScheme);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando sesión...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: isDark ? ui.card.dark : ui.card.light,
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
          backgroundColor: isDark ? ui.card.dark : ui.card.light,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: "#6366f1", // brandPrimary[500]
        tabBarInactiveTintColor: isDark ? ui.text.mutedDark : ui.text.muted,
      }}
    >
      <Tabs.Screen
        name="index"
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
          tabBarIcon: ({ color }) => (
            <Logs color={color} width={24} height={24} />
          ),
        }}
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
  );
}
