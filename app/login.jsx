import { Text, Button } from "react-native";
import { supabase } from "../src/lib/supabase";
import Screen from "../src/components/Screen";
import { useUser } from "../src/lib/authContext";
import { useRouter } from "expo-router";

export default function Login() {
  const enviarCodigo = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Importante: Al poner false, si el mail no existe en tu lista,
        // Supabase no enviará nada ni creará un usuario nuevo.
        shouldCreateUser: false,
        // Puedes redirigir a una web después, pero para App móvil
        // usualmente el usuario solo espera el código.
        emailRedirectTo: "tuapp://login",
      },
    });

    if (error) {
      console.error("Error al enviar:", error.message);
      throw error;
    }

    alert("Revisa tu bandeja de entrada, te enviamos un código.");
  };
  const { logIn } = useUser();
  const router = useRouter();

  return (
    <Screen safe className=" justify-center items-center">
      <Text className="text-2xl font-bold text-gray-900">LOGIN</Text>
      <Button
        title="Log In"
        onPress={async () => {
          /*  logIn();
          router.replace("/"); */
          enviarCodigo("gamero.rodrigo@gmail.com");
        }}
      />
    </Screen>
  );
}
