import { Pressable, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Gradient submit button for the exercise form.
 */
export default function SubmitButton({
  onPress,
  label = "Guardar Ejercicio",
  isLoading = false,
  disabled = false,
}) {
  const isDisabled = isLoading || disabled;
  return (
    <Pressable
      onPress={isDisabled ? null : onPress}
      disabled={isDisabled}
      className={`mt-8 rounded-xl overflow-hidden ${isDisabled ? "opacity-40" : "active:scale-[0.97]"}`}
    >
      <LinearGradient
        colors={["#3023cd", "#4a44e4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="py-5 px-8 items-center flex-row justify-center gap-3"
        style={{
          shadowColor: "#312e81",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.4,
          shadowRadius: 25,
          elevation: 8,
        }}
      >
        {isLoading && <ActivityIndicator size="small" color="#ffffff" />}
        <Text className="font-jakarta-bold text-white text-lg">
          {isLoading ? "Guardando..." : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
