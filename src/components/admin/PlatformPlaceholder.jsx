// React Native
import { View, Text, ScrollView } from "react-native";

// Librerías
import { LinearGradient } from "expo-linear-gradient";

// Tema
import { ui } from "../../theme/colors";
import { useGymTheme } from "../../contexts/gym-theme-context";

// Assets
import { Lock } from "../../../assets/icons";

// Placeholder reutilizable para secciones de plataforma aún no construidas
// (Usuarios globales, Facturación/suscripciones, Ajustes). Mantiene el lenguaje
// visual del placeholder de contabilidad pero parametrizable.
export default function PlatformPlaceholder({
  kicker,
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  features = [],
}) {
  const { brandPrimary } = useGymTheme();
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-end justify-between mb-6">
        <View>
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Plataforma
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-brandSecondary-500 tracking-[1.4px] uppercase">
              {kicker}
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            {title}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            {subtitle}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 bg-white rounded-xl px-3.5 py-2 border border-ui-input-border">
          <Lock size={12} color={ui.text.muted} />
          <Text className="text-xs font-manrope-semi text-ui-text-muted tracking-wider uppercase">
            Próximamente
          </Text>
        </View>
      </View>

      {/* Hero */}
      <LinearGradient
        colors={[brandPrimary[800], brandPrimary[600], brandPrimary[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          padding: 36,
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <View className="absolute -right-16 -top-16 w-[220px] h-[220px] rounded-full bg-white/[0.04]" />
        <View className="absolute right-[120px] -bottom-[60px] w-[160px] h-[160px] rounded-full bg-white/[0.04]" />

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400" />
              <Text className="text-[11px] font-manrope-semi text-white/65 tracking-[1.4px] uppercase">
                Módulo en construcción
              </Text>
            </View>
            <Text className="text-[30px] font-jakarta-bold text-white tracking-tight mb-2.5">
              {title}
            </Text>
            <Text className="text-[13px] font-manrope text-white/55 leading-5 max-w-[440px]">
              {description}
            </Text>
          </View>

          <View className="ml-8 bg-white/10 rounded-[22px] p-7 items-center justify-center border border-white/10">
            <Icon size={40} color="rgba(255,255,255,0.9)" />
            <Text className="text-[9px] font-manrope-semi text-white/55 mt-2 tracking-widest uppercase">
              {badge}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Features */}
      {features.length > 0 && (
        <>
          <Text className="mb-3 text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
            Qué traerá esta sección
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 14 }}>
            {features.map((f, i) => {
              const FIcon = f.icon;
              return (
                <View
                  key={i}
                  className="bg-white rounded-[16px] p-5 border border-ui-input-border"
                  style={{ width: "calc(50% - 7px)" }}
                >
                  <View className="flex-row items-start gap-3.5">
                    <View
                      className={`w-[42px] h-[42px] rounded-xl items-center justify-center ${f.bubble}`}
                    >
                      <FIcon size={18} color={f.color} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-[14px] font-jakarta-bold text-ui-text-main tracking-tight">
                          {f.title}
                        </Text>
                        <View className="bg-ui-background-light px-1.5 py-0.5 rounded-md">
                          <Text className="text-[9px] font-manrope-bold tracking-wider uppercase text-ui-text-muted">
                            Soon
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[11px] font-manrope text-ui-text-muted leading-4">
                        {f.sub}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
