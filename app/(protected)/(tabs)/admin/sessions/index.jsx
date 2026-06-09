// React Native
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useCallback } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

// Hooks
import { useSessions } from "../../../../../src/hooks/sessions/use-sessions";

// Componentes
import Screen from "../../../../../src/components/Screen";
import SessionCard from "../../../../../src/components/cards/SessionCard";
import ButtonAddPill from "../../../../../src/components/buttons/ButtonAddPill";

// Tema / assets
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { ClipboardList, Plus } from "../../../../../assets/icons";

function AnimatedCard({ session, onPress, scrollY, containerY }) {
  const cardY = useSharedValue(0);
  const cardHeight = useSharedValue(1);

  const onLayout = useCallback(
    (e) => {
      cardY.value = e.nativeEvent.layout.y;
      cardHeight.value = e.nativeEvent.layout.height;
    },
    [cardY, cardHeight]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const absoluteY = containerY.value + cardY.value;
    const cardTop = absoluteY - scrollY.value;
    // fade from opacity 1 (top tocando el header) a 0 (bottom cruzando el header)
    const opacity = interpolate(
      cardTop,
      [-cardHeight.value, 0],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <Animated.View style={animatedStyle} onLayout={onLayout}>
      <SessionCard session={session} onPress={onPress} />
    </Animated.View>
  );
}

export default function SessionsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { data: sessions = [], isLoading } = useSessions();
  const scrollY = useSharedValue(0);
  const containerY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const handleNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/admin/sessions/builder");
  };

  return (
    <Screen>
      {/* Header sticky */}
      <View className="px-6 pt-4 pb-5 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Gestión de Entrenamientos
          </Text>
          <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
            Sesiones
          </Text>
          {sessions.length > 0 && (
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest mt-1">
              {sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}
            </Text>
          )}
        </View>

        <ButtonAddPill onPress={handleNew} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={brandPrimary[500]} />
          </View>
        ) : sessions.length === 0 ? (
          <View className="mx-5 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
              <ClipboardList size={32} color={brandPrimary[600]} />
            </View>
            <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
              Crea tu día de entrenamiento
            </Text>
            <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
              Crea sesiones personalizadas combinando ejercicios del catálogo
              con series y repeticiones.
            </Text>
            <Pressable
              onPress={handleNew}
              className="w-full active:scale-[0.98]"
            >
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <Plus size={18} color="white" />
                <Text className="text-white font-jakarta-semi text-sm ml-2">
                  Nueva Sesión
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View
            className="px-5 gap-5"
            onLayout={(e) => {
              containerY.value = e.nativeEvent.layout.y;
            }}
          >
            {sessions.map((session) => (
              <AnimatedCard
                key={session.id}
                session={session}
                scrollY={scrollY}
                containerY={containerY}
                onPress={(r) => router.push(`/admin/sessions/${r.id}`)}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}
