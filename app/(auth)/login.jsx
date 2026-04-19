import { Text, View, TextInput, Image, Pressable } from "react-native";
import Screen from "../../src/components/Screen";
import { useForm } from "@tanstack/react-form";
import { LinearGradient } from "expo-linear-gradient";
import { Barbell, Mail, ArrowRight } from "../../assets/icons";
import { useRouter } from "expo-router";
import sendCodeVerify from "../../src/auth/lib/sendCode.js";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [errorSupabase, setErrorSupabase] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: (email) => sendCodeVerify(email),
    onSuccess: (_data, email) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/verify", params: { email: email } });
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorSupabase(getErrorMessage(error));
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
    <Screen safe className="flex-1 items-center justify-center">
      {/* FONDO */}
      <Image
        source={{
          uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoyQqhQRW3b2Vbr6hJyuoRkX5vGZxxyBkrnNT_8WqhkfME9l9LkLhUA_C3_k6XtyLFePmcWfsBWScKNkQmyFoSMiuWg66Dt48saP_-i2wjNYcKhOaQbBimLgaEdmin3fHsBW_-jYlb8LWwiu0WzBxde3FVh2kpvj-60rFmKDkx_4ZV6E9X1Dccci4F6HNjQKYp2TGbf-EHgPMdHlEmF7F1sujc9BfVeJY119gwEa-sQ7imnUfz3ziFPUO-LIL9C-WMtmaeGFAr9gfD",
        }}
        style={{
          display: "flex",
          position: "absolute",
          width: "100%",
          height: "100%",
          resizeMode: "cover",
        }}
      />

      {/* OVERLAY STITCH PULSE KINETIC (Indigo) */}
      <LinearGradient
        colors={["rgba(74, 68, 228, 0.6)", "rgba(28, 28, 36, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        pointerEvents="none"
      />

      {/* CONTENEDOR CENTRAL */}
      <View className="flex w-full items-center justify-center flex-1 -mt-10">
        {/* TITULO */}
        <View className="w-[90%] items-center mb-10 mt-6">
          <View className="self-center flex flex-row justify-center p-3 rounded-full bg-white/20 mb-6 shadow-sm shadow-[#4a44e4]/30">
            <Barbell color="#ffffff" size={36} />
          </View>
          <Text className="text-white text-5xl font-jakarta-ebold text-center tracking-tight px-1 drop-shadow-md">
            Entrena con Propósito
          </Text>
          <Text className="text-[#e2dfff] font-manrope mt-4 text-center px-4 text-lg drop-shadow-md">
            Ingresa tu email para recibir un enlace de acceso mágico.
          </Text>
        </View>

        {/* GLASS CARD FORMULARIO */}
        <View className="flex w-[85%] pt-10 pb-10 px-6 rounded-[32px] items-center bg-white/10 border border-white/20 backdrop-blur-3xl shadow-2xl shadow-[#4a44e4]/20">
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
              <View className="flex w-full">
                <Text className="font-manrope-bold text-sm text-[#e2dfff] mb-2 px-1">
                  Correo electrónico
                </Text>
                <View className="flex-row items-center border-[#4a44e4]/40 border rounded-2xl bg-[#0c006a]/40 px-4 py-1">
                  {field.state.value === "" && (
                    <Mail color="#c2c1ff" size={20} />
                  )}
                  <TextInput
                    className="flex-1 h-14 ml-3 text-white font-manrope text-base"
                    placeholder="hola@ejemplo.com"
                    placeholderTextColor={"#c2c1ff80"}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={field.state.value}
                    onChangeText={(text) => {
                      setErrorSupabase("");
                      field.setValue(text);
                    }}
                  />
                </View>
                {/* Mostrar errores de validación */}
                <View className="flex min-h-10 mt-1 px-1">
                  {field.state.meta.errors.length > 0 && (
                    <View>
                      {(field.state.meta.isBlurred ||
                        form.state.submissionAttempts > 0) && (
                        <Text className="text-[#ffdad6] mt-1 text-sm font-manrope-bold">
                          {field.state.meta.errors[0]}
                        </Text>
                      )}
                    </View>
                  )}
                  {errorSupabase && (
                    <View>
                      <Text className="text-[#ffdad6] mt-1 text-sm font-manrope-bold">
                        {errorSupabase}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </form.Field>

          {/* Boton */}
          <View className="flex items-center justify-center w-full mt-4">
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Pressable
                  className={`flex flex-row w-[100%] p-4 justify-center items-center rounded-2xl mb-6 shadow-md ${
                    isPending || !canSubmit
                      ? "bg-[#4a44e4]/60 border border-[#4a44e4]/30"
                      : "bg-[#4a44e4] border border-[#d6d4ff]/30 shadow-[#4a44e4]/50"
                  }`}
                  disabled={isPending || !canSubmit}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    form.handleSubmit();
                  }}
                >
                  <Text
                    className={`font-manrope-bold text-lg mr-2 ${isPending || !canSubmit ? "text-white/60" : "text-white"}`}
                  >
                    {isPending ? "Procesando..." : "Continuar"}
                  </Text>
                  {!isPending && (
                    <ArrowRight
                      color={`${isPending || !canSubmit ? "rgba(255,255,255,0.6)" : "white"}`}
                      size={20}
                    />
                  )}
                </Pressable>
              )}
            </form.Subscribe>
            <Text className="font-manrope italic text-[11px] px-2 text-[#c2c1ff] text-center leading-relaxed">
              "La disciplina es el puente entre las metas y los logros."
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
