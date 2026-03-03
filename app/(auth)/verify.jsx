import { View, TextInput, Text, Pressable, Button } from "react-native";
import * as Haptics from "expo-haptics";
import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { CheckMail } from "../../assets/icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import verifyCode from "../../src/auth/lib/verifyCode.js";

export default function Verify() {
  const inputRefs = useRef([]);
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (code) => verifyCode({ email, code }),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log("Success result:", result);
      router.replace("/(protected)/");
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.log("Error result:", error.message, error.status);
    },
  });
  console.log("VERIFY", email);

  const errorVerify = (error) => {
    if (error.status === 400) {
      const message = error.message.toLowerCase();

      if (message.includes("expired")) {
        return (
          <View>
            <Text className="text-cyan-800 mt-2 text-center">
              El código ha expirado, pedí uno nuevo
            </Text>
            <Button title="Reenviar código" />
          </View>
        );
      }
      if (message.includes("invalid")) {
        return (
          <Text className="text-cyan-800 mt-2 text-center">
            Código incorrecto, verificalo e intentá de nuevo
          </Text>
        );
      }
    }
    return (
      <View>
        <Text className="text-cyan-800 mt-2 text-center">
          Ha ocurrido un error, intentalo de nuevo
        </Text>
        <Button title="Reenviar código" />
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
    <View className=" flex-1 items-center justify-center bg-black">
      <View className=" flex flex-col items-center mt-12 p-6 rounded-full bg-lime-100/30">
        <CheckMail color="#65a30d" size={48} />
      </View>
      <View className=" flex items-center mt-6">
        <Text className=" font-extralight text-lg text-gray-400 ">
          Enviamos un codigo de 6 digitos a tu mail.
        </Text>
      </View>
      <View className=" mt-10 rounded-2xl items-center justify-around">
        <form.Field name="code">
          {(field) => (
            <View className="flex flex-row justify-center gap-2">
              {(field.state.value || ["", "", "", "", "", ""]).map(
                (digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className="w-12 h-14 focus:border-2 focus:border-lime-400 bg-lime-200/20 rounded-xl text-white text-center text-2xl font-lexend-bold"
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
        <form.Subscribe selector={(state) => [state.canSubmit]}>
          {([canSubmit]) => (
            <Pressable
              className={`flex w-[70%] mx-auto justify-center p-4 focus:bg-lime-600 items-center rounded-xl mt-10 mb-10 ${
                isPending || !canSubmit ? "bg-lime-100" : "bg-lime-400"
              }`}
              disabled={isPending || !canSubmit}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                form.handleSubmit();
              }}
            >
              <Text
                className={`font-lexend-ebold text-xl text-center ${
                  isPending || !canSubmit ? "text-gray-600" : "text-black"
                } `}
              >
                {isPending ? "Verificando..." : "Verificar código "}
              </Text>
            </Pressable>
          )}
        </form.Subscribe>
        {error && errorVerify(error)}
      </View>
    </View>
  );
}
