import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Plus } from "../../../assets/icons";
import { brandSecondary } from "../../../src/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function ButtonAdd({ route }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      className="absolute bottom-0 right-0 pr-5"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push(route);
        }}
        className="active:scale-95"
      >
        <LinearGradient
          colors={[brandSecondary[500], brandSecondary[400]]}
          className="w-14 h-14 rounded-2xl items-center justify-center shadow-xl shadow-brandSecondary-600/30"
        >
          <Plus size={28} color="#ffffff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
