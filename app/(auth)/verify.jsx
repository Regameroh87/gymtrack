import { View, Button, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "@tanstack/react-form";
import { useRef } from "react";

export default function Verify() {
  const router = useRouter();
  const inputRefs = useRef([]);

  const form = useForm({
    defaultValues: {
      code: ["", "", "", "", "", ""],
    },
    onSubmit: async ({ value }) => {
      console.log("Código ingresado:", value.code.join(""));
      // Aquí iría la lógica de verificación con Supabase
    },
  });

  return (
    <View className="flex-1 mt-24 rounded-2xl items-center justify-around bg-black/80">
      <form.Field name="code">
        {(field) => (
          <View className="flex flex-row justify-center gap-2">
            {(field.state.value || ["", "", "", "", "", ""]).map(
              (digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="w-12 h-14 bg-white/20 rounded-xl text-white text-center text-2xl font-lexend-bold"
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
      <Button title="Volver" onPress={() => router.back()} />
    </View>
  );
}
