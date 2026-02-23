import { Text, Button, View, TextInput } from "react-native";
import { supabase } from "../src/lib/supabase";
import Screen from "../src/components/Screen";
import { useUser } from "../src/lib/authContext";
import { useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";

export default function Login() {
  /*   const enviarCodigo = async (email) => {
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
  const router = useRouter(); */

  const form = useForm({
    email: "",
    onSubmit: () => console.log(""),
  });
  console.log(form);

  return (
    <Screen safe className=" justify-center items-center">
      <Text className="text-2xl font-bold text-gray-900">LOGIN</Text>
      <form.Field name="email">
        {(field) => (
          <View>
            <Text>Email:</Text>
            <TextInput
              value={field.state.value}
              onBlur={field.handleBlur}
              // En RN usamos onChangeText en lugar de onChange
              onChangeText={(text) => field.handleChange(text)}
              style={{ borderBottomWidth: 1, marginBottom: 10 }}
            />
            {/* Mostrar errores */}
            {field.state.meta.isTouched && (
              <Text style={{ color: "red" }}>{field.state.meta.errors}</Text>
            )}
          </View>
        )}
      </form.Field>
      {/* {Boton} */}
      <form.Subscribe selector={(state) => [state.canSubmit]}>
        {([canSubmit]) => (
          <Button
            title="Ingresar"
            disabled={!canSubmit}
            onPress={form.handleSubmit} // <--- Aquí disparas el envío
          />
        )}
      </form.Subscribe>
    </Screen>
  );
}
