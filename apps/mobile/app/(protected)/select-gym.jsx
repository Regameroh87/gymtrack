import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useActiveGym } from "../../src/contexts/active-gym-context";
import { performLogout } from "../../src/auth/lib/logout";
import { getMediaUrl } from "@gymtrack/core/media";
import { makeShadow } from "../../src/utils/box-shadow";
import { ROLE_LABELS } from "../../src/constants/roles";
import { generateRamp } from "@gymtrack/core/generate-ramp";
import { brandPrimary as defaultPrimary } from "@gymtrack/core/colors";

// Multi-gym: el login autentica a la persona; acá elige en qué gimnasio entra.
// Cada tarjeta usa el branding del propio gym (no el theme activo) para que la
// elección sea visual. También funciona como switcher desde el perfil.
// Para el super_admin el selector lista TODOS los gyms (modo administrador) y
// suma un buscador, porque el catálogo puede ser largo.
export default function SelectGymScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    gymOptions,
    isSuperAdmin,
    gymId: activeGymId,
    needsSelection,
    switchGym,
    refetch,
  } = useActiveGym();
  const [switchingTo, setSwitchingTo] = useState(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gymOptions;
    return gymOptions.filter((o) =>
      (o.gym?.name ?? "").toLowerCase().includes(q)
    );
  }, [gymOptions, query]);

  const onSelect = async (option) => {
    if (switchingTo) return;
    if (option.gym_id === activeGymId) {
      router.replace("/");
      return;
    }
    setSwitchingTo(option.gym_id);
    try {
      await switchGym(option.gym_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ maxWidth: 600, width: "100%", alignSelf: "center" }}>
        {/* ── Encabezado ── */}
        <Text className="text-[11px] font-jakarta-bold uppercase tracking-[2.5px] text-ui-text-muted mb-2">
          {isSuperAdmin ? "Modo administrador" : "Tu cuenta, tus gimnasios"}
        </Text>
        <Text
          className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark tracking-tight mb-1"
          style={{ fontSize: 26, lineHeight: 32 }}
        >
          {isSuperAdmin ? "Elegí un gimnasio" : "Elegí tu gimnasio"}
        </Text>
        <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mb-7">
          {isSuperAdmin
            ? "Entrá a cualquier gimnasio para revisar su funcionamiento. Vas a ver sus planes, registros y colores tal cual los ve un socio."
            : "Vas a ver los planes, registros y colores de este gimnasio. Podés cambiarlo cuando quieras desde tu perfil."}
        </Text>

        {/* ── Buscador (solo super_admin: el catálogo puede ser largo) ── */}
        {isSuperAdmin && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar gimnasio…"
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-4 px-4 py-3 rounded-2xl bg-white dark:bg-ui-surface-dark border border-ui-text-main/[8%] dark:border-white/[8%] text-[14px] font-manrope text-ui-text-main dark:text-ui-text-mainDark"
            placeholderTextColor="rgba(120,120,120,0.7)"
          />
        )}

        {/* ── Tarjetas de gym ── */}
        <View className="gap-3.5">
          {visibleOptions.map((m) => {
            const gym = m.gym ?? {};
            const ramp = gym.theme_primary
              ? generateRamp(gym.theme_primary)
              : defaultPrimary;
            const brand = ramp[600];
            const logoUrl = getMediaUrl(gym.logo_url);
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
                key={m.key}
                onPress={() => onSelect(m)}
                disabled={!!switchingTo}
                className="flex-row items-center p-4 rounded-2xl bg-white dark:bg-ui-surface-dark border active:scale-[0.98]"
                style={{
                  borderColor: isActive ? brand : "rgba(0,0,0,0.06)",
                  borderWidth: isActive ? 1.5 : 1,
                  ...makeShadow({ color: brand, opacity: isActive ? 0.18 : 0.06, radius: 12, offset: { width: 0, height: 6 } }),
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

          {visibleOptions.length === 0 && (
            <Text className="text-center text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark py-8">
              {query.trim()
                ? "No se encontraron gimnasios con ese nombre."
                : "No hay gimnasios disponibles."}
            </Text>
          )}
        </View>

        {/* Volver (modo switcher, ya hay gym activo) o Cerrar sesión (sin gym
            activo: única salida, ya que no hay back gesture ni acceso al perfil). */}
        {!needsSelection ? (
          <Pressable
            onPress={() => router.back()}
            disabled={!!switchingTo}
            className="items-center py-4 mt-5 rounded-2xl border border-ui-text-main/[8%] dark:border-white/[8%] active:opacity-70"
          >
            <Text className="text-[14px] font-manrope-bold text-ui-text-muted dark:text-ui-text-mutedDark">
              Volver
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => performLogout()}
            disabled={!!switchingTo}
            className="items-center py-4 mt-5 rounded-2xl border border-ui-text-main/[8%] dark:border-white/[8%] active:opacity-70"
          >
            <Text className="text-[14px] font-manrope-bold text-ui-text-muted dark:text-ui-text-mutedDark">
              Cerrar sesión
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
