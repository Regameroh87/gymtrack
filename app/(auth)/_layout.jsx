import { Stack } from "expo-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/lib/getSession";
import { Redirect } from "expo-router";
const queryClient = new QueryClient();

export default function AuthLayout() {
  //! ESTO ES PARA QUE NO SE MUESTRE EL LOGIN SI YA ESTA LOGUEADO
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) {
    return <Redirect href="/(protected)/" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="verify"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
