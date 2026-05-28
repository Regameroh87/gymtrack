import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";

import { useSessions } from "../../../src/hooks/useSessions";
import { useExercises } from "../../../src/hooks/useExercises";
import { useAuth } from "../../../src/auth/lib/getSession";
import { database } from "../../../src/database";
import {
  exercises_base,
  exercise_equipment,
  sessions,
  session_exercises,
} from "../../../src/database/schemas";
import { checkNetInfoAndSync } from "../../../src/database/sync";
import { getCloudinaryUrl } from "../../../src/utils/cloudinary";

import { brandPrimary, ui } from "../../../src/theme/colors";
import { Pencil, Plus, Trash } from "../../../assets/icons";

const TABS = ["Sesiones", "Ejercicios"];

// ─── Badge "Mía/Mío" ─────────────────────────────────────────────────────────

function OwnBadge({ label = "Mía" }) {
  return (
    <View className="self-start rounded-full px-2 py-0.5 bg-brandPrimary-50 dark:bg-brandPrimary-950 border border-brandPrimary-200 dark:border-brandPrimary-800 mt-1">
      <Text className="text-[9px] font-manrope-bold uppercase tracking-wider text-brandPrimary-600 dark:text-brandPrimary-400">
        {label}
      </Text>
    </View>
  );
}

// ─── Tarjeta de sesión ────────────────────────────────────────────────────────

function SessionRow({ session, isOwner, onEdit, onDelete }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const imageUrl = session.cover_image_uri
    ? session.cover_image_uri.startsWith("file://")
      ? session.cover_image_uri
      : getCloudinaryUrl(session.cover_image_uri, "w_120,h_120,c_fill,f_auto,q_auto")
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
        <View
          className="w-12 h-12 rounded-xl mr-3 items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950"
        >
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
          {session.exercise_count ?? 0} ejercicio{session.exercise_count !== 1 ? "s" : ""}
        </Text>
        {isOwner && <OwnBadge label="Mía" />}
      </View>

      {isOwner && (
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
      )}
    </View>
  );
}

// ─── Tarjeta de ejercicio ─────────────────────────────────────────────────────

function ExerciseRow({ exercise, isOwner, onEdit, onDelete }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
        {isOwner && <OwnBadge label="Mío" />}
      </View>

      {isOwner && (
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
      )}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BibliotecaIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const { data: allSessions = [], isLoading: loadingSessions } = useSessions();
  const { data: allExercises = [], isLoading: loadingExercises } = useExercises();

  const handleDeleteSession = (session) => {
    Alert.alert("Eliminar sesión", `¿Eliminar "${session.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await database.transaction(async (tx) => {
            await tx
              .update(session_exercises)
              .set({ sync_status: "deleted" })
              .where(eq(session_exercises.session_id, session.id));
            await tx
              .update(sessions)
              .set({ sync_status: "deleted" })
              .where(eq(sessions.id, session.id));
          });
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          checkNetInfoAndSync();
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
          await database.transaction(async (tx) => {
            await tx
              .update(exercise_equipment)
              .set({ sync_status: "deleted" })
              .where(eq(exercise_equipment.exercise_id, exercise.id));
            await tx
              .update(exercises_base)
              .set({ sync_status: "deleted" })
              .where(eq(exercises_base.id, exercise.id));
          });
          queryClient.invalidateQueries({ queryKey: ["exercises"] });
          checkNetInfoAndSync();
        },
      },
    ]);
  };

  const isLoading = activeTab === 0 ? loadingSessions : loadingExercises;

  return (
    <View
      className="flex-1 bg-ui-background-light dark:bg-ui-background-dark"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
          Biblioteca
        </Text>
        <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
          Tus sesiones y ejercicios
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 gap-2 mb-4 mt-3">
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(i);
            }}
            className={`px-5 py-2 rounded-full border ${
              activeTab === i
                ? "bg-brandPrimary-500 border-brandPrimary-500"
                : "bg-ui-surface-light dark:bg-ui-surface-dark border-ui-input-border"
            } active:opacity-70`}
          >
            <Text
              className={`text-sm font-manrope-semi ${
                activeTab === i
                  ? "text-white"
                  : "text-ui-text-muted dark:text-ui-text-mutedDark"
              }`}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={brandPrimary[500]} />
        </View>
      ) : activeTab === 0 ? (
        <FlatList
          data={allSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                No hay sesiones aún.{"\n"}Creá la primera tocando el +
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwner = item.created_by === userId;
            return (
              <SessionRow
                session={item}
                isOwner={isOwner}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/biblioteca/sesiones/builder?id=${item.id}`);
                }}
                onDelete={() => handleDeleteSession(item)}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={allExercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                No hay ejercicios aún.{"\n"}Creá el primero tocando el +
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwner = item.created_by === userId;
            return (
              <ExerciseRow
                exercise={item}
                isOwner={isOwner}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/biblioteca/ejercicios/builder?id=${item.id}`);
                }}
                onDelete={() => handleDeleteExercise(item)}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (activeTab === 0) {
            router.push("/biblioteca/sesiones/builder");
          } else {
            router.push("/biblioteca/ejercicios/builder");
          }
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
    </View>
  );
}
