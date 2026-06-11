import { useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useActiveGym } from "../../src/contexts/active-gym-context";
import { getCloudinaryUrl } from "../../src/utils/cloudinary";
import { ROLE_LABELS } from "../../src/constants/roles";
import { generateRamp } from "../../src/theme/generate-ramp";
import { brandPrimary as defaultPrimary } from "../../src/theme/colors";

// Multi-gym: el login autentica a la persona; acá elige en qué gimnasio entra.
// Cada tarjeta usa el branding del propio gym (no el theme activo) para que la
// elección sea visual. También funciona como switcher desde el perfil.
export default function SelectGymScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memberships, gymId: activeGymId, needsSelection, switchGym } =
    useActiveGym();
  const [switchingTo, setSwitchingTo] = useState(null);

  const onSelect = async (membership) => {
    if (switchingTo) return;
    if (membership.gym_id === activeGymId) {
      router.replace("/(protected)/(tabs)");
      return;
    }
    setSwitchingTo(membership.gym_id);
    try {
      await switchGym(membership.gym_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(protected)/(tabs)");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "No se pudo cambiar de gimnasio",
        text2: e?.message,
        position: "bottom",
      });
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      contentContainerStyle={{
        paddingTop: insets.top + 32,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Encabezado ── */}
      <Text className="text-[11px] font-jakarta-bold uppercase tracking-[2.5px] text-ui-text-muted mb-2">
        Tu cuenta, tus gimnasios
      </Text>
      <Text
        className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark tracking-tight mb-1"
        style={{ fontSize: 26, lineHeight: 32 }}
      >
        Elegí tu gimnasio
      </Text>
      <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-7">
        Vas a ver los planes, registros y colores de este gimnasio. Podés
        cambiarlo cuando quieras desde tu perfil.
      </Text>

      {/* ── Tarjetas de gym ── */}
      <View className="gap-3.5">
        {memberships.map((m) => {
          const gym = m.gyms ?? {};
          const ramp = gym.theme_primary
            ? generateRamp(gym.theme_primary)
            : defaultPrimary;
          const brand = ramp[600];
          const logoUrl = getCloudinaryUrl(gym.logo_url);
          const isActive = m.gym_id === activeGymId;
          const isSwitching = switchingTo === m.gym_id;
          const initials = (gym.name ?? "?")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <Pressable
              key={m.id}
              onPress={() => onSelect(m)}
              disabled={!!switchingTo}
              className="flex-row items-center p-4 rounded-2xl bg-white dark:bg-ui-surface-dark border active:scale-[0.98]"
              style={{
                borderColor: isActive ? brand : "rgba(0,0,0,0.06)",
                borderWidth: isActive ? 1.5 : 1,
                shadowColor: brand,
                shadowOpacity: isActive ? 0.18 : 0.06,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: isActive ? 6 : 2,
              }}
            >
              {/* Logo / iniciales con el color del gym */}
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center overflow-hidden mr-3.5"
                style={{ backgroundColor: `${brand}15` }}
              >
                {logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <Text
                    className="font-jakarta-bold"
                    style={{ fontSize: 18, color: brand }}
                  >
                    {initials}
                  </Text>
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="text-[16px] font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark capitalize tracking-tight"
                  numberOfLines={1}
                >
                  {gym.name ?? "Gimnasio"}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <View
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: brand }}
                  />
                  <Text className="text-[10px] font-manrope-bold uppercase tracking-[1.2px] text-ui-text-muted">
                    {ROLE_LABELS[m.role] ?? m.role}
                    {isActive ? "  ·  Actual" : ""}
                  </Text>
                </View>
              </View>

              {isSwitching ? (
                <ActivityIndicator size="small" color={brand} />
              ) : (
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: isActive ? `${brand}15` : brand }}
                >
                  <Text
                    className="text-[11px] font-jakarta-bold"
                    style={{ color: isActive ? brand : "#fff" }}
                  >
                    {isActive ? "Activo" : "Entrar"}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Volver (solo en modo switcher, cuando ya hay un gym activo) */}
      {!needsSelection && (
        <Pressable
          onPress={() => router.back()}
          disabled={!!switchingTo}
          className="items-center py-4 mt-5 rounded-2xl border border-ui-text-main/[8%] dark:border-white/[8%] active:opacity-70"
        >
          <Text className="text-[14px] font-manrope-bold text-ui-text-muted dark:text-ui-text-mutedDark">
            Volver
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
