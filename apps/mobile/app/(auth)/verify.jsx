import { View, TextInput, Text, Pressable, Image } from "react-native";

import * as Haptics from "expo-haptics";
import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { CheckMail } from "../../assets/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import verifyCode from "../../src/auth/lib/verifyCode.js";
import sendCodeVerify from "../../src/auth/lib/sendCode.js";
import Screen from "../../src/components/Screen";
import { LinearGradient } from "expo-linear-gradient";

export default function Verify() {
  const inputRefs = useRef([]);
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (code) => verifyCode({ email, code }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      //console.log("Success result:", result);
      router.replace("/(protected)/");
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log("Error result:", error.message, error.status);
    },
  });
  //console.log("VERIFY", email);

  const errorVerify = (error) => {
    if (error.status === 400) {
      const message = error.message.toLowerCase();

      if (message.includes("expired")) {
        return (
          <View>
            <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold">
              El código ha expirado, pedí uno nuevo
            </Text>
            <Pressable
              className="p-2 rounded-xl"
              onPress={() => {
                //DEBO BORRAR EL ESTADO DEL INPUT, LOS ERRORES DE LA PETICION Y REENVIAR CODIGO
                reset();
                form.reset();
                sendCodeVerify(email);
                inputRefs.current[0]?.focus();
              }}
            >
              <Text className="text-[#c2c1ff] font-manrope-bold underline text-center">
                Reenviar código
              </Text>
            </Pressable>
          </View>
        );
      }
      if (message.includes("invalid")) {
        return (
          <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold">
            Código incorrecto, verificalo e intentá de nuevo
          </Text>
        );
      }
    }
    return (
      <View>
        <Text className="text-[#ffdad6] mt-2 text-center font-manrope-bold">
          Ha ocurrido un error, intentalo de nuevo
        </Text>
        <Pressable
          className="p-2 rounded-xl"
          onPress={() => {
            //DEBO BORRAR EL ESTADO DEL INPUT, LOS ERRORES DE LA PETICION Y REENVIAR CODIGO
            reset();
            form.reset();
            sendCodeVerify(email);
            inputRefs.current[0]?.focus();
          }}
        >
          <Text className="text-[#c2c1ff] font-manrope-bold underline text-center">
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
      console.log("Código ingresado:", value.code.join(""));
      mutate(value.code.join(""));
    },
  });

  return (
    <Screen safe className="flex-1 items-center justify-center">
      {/* FONDO COMPARTIDO CON LOGIN */}
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

      <View className="flex w-full items-center justify-center flex-1 -mt-10">
        {/* TITULO */}
        <View className="w-[90%] items-center mb-6 mt-6">
          <View className="flex flex-col items-center justify-center p-4 rounded-full bg-white/20 shadow-sm shadow-[#4a44e4]/30 mb-6">
            <CheckMail color="#ffffff" size={42} />
          </View>
          <Text className="text-white text-5xl font-jakarta-ebold text-center tracking-tight px-1 drop-shadow-md">
            Casi Listos
          </Text>
          <Text className="text-[#e2dfff] font-manrope mt-4 text-center px-4 text-lg drop-shadow-md">
            Enviamos un código de 6 dígitos de seguridad a tu mail.
          </Text>
        </View>

        {/* GLASS CARD FORMULARIO (Código OTP) */}
        <View className="flex w-[85%] pt-10 pb-8 px-4 rounded-[32px] items-center bg-white/10 border border-white/20 backdrop-blur-3xl shadow-2xl shadow-[#4a44e4]/20">
          <form.Field name="code">
            {(field) => (
              <View className="flex flex-row justify-center gap-2 mb-2 w-full">
                {(field.state.value || ["", "", "", "", "", ""]).map(
                  (digit, index) => (
                    <TextInput
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      className="w-11 h-14 border border-[#4a44e4]/30 focus:border-2 focus:border-[#c2c1ff] bg-[#0c006a]/40 rounded-xl text-white text-center text-2xl font-manrope-bold"
                      value={digit}
                      maxLength={1}
                      keyboardType="numeric"
                      onChangeText={(text) => {
                        const newCode = [
                          ...(field.state.value || ["", "", "", "", "", ""]),
                        ];
                        newCode[index] = text;
                        field.setValue(newCode);

                        // Si escribió algo, saltar al siguiente
                        if (text.length > 0 && index < 5) {
                          inputRefs.current[index + 1]?.focus();
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        // Si borra y está vacío, volver al anterior
                        if (
                          nativeEvent.key === "Backspace" &&
                          digit === "" &&
                          index > 0
                        ) {
                          inputRefs.current[index - 1]?.focus();
                        }
                      }}
                    />
                  )
                )}
              </View>
            )}
          </form.Field>

          {/* MENSAJES DE ERROR / ÉXITO DE BAJO IMPACTO VISUAL */}
          <View className="flex w-full min-h-[50px] justify-center pt-2">
            {error ? (
              errorVerify(error)
            ) : (
              <Text className="text-[#c2c1ff] font-manrope text-sm text-center">
                Revisa tu correo no deseado por si acaso
              </Text>
            )}
          </View>

          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => (
              <Pressable
                className={`flex flex-row w-[95%] p-4 justify-center items-center rounded-2xl mt-4 shadow-md ${
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
                  className={`font-manrope-bold text-lg text-center ${
                    isPending || !canSubmit ? "text-white/60" : "text-white"
                  }`}
                >
                  {isPending ? "Verificando..." : "Verificar código"}
                </Text>
              </Pressable>
            )}
          </form.Subscribe>
        </View>
      </View>
    </Screen>
  );
}
