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
      style={({ pressed }) => ({
        marginTop: 32,
        borderRadius: 12,
        overflow: "hidden",
        opacity: isDisabled ? 0.4 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
      })}
    >
      <LinearGradient
        colors={["#3023cd", "#4a44e4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 20,
          paddingHorizontal: 32,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
          shadowColor: "#312e81",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.4,
          shadowRadius: 25,
          elevation: 8,
        }}
      >
        {isLoading && <ActivityIndicator size="small" color="#ffffff" />}
        <Text style={{ fontFamily: "PlusJakartaSans_700Bold", color: "white", fontSize: 18 }}>
          {isLoading ? "Guardando..." : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
