// React Native
import { View, Text, useWindowDimensions } from "react-native";

// Componentes
import LandingIcon from "./landing-icon";
import { CheckCircle } from "../../../assets/icons";

// Contenido
import { SEGMENTS } from "./landing-content";

// Acento mint del SaaS (brandSecondary-300) para íconos sobre fondo oscuro.
const ACCENT = "#62fae3";

export default function SegmentsSection() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <View className="w-full">
      <View className="w-full max-w-[1200px] mx-auto px-6 py-20">
        <View className="items-center mb-14">
          <Text className="text-brandSecondary-300 font-manrope-bold text-sm tracking-widest uppercase mb-3">
            Para quién
          </Text>
          <Text className="text-white font-jakarta-ebold text-3xl lg:text-4xl tracking-tight text-center max-w-[640px]">
            Pensado para gimnasios y entrenadores
          </Text>
        </View>

        <View className={`w-full gap-6 ${isWide ? "flex-row" : "flex-col"}`}>
          {SEGMENTS.map((segment) => (
            <View
              key={segment.title}
              className="flex-1 rounded-3xl bg-white/5 border border-white/10 p-8"
            >
              <View className="flex-row items-center mb-5">
                <View className="w-12 h-12 rounded-2xl bg-brandSecondary-400/15 border border-brandSecondary-400/30 items-center justify-center mr-4">
                  <LandingIcon name={segment.icon} size={24} color={ACCENT} />
                </View>
                <Text className="text-white font-jakarta-ebold text-2xl tracking-tight">
                  {segment.title}
                </Text>
              </View>

              <Text className="text-brandPrimary-200 font-manrope text-base leading-relaxed mb-6">
                {segment.description}
              </Text>

              <View className="gap-3">
                {segment.points.map((point) => (
                  <View key={point} className="flex-row items-center">
                    <CheckCircle color={ACCENT} size={20} />
                    <Text className="text-white font-manrope text-[15px] ml-3 flex-1">
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
