// React Native
import { View, Text, Pressable, Linking, useWindowDimensions } from "react-native";

// Librerías
import { useRouter } from "expo-router";

// Assets
import { Barbell, ArrowRight } from "../../../assets/icons";

// Contenido
import { BRAND_NAME, NAV_LINKS, MAILTO_HREF } from "./landing-content";

export default function LandingNavbar({ onNavigate }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <View className="w-full border-b border-white/10 bg-brandPrimary-950/80">
      <View className="w-full max-w-[1200px] mx-auto flex-row items-center justify-between px-6 py-4">
        {/* Marca */}
        <Pressable
          className="flex-row items-center"
          onPress={() => onNavigate?.("top")}
        >
          <View className="p-2 rounded-xl bg-white/15 border border-white/20 mr-2.5">
            <Barbell color="#ffffff" size={20} />
          </View>
          <Text className="text-white text-lg font-jakarta-ebold tracking-tight">
            {BRAND_NAME}
          </Text>
        </Pressable>

        {/* Links de ancla (solo desktop) */}
        {isWide && (
          <View className="flex-row items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Pressable key={link.target} onPress={() => onNavigate?.(link.target)}>
                <Text className="text-brandPrimary-200 font-manrope text-base hover:text-white transition">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Acciones */}
        <View className={`flex-row items-center ${isWide ? "gap-3" : "gap-2"}`}>
          <Pressable
            className={`rounded-xl hover:bg-white/10 transition ${
              isWide ? "px-4 py-2.5" : "px-3 py-2"
            }`}
            onPress={() => router.push("/login")}
            style={{ cursor: "pointer" }}
          >
            <Text className="text-white font-manrope-bold text-sm">
              {isWide ? "Iniciar sesión" : "Ingresar"}
            </Text>
          </Pressable>

          <Pressable
            className={`flex-row items-center rounded-xl bg-brandPrimary-700 border border-white/20 hover:bg-brandPrimary-600 hover:scale-[1.02] transition ${
              isWide ? "px-4 py-2.5" : "px-3 py-2"
            }`}
            onPress={() => Linking.openURL(MAILTO_HREF)}
            style={{ cursor: "pointer" }}
          >
            <Text className="text-white font-manrope-bold text-sm mr-1.5">
              {isWide ? "Solicitar demo" : "Demo"}
            </Text>
            <ArrowRight color="#ffffff" size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
