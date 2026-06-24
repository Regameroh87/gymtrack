// React Native
import { View, ScrollView } from "react-native";
import { useRef } from "react";

// Secciones
import LandingNavbar from "./landing-navbar";
import HeroSection from "./hero-section";
import FeaturesSection from "./features-section";
import SegmentsSection from "./segments-section";
import CtaSection from "./cta-section";
import LandingFooter from "./landing-footer";

// Composición principal de la landing pública (solo web).
// Es dueña del ScrollView y resuelve el scroll a anclas por sección.
export default function LandingPage() {
  const scrollRef = useRef(null);
  const positions = useRef({}); // target -> y dentro del contenido scrolleable

  // Devuelve un handler onLayout que registra la posición Y de la sección.
  const registerSection = (target) => (e) => {
    positions.current[target] = e.nativeEvent.layout.y;
  };

  const handleNavigate = (target) => {
    if (target === "top") {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const y = positions.current[target];
    if (y != null) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

  return (
    <View className="flex-1 bg-brandPrimary-950">
      <LandingNavbar onNavigate={handleNavigate} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View onLayout={registerSection("top")}>
          <HeroSection />
        </View>

        <View onLayout={registerSection("features")}>
          <FeaturesSection />
        </View>

        <View onLayout={registerSection("segments")}>
          <SegmentsSection />
        </View>

        <View onLayout={registerSection("contact")}>
          <CtaSection />
        </View>

        <LandingFooter onNavigate={handleNavigate} />
      </ScrollView>
    </View>
  );
}
