// React Native
import { View, Text, Pressable, Linking, useWindowDimensions } from "react-native";

// Librerías
import { useRouter } from "expo-router";

// Assets
import { Barbell } from "../../../assets/icons";

// Contenido
import { BRAND_NAME, NAV_LINKS, MAILTO_HREF } from "./landing-content";

export default function LandingFooter({ onNavigate }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const year = new Date().getFullYear();

  return (
    <View className="w-full border-t border-white/10 bg-[#0a0050]">
      <View className="w-full max-w-[1200px] mx-auto px-6 py-12">
        <View
          className={`gap-8 ${isWide ? "flex-row justify-between" : "flex-col"}`}
        >
          {/* Marca */}
          <View className="max-w-[320px]">
            <View className="flex-row items-center mb-3">
              <View className="p-2 rounded-xl bg-white/15 border border-white/20 mr-2.5">
                <Barbell color="#ffffff" size={18} />
              </View>
              <Text className="text-white text-lg font-jakarta-ebold tracking-tight">
                {BRAND_NAME}
              </Text>
            </View>
            <Text className="text-[#c2c1ff] font-manrope text-sm leading-relaxed">
              Gestión de gimnasios y entrenamientos personalizados. Offline-first
              y con la identidad de tu marca.
            </Text>
          </View>

          {/* Navegación */}
          <View className="gap-3">
            <Text className="text-white font-manrope-bold text-sm mb-1">
              Navegación
            </Text>
            {NAV_LINKS.map((link) => (
              <Pressable key={link.target} onPress={() => onNavigate?.(link.target)}>
                <Text className="text-[#c2c1ff] font-manrope text-sm hover:text-white transition">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Accesos */}
          <View className="gap-3">
            <Text className="text-white font-manrope-bold text-sm mb-1">
              Empezá
            </Text>
            <Pressable onPress={() => Linking.openURL(MAILTO_HREF)}>
              <Text className="text-[#c2c1ff] font-manrope text-sm hover:text-white transition">
                Solicitar demo
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/login")}>
              <Text className="text-[#c2c1ff] font-manrope text-sm hover:text-white transition">
                Iniciar sesión
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="border-t border-white/10 mt-10 pt-6">
          <Text className="text-[#c2c1ff]/60 font-manrope text-xs text-center">
            © {year} {BRAND_NAME}. Todos los derechos reservados.
          </Text>
        </View>
      </View>
    </View>
  );
}
