import { Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "../../../assets/icons";
import { useGymTheme } from "../../contexts/gym-theme-context";

export default function ButtonAddPill({ onPress }) {
  const { brandPrimary } = useGymTheme();
  return (
    <Pressable onPress={onPress} className="active:scale-[0.95]">
      <LinearGradient
        colors={[brandPrimary[600], brandPrimary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="w-10 h-10 rounded-xl items-center justify-center"
      >
        <Plus size={18} color="white" />
      </LinearGradient>
    </Pressable>
  );
}
