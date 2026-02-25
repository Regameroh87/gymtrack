import { Text, Button, View, TextInput, Image } from "react-native";
import { supabase } from "../src/lib/supabase";
import Screen from "../src/components/Screen";
import { useForm } from "@tanstack/react-form";
import { LinearGradient } from "expo-linear-gradient";
import { Barbell } from "../assets/icons";

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
  /* const { logIn } = useUser();
  const router = useRouter(); */

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: ({ value }) => {
      console.log(value.email);
      enviarCodigo(value.email);
    },
  });

  return (
    <Screen safe className=" justify-center items-center">
      {/* FONDO */}
      <Image
        source={{
          uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBPWXQqN8-va4pFiXFH26fGuWPUBCqiDnW5BUNTUV_i4xKIB2zCplkf3Eyah63k73zjEWmQIBMMXwZtmJcX-jSwA9LQ7cLrwAKjaa3eOPDqpu4pYU_WN7A3Ow_DJbwWHyoYio889Ab-DOnpNXDDsGsNbTbeR_Jh7Bqx2_DGEX7ht7uqJ4hPZf74Wp_0GVziW17LORf1NibrSISa6YEhzgcFGHbP06rhBxIOq_BOksEdvCi2fzyowFkX3iK2xyNExqhonj3GyrhQkDhT",
        }}
        style={{
          display: "flex",
          position: "absolute",
          marginTop: 45,
          width: "100%",
          height: "100%",
          resizeMode: "cover",
        }}
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        pointerEvents="none"
      />
      {/* TITULO */}
      <View>
        <View className="self-center flex flex-row justify-center p-2 rounded-full bg-white/10">
          <Barbell color="#E85A2A" />
        </View>
        <View className="flex items-center">
          <Text className=" text-white text-2xl">Back to the Grind</Text>
          <Text className=" text-white">Ready to crush your goals today</Text>
        </View>
      </View>

      <form.Field
        name="email"
        validators={{
          /*   onBlur: ({ value }) => {
            if (!value) return "El email es obligatorio";
            if (!value.includes("@")) return "Ingresá un email válido";
            return undefined;
          }, */
          onChange: ({ value }) => {
            if (!value) return "El email es obligatorio";
            if (!value.includes("@")) return "Ingresá un email válido";
            return undefined;
          },
        }}
      >
        {(field) => (
          <View>
            <Text>Email:</Text>
            <TextInput
              className=" text-white"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChangeText={(text) => field.handleChange(text)}
              style={{ borderBottomWidth: 1, marginBottom: 10 }}
            />
            {/* Mostrar errores */}
            {field.state.meta.isTouched &&
              field.state.meta.errors.length > 0 && (
                <Text style={{ color: "red" }}>
                  {field.state.meta.errors.join(", ")}
                </Text>
              )}
          </View>
        )}
      </form.Field>
      {/* {Boton} */}
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button
            title={isSubmitting ? "Cargando..." : "Ingresar"}
            disabled={!canSubmit}
            onPress={form.handleSubmit} // <--- Aquí disparas el envío
          />
        )}
      </form.Subscribe>
    </Screen>
  );
}
