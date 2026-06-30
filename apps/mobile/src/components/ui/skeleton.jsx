// ── React Native ──
import { View } from "react-native";

// ── React ──
import { useEffect } from "react";

// ── Reanimated ──
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// Placeholder con pulse para estados de carga. Reserva el alto/ancho exacto del
// contenido real para que, al llegar los datos, nada se mueva (sin layout-shift).
// El color va por Tailwind sobre un View interno; el Animated.View externo solo
// anima la opacidad (className en Animated.View de reanimated no es confiable).
export function Skeleton({ width, height, radius = 8, style }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 750, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ width, height }, animatedStyle, style]}>
      <View
        className="flex-1 bg-ui-text-main/10 dark:bg-white/10"
        style={{ borderRadius: radius }}
      />
    </Animated.View>
  );
}
