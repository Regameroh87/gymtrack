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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";

// Auth
import verifyCode from "../../src/auth/lib/verifyCode.js";
import sendCodeVerify from "../../src/auth/lib/sendCode.js";

// Componentes
import Screen from "../../src/components/Screen";

// Assets
import { CheckMail, Barbell } from "../../assets/icons";

const BG_IMAGE_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDoyQqhQRW3b2Vbr6hJyuoRkX5vGZxxyBkrnNT_8WqhkfME9l9LkLhUA_C3_k6XtyLFePmcWfsBWScKNkQmyFoSMiuWg66Dt48saP_-i2wjNYcKhOaQbBimLgaEdmin3fHsBW_-jYlb8LWwiu0WzBxde3FVh2kpvj-60rFmKDkx_4ZV6E9X1Dccci4F6HNjQKYp2TGbf-EHgPMdHlEmF7F1sujc9BfVeJY119gwEa-sQ7imnUfz3ziFPUO-LIL9C-WMtmaeGFAr9gfD";

export default function VerifyWeb() {
  const inputRefs = useRef([]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const { email } = useLocalSearchParams();

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (code) => verifyCode({ email, code }),
    onSuccess: () => {
      router.replace("/(protected)/");
    },
    onError: (err) => {
      console.log("Error result:", err.message, err.status);
    },
  });

  const handleResend = () => {
    reset();
    form.reset();
    sendCodeVerify(email);
    inputRefs.current[0]?.focus();
  };

  const errorVerify = (err) => {
    if (err.status === 400) {
      const message = err.message.toLowerCase();
      if (message.includes("expired")) {
        return (
          <View>
            <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold text-sm">
              El código ha expirado, pedí uno nuevo
            </Text>
            <Pressable className="p-2 rounded-xl" onPress={handleResend}>
              <Text className="text-[#c2c1ff] font-manrope-bold underline text-center text-sm">
                Reenviar código
              </Text>
            </Pressable>
          </View>
        );
      }
      if (message.includes("invalid")) {
        return (
          <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold text-sm">
            Código incorrecto, verificalo e intentá de nuevo
          </Text>
        );
      }
    }
    return (
      <View>
        <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold text-sm">
          Ha ocurrido un error, intentalo de nuevo
        </Text>
        <Pressable className="p-2 rounded-xl" onPress={handleResend}>
          <Text className="text-[#c2c1ff] font-manrope-bold underline text-center text-sm">
            Reenviar código
          </Text>
        </Pressable>
      </View>
    );
  };

  const form = useForm({
    defaultValues: {
      code: ["", "", "", "", "", ""],
    },
    onSubmit: async ({ value }) => {
      mutate(value.code.join(""));
    },
  });

  return (
    <Screen className="flex-1">
      <View className="flex-1 flex-row bg-[#0c006a]">
        {/* PANEL IZQUIERDO — imagen + overlay + frase */}
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
                  Casi{"\n"}Listos.
                </Text>
                <Text className="text-[#e2dfff] font-manrope text-lg mt-6 leading-relaxed">
                  Revisá tu bandeja de entrada. Te enviamos un código de 6
                  dígitos para confirmar tu identidad.
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

        {/* PANEL DERECHO — formulario OTP */}
        <View className="flex-1 items-center justify-center px-6 py-12 bg-[#1c1c24]">
          <View className="w-full max-w-[440px]">
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

            <View className="items-center mb-8">
              <View className="p-4 rounded-full bg-[#4a44e4]/20 border border-[#4a44e4]/30 mb-5">
                <CheckMail color="#c2c1ff" size={36} />
              </View>
              <Text className="text-white text-3xl font-jakarta-ebold tracking-tight text-center">
                Revisá tu correo
              </Text>
              <Text className="text-[#c2c1ff] font-manrope mt-2 text-base text-center">
                Ingresá el código de 6 dígitos que enviamos a{" "}
                <Text className="text-white font-manrope-bold">{email}</Text>
              </Text>
            </View>

            <form.Field name="code">
              {(field) => (
                <View className="flex-row justify-center gap-3 mb-2 w-full">
                  {(field.state.value || ["", "", "", "", "", ""]).map(
                    (digit, index) => (
                      <TextInput
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        className="w-12 h-14 border border-[#4a44e4]/40 bg-[#0c006a]/40 rounded-xl text-white text-center text-2xl font-manrope-bold focus:border-[#c2c1ff]"
                        style={{ outline: "none", cursor: "text" }}
                        value={digit}
                        maxLength={1}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          const newCode = [
                            ...(field.state.value || [
                              "",
                              "",
                              "",
                              "",
                              "",
                              "",
                            ]),
                          ];
                          newCode[index] = text;
                          field.setValue(newCode);
                          if (text.length > 0 && index < 5) {
                            inputRefs.current[index + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Backspace" &&
                            digit === "" &&
                            index > 0
                          ) {
                            inputRefs.current[index - 1]?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          if (pasted.length === 0) return;
                          const newCode = ["", "", "", "", "", ""];
                          for (let i = 0; i < 6; i++) {
                            newCode[i] = pasted[i] || "";
                          }
                          field.setValue(newCode);
                          const focusIndex = Math.min(pasted.length, 5);
                          inputRefs.current[focusIndex]?.focus();
                        }}
                      />
                    )
                  )}
                </View>
              )}
            </form.Field>

            <View className="min-h-[50px] w-full justify-center pt-2 mb-2">
              {error ? (
                errorVerify(error)
              ) : (
                <Text className="text-[#c2c1ff] font-manrope text-sm text-center">
                  Revisá tu correo no deseado por si acaso
                </Text>
              )}
            </View>

            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Pressable
                  className={`flex-row w-full p-4 justify-center items-center rounded-2xl transition ${
                    isPending || !canSubmit
                      ? "bg-[#4a44e4]/60 border border-[#4a44e4]/30"
                      : "bg-[#4a44e4] border border-[#d6d4ff]/30 hover:bg-[#3a34d4] hover:scale-[1.01]"
                  }`}
                  disabled={isPending || !canSubmit}
                  onPress={() => form.handleSubmit()}
                  style={{
                    cursor:
                      isPending || !canSubmit ? "not-allowed" : "pointer",
                  }}
                >
                  <Text
                    className={`font-manrope-bold text-lg text-center ${
                      isPending || !canSubmit ? "text-white/60" : "text-white"
                    }`}
                  >
                    {isPending ? "Verificando..." : "Verificar código"}
                  </Text>
                </Pressable>
              )}
            </form.Subscribe>

            <Text className="font-manrope text-xs text-[#c2c1ff]/70 text-center mt-8">
              ¿No recibiste el código?{" "}
              <Text
                className="text-[#c2c1ff] underline"
                onPress={handleResend}
                style={{ cursor: "pointer" }}
              >
                Reenviar
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
