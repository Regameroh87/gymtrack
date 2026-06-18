// React Native
import { View, Text, useWindowDimensions } from "react-native";

// Componentes
import LandingIcon from "./landing-icon";

// Contenido
import { FEATURES } from "./landing-content";

// Acento mint del SaaS (brandSecondary-300) para íconos sobre fondo oscuro.
const ACCENT = "#62fae3";

export default function FeaturesSection() {
  const { width } = useWindowDimensions();
  // Columnas responsivas: 3 en desktop, 2 en tablet, 1 en mobile.
  const columns = width >= 1000 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = `${100 / columns}%`;

  return (
    <View className="w-full">
      <View className="w-full max-w-[1200px] mx-auto px-6 py-20">
        {/* Encabezado de sección */}
        <View className="items-center mb-14">
          <Text className="text-brandSecondary-300 font-manrope-bold text-sm tracking-widest uppercase mb-3">
            Beneficios
          </Text>
          <Text className="text-white font-jakarta-ebold text-3xl lg:text-4xl tracking-tight text-center max-w-[640px]">
            Todo lo que tu gimnasio necesita, sin fricciones
          </Text>
          <Text className="text-brandPrimary-200 font-manrope text-base mt-4 text-center max-w-[560px] leading-relaxed">
            Una plataforma pensada para que entrenadores y socios trabajen en
            sintonía, sesión tras sesión.
          </Text>
        </View>

        {/* Grilla de tarjetas */}
        <View className="flex-row flex-wrap -mx-3">
          {FEATURES.map((feature) => (
            <View key={feature.title} style={{ width: cardWidth }} className="p-3">
              <View className="h-full rounded-3xl bg-white/5 border border-white/10 p-7 hover:bg-white/[0.08] hover:border-brandPrimary-700/40 transition">
                <View className="w-12 h-12 rounded-2xl bg-brandPrimary-700/20 border border-brandPrimary-700/30 items-center justify-center mb-5">
                  <LandingIcon name={feature.icon} size={24} color={ACCENT} />
                </View>
                <Text className="text-white font-jakarta-bold text-xl mb-2.5">
                  {feature.title}
                </Text>
                <Text className="text-brandPrimary-200 font-manrope text-[15px] leading-relaxed">
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
