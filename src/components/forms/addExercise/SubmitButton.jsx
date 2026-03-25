import { Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Gradient submit button for the exercise form.
 */
export default function SubmitButton({ onPress, label = "Guardar Ejercicio" }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-8 active:scale-[0.97]"
      style={{ borderRadius: 16, overflow: "hidden" }}
    >
      <LinearGradient
        colors={["#3023cd", "#4a44e4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 20,
          paddingHorizontal: 32,
          borderRadius: 16,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          shadowColor: "#312e81",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.4,
          shadowRadius: 25,
          elevation: 8,
        }}
      >
        <Text className="font-jakarta-bold text-white text-lg">{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
