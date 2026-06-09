// React Native
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useState } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

// Base de datos
import { database } from "../../../../src/database";
import {
  custom_exercises,
  custom_session_exercises,
  custom_sessions,
} from "../../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../../src/database/sync";

// Hooks
import { useCustomSessions } from "../../../../src/hooks/sessions/use-custom-sessions";
import { useCustomExercises } from "../../../../src/hooks/exercises/use-custom-exercises";

// Utilidades
import { getCloudinaryUrl } from "../../../../src/utils/cloudinary";

// Componentes
import Screen from "../../../../src/components/Screen";

// Tema / assets
import { ui } from "../../../../src/theme/colors";
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";
import { ArrowLeft, Pencil, Plus, Trash } from "../../../../assets/icons";

const LIB_TABS = [
  { key: "sesiones", label: "Sesiones" },
  { key: "ejercicios", label: "Ejercicios" },
];

export default function BibliotecaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { brandPrimary } = useGymTheme();
  const queryClient = useQueryClient();

  const [activeLib, setActiveLib] = useState("sesiones");

  const { data: mySessions = [], isLoading: loadingSessions } =
    useCustomSessions();
  const { data: myExercises = [], isLoading: loadingExercises } =
    useCustomExercises();

  const handleDeleteSession = (session) => {
    Alert.alert("Eliminar sesión", `¿Eliminar "${session.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database.transaction(async (tx) => {
            await tx
              .update(custom_session_exercises)
              .set({ sync_status: "deleted" })
              .where(eq(custom_session_exercises.session_id, session.id));
            await tx
              .update(custom_sessions)
              .set({ sync_status: "deleted" })
              .where(eq(custom_sessions.id, session.id));
          });
          queryClient.invalidateQueries({ queryKey: ["custom_sessions"] });
          checkNetInfoAndSync().catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteExercise = (exercise) => {
    Alert.alert("Eliminar ejercicio", `¿Eliminar "${exercise.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database
            .update(custom_exercises)
            .set({ sync_status: "deleted" })
            .where(eq(custom_exercises.id, exercise.id));
          queryClient.invalidateQueries({ queryKey: ["custom_exercises"] });
          checkNetInfoAndSync().catch(() => {});
        },
      },
    ]);
  };

  const fabRoute =
    activeLib === "sesiones"
      ? "planes/builder/custom-session"
      : "planes/builder/custom-exercise";

  const listData = activeLib === "sesiones" ? mySessions : myExercises;

  const isLibLoading =
    (activeLib === "sesiones" && loadingSessions) ||
    (activeLib === "ejercicios" && loadingExercises);

  return (
    <Screen safe>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-10 h-10 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <ArrowLeft
            size={18}
            color={isDark ? ui.text.mainDark : ui.text.main}
          />
        </Pressable>
        <View>
          <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
            Mi Entrenamiento
          </Text>
          <Text className="text-[22px] font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark leading-7">
            Mi biblioteca
          </Text>
        </View>
      </View>

      {/* Descripción */}
      <View className="px-6 pt-2 pb-1">
        <Text className="text-[13px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark leading-5">
          Sesiones y ejercicios que vos mismo creaste. Editá o borrá cualquiera
          desde acá, y usálos cuando armes tus planes.
        </Text>
      </View>

      {/* Tabs internos */}
      <View className="px-6 mt-4 mb-2">
        <View className="flex-row bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-xl p-1">
          {LIB_TABS.map((tab) => {
            const isActive = activeLib === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveLib(tab.key);
                }}
                className="flex-1 items-center py-2 rounded-lg active:opacity-70"
                style={isActive ? { backgroundColor: brandPrimary[500] } : {}}
              >
                <Text
                  className={`font-jakarta-semi text-[12px] ${
                    isActive
                      ? "text-white"
                      : "text-ui-text-muted dark:text-ui-text-mutedDark"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLibLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brandPrimary[500]} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center px-6">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center leading-5">
                {activeLib === "sesiones"
                  ? "Todavía no creaste ninguna sesión.\nTocá + para empezar."
                  : "Todavía no creaste ningún ejercicio.\nTocá + para agregar el primero."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (activeLib === "sesiones") {
              return (
                <LibSessionRow
                  session={item}
                  onEdit={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/planes/builder/custom-session?id=${item.id}`);
                  }}
                  onDelete={() => handleDeleteSession(item)}
                  isDark={isDark}
                />
              );
            }
            return (
              <LibExerciseRow
                exercise={item}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/planes/builder/custom-exercise?id=${item.id}`);
                }}
                onDelete={() => handleDeleteExercise(item)}
                isDark={isDark}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(fabRoute);
        }}
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom + 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: brandPrimary[500],
          alignItems: "center",
          justifyContent: "center",
          shadowColor: brandPrimary[500],
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Plus size={24} color="white" />
      </Pressable>
    </Screen>
  );
}

// ─── Filas de biblioteca ──────────────────────────────────────────────────────

function LibSessionRow({ session, onEdit, onDelete, isDark }) {
  const imageUrl = session.cover_image_uri
    ? session.cover_image_uri.startsWith("file://")
      ? session.cover_image_uri
      : getCloudinaryUrl(
          session.cover_image_uri,
          "w_120,h_120,c_fill,f_auto,q_auto"
        )
    : null;

  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Text className="text-lg">💪</Text>
        </View>
      )}
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {session.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
          {session.exercise_count ?? 0} ejercicio
          {session.exercise_count !== 1 ? "s" : ""}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <Pressable
          onPress={onEdit}
          className="w-8 h-8 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <Pencil size={14} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 active:opacity-60"
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

function LibExerciseRow({ exercise, onEdit, onDelete, isDark }) {
  const imageUrl = exercise.image_uri
    ? exercise.image_uri.startsWith("file://")
      ? exercise.image_uri
      : getCloudinaryUrl(exercise.image_uri, "w_120,h_120,c_fill,f_auto,q_auto")
    : null;

  return (
    <View className="flex-row items-center px-4 py-3 mb-2 rounded-2xl border border-ui-input-border bg-ui-surface-light dark:bg-ui-surface-dark">
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }}
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Text className="text-lg">🏋️</Text>
        </View>
      )}
      <View className="flex-1">
        <Text
          className="text-[14px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
          numberOfLines={1}
        >
          {exercise.name}
        </Text>
        <Text className="text-xs font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5 capitalize">
          {exercise.muscle_group}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <Pressable
          onPress={onEdit}
          className="w-8 h-8 rounded-xl items-center justify-center bg-ui-secondary-light dark:bg-ui-secondary-dark active:opacity-60"
        >
          <Pencil size={14} color={isDark ? ui.text.mainDark : ui.text.main} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="w-8 h-8 rounded-xl items-center justify-center bg-red-500/10 active:opacity-60"
        >
          <Trash size={14} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}
