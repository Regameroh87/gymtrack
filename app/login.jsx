import { Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import Screen from "../src/components/Screen";

export default function Login() {
  // Dentro de tu AuthProvider
  const logIn = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Esto asegura que si el usuario no existe en tu "lista blanca",
        // Supabase no lo cree automáticamente (si tienes el registro cerrado)
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("Error al enviar código:", error.message);
      throw error;
    }

    // Aquí no seteamos isLoggedIn(true) todavía,
    // porque falta que el usuario ingrese el código que le llegó.
  };

  // Necesitaremos una segunda función para verificar el código
  const verifyCode = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "magiclink", // o 'signup' / 'token_hash' según configures
    });

    if (!error) {
      setIsLoggedIn(true); // ¡Ahora sí está dentro!
    } else {
      throw error;
    }
  };

  return (
    <Screen safe>
      <Text className="text-2xl font-bold text-gray-900">LOGIN</Text>
      <TextInput placeholder="Email" />
    </Screen>
  );
}
