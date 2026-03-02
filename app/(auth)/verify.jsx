import { View, TextInput, Text, Pressable } from "react-native";
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
      console.log("Success result:", result);
      router.replace("/(protected)/");
    },
    onError: (error) => {
      router.replace("/login");
    },
  });
  console.log("VERIFY", email);

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
    <View className=" flex-1 items-center bg-black">
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
              className={`flex w-[70%] mx-auto justify-center items-center rounded-xl mt-10 mb-10 ${
                isPending || !canSubmit ? "bg-lime-100" : "bg-lime-400"
              }`}
              disabled={isPending || !canSubmit}
              onPress={form.handleSubmit}
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
        {error && (
          <Text className="text-red-500 mt-2 text-center">{error.message}</Text>
        )}
      </View>
    </View>
  );
}
