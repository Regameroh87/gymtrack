// React Native
import {
  Animated,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRef, useState } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hooks
import { useTrainingPlans } from "../../../src/hooks/useTrainingPlans";
import { useSessions } from "../../../src/hooks/useSessions";

// Componentes
import Screen from "../../../src/components/Screen";
import TrainingPlanCard from "../../../src/components/cards/TrainingPlanCard";
import SessionCard from "../../../src/components/cards/SessionCard";

// Tema / assets
import { brandPrimary } from "../../../src/theme/colors";
import { ClipboardList, Plus, Barbell } from "../../../assets/icons";

const TABS = [
  { key: "planes", label: "Planes" },
  { key: "rutinas", label: "Rutinas" },
];

export default function RutinasTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("planes");
  const tabAnim = useRef(new Animated.Value(0)).current;
  const [pillWidth, setPillWidth] = useState(0);

  const { data: plans = [], isLoading: plansLoading } = useTrainingPlans();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();

  const switchTab = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(key);
    Animated.spring(tabAnim, {
      toValue: key === "planes" ? 0 : 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  };

  const pillTranslateX = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth],
  });

  const isPlanes = activeTab === "planes";
  const isLoading = isPlanes ? plansLoading : sessionsLoading;
  const isEmpty = isPlanes ? plans.length === 0 : sessions.length === 0;

  return (
    <Screen safe>
      {/* Header */}
      <View className="px-6 pt-4 pb-5 flex-row items-end justify-between">
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Entrenamiento
          </Text>
          <Text className="text-2xl font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark">
            Mis Rutinas
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(
              isPlanes ? "/rutinas/builder" : "/rutinas/sessions/new"
            );
          }}
          className="active:scale-[0.95]"
        >
          <LinearGradient
            colors={[brandPrimary[600], brandPrimary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-3.5 h-10 rounded-xl items-center justify-center flex-row gap-1.5"
          >
            <Plus size={14} color="white" />
            <Text className="text-white font-jakarta-semi text-xs">
              {isPlanes ? "Nuevo plan" : "Nueva rutina"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Tabs selector */}
      <View className="px-6 mb-5">
        <View
          className="flex-row bg-ui-input-light dark:bg-ui-input-dark rounded-xl p-1"
          onLayout={(e) => setPillWidth(e.nativeEvent.layout.width / 2 - 4)}
        >
          {/* Pill animado */}
          <Animated.View
            className="absolute bg-ui-surface-light dark:bg-ui-surface-dark rounded-[10px]"
            style={{
              top: 4,
              bottom: 4,
              left: 4,
              width: pillWidth,
              transform: [{ translateX: pillTranslateX }],
              shadowColor: brandPrimary[600],
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          />

          {TABS.map((tab) => {
            const count = tab.key === "planes" ? plans.length : sessions.length;
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => switchTab(tab.key)}
                className="flex-1 py-2.5 items-center flex-row justify-center gap-2"
                style={{ zIndex: 10 }}
              >
                <Text
                  className={`font-jakarta-semi text-[13px] ${
                    isActive
                      ? "text-ui-text-main dark:text-ui-text-mainDark"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {tab.label}
                </Text>

                {count > 0 && (
                  <View
                    className="rounded-full px-1.5 py-0.5"
                    style={{
                      backgroundColor: isActive
                        ? brandPrimary[500] + "22"
                        : "rgba(196,190,230,0.15)",
                    }}
                  >
                    <Text
                      className="text-[10px] font-manrope-bold"
                      style={{
                        color: isActive
                          ? brandPrimary[500]
                          : "rgba(110,107,138,0.7)",
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Contenido */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : isEmpty ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <EmptyState tab={activeTab} router={router} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {isPlanes
            ? plans.map((plan, i) => (
                <View
                  key={plan.id}
                  style={{ marginBottom: i < plans.length - 1 ? 14 : 0 }}
                >
                  <TrainingPlanCard
                    plan={plan}
                    onPress={(p) => router.push(`/rutinas/plan/${p.id}`)}
                  />
                </View>
              ))
            : sessions.map((session, i) => (
                <View
                  key={session.id}
                  style={{ marginBottom: i < sessions.length - 1 ? 14 : 0 }}
                >
                  <SessionCard
                    session={session}
                    onPress={(s) => router.push(`/rutinas/sesion/${s.id}`)}
                  />
                </View>
              ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function EmptyState({ tab, router }) {
  const isPlanes = tab === "planes";

  return (
    <View className="bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-8 items-center">
      <View className="w-16 h-16 rounded-2xl items-center justify-center mb-5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
        {isPlanes ? (
          <ClipboardList size={32} color={brandPrimary[600]} />
        ) : (
          <Barbell size={32} color={brandPrimary[600]} />
        )}
      </View>

      <Text className="text-lg font-jakarta text-ui-text-main dark:text-ui-text-mainDark text-center mb-2">
        {isPlanes ? "No tenés planes activos" : "No tenés rutinas"}
      </Text>
      <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5 mb-6 max-w-[260px]">
        {isPlanes
          ? "Elegí una plantilla de tu entrenador o creá el tuyo propio."
          : "Creá tu primera rutina para empezar a estructurar tus entrenamientos."}
      </Text>

      <View className="w-full gap-3">
        {isPlanes ? (
          <>
            <Pressable
              onPress={() => router.push("/rutinas/select")}
              className="w-full active:scale-[0.98]"
            >
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <ClipboardList size={18} color="white" />
                <Text className="text-white font-jakarta-semi text-sm ml-2">
                  Elegir un plan
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.push("/rutinas/builder")}
              className="py-3.5 rounded-xl items-center flex-row justify-center border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark active:opacity-70"
            >
              <Plus size={18} color={brandPrimary[500]} />
              <Text className="font-jakarta-semi text-sm ml-2 text-brandPrimary-500 dark:text-brandPrimary-400">
                Crear mi propio plan
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => router.push("/rutinas/sessions/new")}
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
                Crear rutina
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}
