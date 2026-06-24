// React Native
import { View, Text, Pressable, Linking, useWindowDimensions } from "react-native";

// Librerías
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

// Assets
import { ArrowRight, Flame } from "../../../assets/icons";

// Contenido
import { HERO, HERO_IMAGE_URI, MAILTO_HREF } from "./landing-content";

// Acento mint del SaaS (brandSecondary-300) para íconos sobre fondo oscuro.
const ACCENT = "#62fae3";

export default function HeroSection() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <View className="w-full overflow-hidden">
      <View className="w-full max-w-[1200px] mx-auto px-6 py-16 lg:py-24">
        <View
          className={`w-full items-center gap-12 ${
            isWide ? "flex-row justify-between" : "flex-col"
          }`}
        >
          {/* Columna de texto */}
          <View className={isWide ? "flex-1 max-w-[560px]" : "w-full items-center"}>
            <View
              className={`flex-row items-center max-w-full rounded-full bg-white/10 border border-white/15 px-4 py-1.5 mb-6 ${
                isWide ? "self-start" : "self-center"
              }`}
            >
              <Flame color={ACCENT} size={16} />
              <Text className="text-brandPrimary-200 font-manrope-bold text-xs ml-2 tracking-wide shrink">
                {HERO.eyebrow}
              </Text>
            </View>

            <Text
              className={`text-white font-jakarta-ebold tracking-tight leading-tight ${
                isWide ? "text-6xl" : "text-4xl text-center"
              }`}
            >
              {HERO.titleLead}{" "}
              <Text className="text-brandSecondary-300">{HERO.titleHighlight}</Text>{" "}
              {HERO.titleTail}
            </Text>

            <Text
              className={`text-brandPrimary-100 font-manrope text-lg mt-6 leading-relaxed ${
                isWide ? "" : "text-center"
              }`}
            >
              {HERO.subtitle}
            </Text>

            {/* CTAs */}
            <View
              className={`flex-row gap-3 mt-9 ${isWide ? "" : "justify-center flex-wrap"}`}
            >
              <Pressable
                className="flex-row items-center px-6 py-4 rounded-2xl bg-brandPrimary-700 border border-white/20 hover:bg-brandPrimary-600 hover:scale-[1.02] transition"
                onPress={() => Linking.openURL(MAILTO_HREF)}
                style={{ cursor: "pointer" }}
              >
                <Text className="text-white font-manrope-bold text-base mr-2">
                  {HERO.primaryCta}
                </Text>
                <ArrowRight color="#ffffff" size={18} />
              </Pressable>

              <Pressable
                className="px-6 py-4 rounded-2xl bg-white/5 border border-white/20 hover:bg-white/10 transition"
                onPress={() => router.push("/login")}
                style={{ cursor: "pointer" }}
              >
                <Text className="text-white font-manrope-bold text-base">
                  {HERO.secondaryCta}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Columna de imagen */}
          <View className={isWide ? "flex-1 max-w-[520px]" : "w-full max-w-[480px]"}>
            <View className="rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
              <View className="relative w-full" style={{ aspectRatio: 4 / 3 }}>
                <Image
                  source={{ uri: HERO_IMAGE_URI }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
                <LinearGradient
                  colors={["rgba(74,68,228,0.15)", "rgba(30,27,75,0.55)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ position: "absolute", inset: 0 }}
                  pointerEvents="none"
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
