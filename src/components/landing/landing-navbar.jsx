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
    <View className="w-full border-b border-white/10 bg-[#0c006a]/80">
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
                <Text className="text-[#c2c1ff] font-manrope text-base hover:text-white transition">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Acciones */}
        <View className="flex-row items-center gap-3">
          <Pressable
            className="px-4 py-2.5 rounded-xl hover:bg-white/10 transition"
            onPress={() => router.push("/login")}
            style={{ cursor: "pointer" }}
          >
            <Text className="text-white font-manrope-bold text-sm">
              Iniciar sesión
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center px-4 py-2.5 rounded-xl bg-[#4a44e4] border border-[#d6d4ff]/30 hover:bg-[#3a34d4] hover:scale-[1.02] transition"
            onPress={() => Linking.openURL(MAILTO_HREF)}
            style={{ cursor: "pointer" }}
          >
            <Text className="text-white font-manrope-bold text-sm mr-1.5">
              Solicitar demo
            </Text>
            <ArrowRight color="#ffffff" size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
