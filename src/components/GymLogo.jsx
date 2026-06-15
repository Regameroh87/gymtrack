// ── React Native ──
import { View, Text } from "react-native";

// ── Expo ──
import { Image } from "expo-image";

// ── Contexts / Theme ──
import { useGymTheme } from "../contexts/gym-theme-context";

// ── Utils ──
import { getCloudinaryUrl } from "../utils/cloudinary";

/**
 * Logo del gym activo, con fallback a iniciales sobre fondo branded.
 * Replica el patrón del selector de gyms (select-gym.jsx) para que la
 * identidad del gimnasio sea visible una vez logueado, compensando que
 * el ícono nativo de la app es genérico (build-time, no runtime).
 */
export default function GymLogo({ size = 36 }) {
  const { logoUrl, gymName } = useGymTheme();
  const resolvedLogo = getCloudinaryUrl(logoUrl);

  const initials = (gymName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      className="rounded-2xl items-center justify-center overflow-hidden bg-brandPrimary-50 dark:bg-brandPrimary-950"
      style={{ width: size, height: size }}
    >
      {resolvedLogo ? (
        <Image
          source={{ uri: resolvedLogo }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text
          className="font-jakarta-bold text-brandPrimary-600 dark:text-brandPrimary-400"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
