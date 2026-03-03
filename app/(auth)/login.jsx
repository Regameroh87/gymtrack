import { Text, View, TextInput, Image, Pressable } from "react-native";
import Screen from "../../src/components/Screen";
import { useForm } from "@tanstack/react-form";
import { LinearGradient } from "expo-linear-gradient";
import { Barbell, Mail, ArrowRight } from "../../assets/icons";
import { useRouter } from "expo-router";
import sendCodeVerify from "../../src/auth/lib/sendCode.js";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

export default function Login() {
  const router = useRouter();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (email) => sendCodeVerify(email),
    onSuccess: (_data, email) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/verify", params: { email: email } });
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(error.message, error.status);
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      mutate(value.email);
    },
  });

  // Función para traducir errores de Supabase
  const getErrorMessage = (err) => {
    if (!err) return null;
    if (err.status === 422)
      return "Este email no está autorizado para ingresar. Contactese con administración.";
    if (err.status === 429)
      return "Demasiados intentos. Por favor, reintentá más tarde.";
    return "Ha ocurrido un error, intente nuevamente.";
  };

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
          <Barbell color="#a3e635" />
        </View>
        <View className="flex items-center mt-10">
          <Text className=" text-white text-4xl font-lexend-ebold">
            Back to the Grind
          </Text>
          <Text className=" text-white font-lexend mt-2  text-xl">
            Ready to crush your goals today
          </Text>
        </View>
      </View>
      {/* FORMULARIO */}
      <View className="flex w-[90%] h-72 mt-24 pt-4 rounded-2xl items-center bg-white/70">
        <form.Field
          name="email"
          validators={{
            onChange: ({ value, fieldApi }) => {
              if (
                !fieldApi.state.meta.isBlurred &&
                fieldApi.form.state.submissionAttempts === 0
              ) {
                return undefined;
              }
              if (!value) return "El email es obligatorio";
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) return "Ingresá un email válido";
              return undefined;
            },
          }}
        >
          {(field) => (
            <View className="flex w-full px-12">
              <Text className=" font-lexend-bold text-md text-slate-600">
                Direccion de correo electrónico
              </Text>
              <View className="flex-row items-center border-gray-400 border-2 rounded-xl bg-slate-50 mt-2 px-3">
                {field.state.value === "" && (
                  <Mail color="#9ca3af" size={18} style={{ marginRight: -5 }} />
                )}
                <TextInput
                  className="flex-1 h-12 ml-2 text-black"
                  placeholder="mail@mail.com"
                  placeholderTextColor={"gray"}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={field.state.value}
                  onChangeText={(text) => field.setValue(text)}
                />
              </View>
              {/* Mostrar errores de validación */}
              {field.state.meta.errors.length > 0 && (
                <View>
                  {(field.state.meta.isBlurred ||
                    form.state.submissionAttempts > 0) && (
                    <Text className=" text-cyan-800 mt-2 text-sm font-lexend">
                      {field.state.meta.errors[0]}
                    </Text>
                  )}
                </View>
              )}
              {error && (
                <View>
                  <Text className=" text-cyan-800 mt-2 text-sm font-lexend">
                    {getErrorMessage(error)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </form.Field>
        {/* {Boton} */}
        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <Pressable
              className={`flex relative flex-row w-[70%] justify-center items-center rounded-xl p-4 mt-4 mb-2 ${
                isPending || !canSubmit ? "bg-lime-100" : "bg-lime-400"
              }`}
              disabled={isPending || !canSubmit}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                form.handleSubmit();
              }}
            >
              <Text
                className={`font-lexend-ebold text-xl ${isPending || !canSubmit ? "text-gray-600" : "text-black"} `}
              >
                {isPending ? "Enviando código..." : "Enviar código "}
              </Text>
              {!isPending && (
                <ArrowRight
                  color={`${isPending || !canSubmit ? "#4b5563" : "black"}`}
                  size={18}
                />
              )}
            </Pressable>
          )}
        </form.Subscribe>
        <Text className=" font-lexend-light text-xs px-2 text-slate-600">
          Enviaremos un código de verificación a tu correo electrónico.
        </Text>
      </View>
    </Screen>
  );
}
