// React Native
import { ActivityIndicator, Pressable, Text } from "react-native";

// Librerías externas
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

// Tema
import { useGymTheme } from "../../contexts/gym-theme-context";

export default function SubmitButton({
  onPress,
  label = "Guardar",
  isLoading = false,
  disabled = false,
  icon: Icon = null,
}) {
  const { brandPrimary } = useGymTheme();
  const isDisabled = isLoading || disabled;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className="active:scale-[0.97] mt-8"
      style={{ opacity: isDisabled ? 0.5 : 1 }}
    >
      <LinearGradient
        colors={[brandPrimary[600], brandPrimary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="py-4 rounded-2xl items-center flex-row justify-center"
        style={{ gap: 8 }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : Icon ? (
          <Icon size={17} color="white" />
        ) : null}
        <Text className="text-white font-jakarta-semi">
          {isLoading ? "Guardando..." : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
