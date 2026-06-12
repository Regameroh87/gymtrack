// React Native
import {
  Text,
  View,
  TextInput,
  Image,
  Pressable,
  useWindowDimensions,
} from "react-native";

// Librerías
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";

// Auth
import sendCodeVerify from "../../src/auth/lib/sendCode.js";

// Componentes
import Screen from "../../src/components/Screen";
import DevLoginPanel from "../../src/components/dev-login-panel.jsx";

// Assets
import { Barbell, Mail, ArrowRight } from "../../assets/icons";

const BG_IMAGE_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDoyQqhQRW3b2Vbr6hJyuoRkX5vGZxxyBkrnNT_8WqhkfME9l9LkLhUA_C3_k6XtyLFePmcWfsBWScKNkQmyFoSMiuWg66Dt48saP_-i2wjNYcKhOaQbBimLgaEdmin3fHsBW_-jYlb8LWwiu0WzBxde3FVh2kpvj-60rFmKDkx_4ZV6E9X1Dccci4F6HNjQKYp2TGbf-EHgPMdHlEmF7F1sujc9BfVeJY119gwEa-sQ7imnUfz3ziFPUO-LIL9C-WMtmaeGFAr9gfD";

export default function LoginWeb() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [errorSupabase, setErrorSupabase] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (email) => sendCodeVerify(email),
    onSuccess: (_data, email) => {
      router.replace({ pathname: "/verify", params: { email } });
    },
    onError: (error) => {
      setErrorSupabase(getErrorMessage(error));
      console.error(error.message, error.status);
    },
  });

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      mutate(value.email);
    },
  });

  const getErrorMessage = (err) => {
    if (!err) return null;
    if (err.status === 422)
      return "Este email no está autorizado para ingresar. Contactese con administración.";
    if (err.status === 429)
      return "Demasiados intentos. Por favor, reintentá más tarde.";
    return "Ha ocurrido un error, intente nuevamente.";
  };

  return (
    <Screen className="flex-1">
      <View className="flex-1 flex-row bg-[#0c006a]">
        {/* PANEL IZQUIERDO — Imagen + overlay + frase */}
        {isWide && (
          <View className="flex-1 relative overflow-hidden">
            <Image
              source={{ uri: BG_IMAGE_URI }}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                resizeMode: "cover",
              }}
            />
            <LinearGradient
              colors={["rgba(74, 68, 228, 0.55)", "rgba(12, 0, 106, 0.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", inset: 0 }}
              pointerEvents="none"
            />

            <View className="flex-1 justify-between p-16">
              <View className="flex-row items-center">
                <View className="p-3 rounded-2xl bg-white/15 border border-white/20 mr-3">
                  <Barbell color="#ffffff" size={24} />
                </View>
                <Text className="text-white text-xl font-jakarta-ebold tracking-tight">
                  GymTrack
                </Text>
              </View>

              <View className="max-w-[520px]">
                <Text className="text-white text-5xl font-jakarta-ebold tracking-tight leading-tight">
                  Entrena con{"\n"}Propósito.
                </Text>
                <Text className="text-[#e2dfff] font-manrope text-lg mt-6 leading-relaxed">
                  Una plataforma diseñada para que entrenadores y atletas
                  trabajen en sintonía, sesión tras sesión.
                </Text>
              </View>

              <View className="border-l-2 border-[#2DD4BF] pl-4 max-w-[520px]">
                <Text className="text-white font-manrope italic text-base leading-relaxed">
                  "La disciplina es el puente entre las metas y los logros."
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* PANEL DERECHO — Form */}
        <View className="flex-1 items-center justify-center px-6 py-12 bg-[#1c1c24]">
          <View className="w-full max-w-[440px]">
            {/* Branding compacto cuando no hay panel izquierdo */}
            {!isWide && (
              <View className="items-center mb-10">
                <View className="p-3 rounded-full bg-[#4a44e4]/20 border border-[#4a44e4]/30 mb-4">
                  <Barbell color="#ffffff" size={32} />
                </View>
                <Text className="text-white text-3xl font-jakarta-ebold tracking-tight">
                  GymTrack
                </Text>
              </View>
            )}

            <View className="mb-8">
              <Text className="text-white text-3xl font-jakarta-ebold tracking-tight">
                Iniciar sesión
              </Text>
              <Text className="text-[#c2c1ff] font-manrope mt-2 text-base">
                Ingresa tu email para recibir un enlace de acceso mágico.
              </Text>
            </View>

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
                <View className="w-full">
                  <Text className="font-manrope-bold text-sm text-[#e2dfff] mb-2 px-1">
                    Correo electrónico
                  </Text>
                  <View className="flex-row items-center border border-[#4a44e4]/40 rounded-2xl bg-[#0c006a]/40 px-4 py-1 hover:border-[#4a44e4] focus-within:border-[#4a44e4] transition">
                    {field.state.value === "" && (
                      <Mail color="#c2c1ff" size={20} />
                    )}
                    <TextInput
                      className="flex-1 h-14 ml-3 text-white font-manrope text-base outline-none"
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
                      onSubmitEditing={() => form.handleSubmit()}
                    />
                  </View>

                  <View className="min-h-10 mt-1 px-1">
                    {field.state.meta.errors.length > 0 &&
                      (field.state.meta.isBlurred ||
                        form.state.submissionAttempts > 0) && (
                        <Text className="text-[#ffdad6] mt-1 text-sm font-manrope-bold">
                          {field.state.meta.errors[0]}
                        </Text>
                      )}
                    {errorSupabase && (
                      <Text className="text-[#ffdad6] mt-1 text-sm font-manrope-bold">
                        {errorSupabase}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Pressable
                  className={`flex-row w-full p-4 justify-center items-center rounded-2xl mt-2 transition ${
                    isPending || !canSubmit
                      ? "bg-[#4a44e4]/60 border border-[#4a44e4]/30"
                      : "bg-[#4a44e4] border border-[#d6d4ff]/30 hover:bg-[#3a34d4] hover:scale-[1.01]"
                  }`}
                  disabled={isPending || !canSubmit}
                  onPress={() => form.handleSubmit()}
                  style={{
                    cursor: isPending || !canSubmit ? "not-allowed" : "pointer",
                  }}
                >
                  <Text
                    className={`font-manrope-bold text-lg mr-2 ${
                      isPending || !canSubmit ? "text-white/60" : "text-white"
                    }`}
                  >
                    {isPending ? "Procesando..." : "Continuar"}
                  </Text>
                  {!isPending && (
                    <ArrowRight
                      color={!canSubmit ? "rgba(255,255,255,0.6)" : "white"}
                      size={20}
                    />
                  )}
                </Pressable>
              )}
            </form.Subscribe>

            <Text className="font-manrope text-xs text-[#c2c1ff]/70 text-center mt-8">
              Al continuar aceptas nuestros términos de uso y política de
              privacidad.
            </Text>

            <View className="items-center">
              <DevLoginPanel />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
