import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Plus } from "../../../assets/icons";
import { useGymTheme } from "../../contexts/gym-theme-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function ButtonAdd({ route, onPress, color = "secondary" }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { brandPrimary, brandSecondary } = useGymTheme();

  const COLOR_VARIANTS = {
    primary: {
      colors: [brandPrimary[600], brandPrimary[700]],
      shadow: "shadow-brandPrimary-600/30",
    },
    secondary: {
      colors: [brandSecondary[500], brandSecondary[400]],
      shadow: "shadow-brandSecondary-600/30",
    },
  };
  const variant = COLOR_VARIANTS[color] ?? COLOR_VARIANTS.secondary;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (onPress) {
      onPress();
    } else if (route) {
      router.push(route);
    }
  };

  return (
    <View
      className="absolute bottom-0 right-0 pr-5"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <Pressable onPress={handlePress} className="active:scale-95">
        <LinearGradient
          colors={variant.colors}
          className={`w-14 h-14 rounded-2xl items-center justify-center shadow-xl ${variant.shadow}`}
        >
          <Plus size={28} color="#ffffff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
