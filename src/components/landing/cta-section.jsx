// React Native
import { View, Text, Pressable, Linking } from "react-native";

// Librerías
import { LinearGradient } from "expo-linear-gradient";

// Assets
import { ArrowRight, Mail, Phone } from "../../../assets/icons";

// Contenido
import {
  CTA,
  CONTACT_EMAIL,
  MAILTO_HREF,
  WHATSAPP_HREF,
} from "./landing-content";

export default function CtaSection() {
  return (
    <View className="w-full">
      <View className="w-full max-w-[1100px] mx-auto px-6 py-16">
        <View className="rounded-[32px] overflow-hidden border border-[#4a44e4]/40">
          <LinearGradient
            colors={["#3023cd", "#4a44e4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 56, paddingHorizontal: 32 }}
          >
            <View className="items-center">
              <Text className="text-white font-jakarta-ebold text-3xl lg:text-4xl tracking-tight text-center max-w-[640px]">
                {CTA.title}
              </Text>
              <Text className="text-[#e2dfff] font-manrope text-lg mt-4 text-center max-w-[560px] leading-relaxed">
                {CTA.subtitle}
              </Text>

              <View className="flex-row flex-wrap items-center justify-center gap-3 mt-9">
                <Pressable
                  className="flex-row items-center px-6 py-4 rounded-2xl bg-white hover:scale-[1.02] transition"
                  onPress={() => Linking.openURL(MAILTO_HREF)}
                  style={{ cursor: "pointer" }}
                >
                  <Mail color="#4a44e4" size={18} />
                  <Text className="text-[#3023cd] font-manrope-bold text-base mx-2">
                    {CTA.primary}
                  </Text>
                  <ArrowRight color="#4a44e4" size={18} />
                </Pressable>

                <Pressable
                  className="flex-row items-center px-6 py-4 rounded-2xl bg-white/10 border border-white/30 hover:bg-white/20 transition"
                  onPress={() => Linking.openURL(WHATSAPP_HREF)}
                  style={{ cursor: "pointer" }}
                >
                  <Phone color="#ffffff" size={18} />
                  <Text className="text-white font-manrope-bold text-base ml-2">
                    WhatsApp
                  </Text>
                </Pressable>
              </View>

              <Pressable onPress={() => Linking.openURL(MAILTO_HREF)}>
                <Text className="text-[#e2dfff] font-manrope text-sm mt-6 underline">
                  {CONTACT_EMAIL}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}
