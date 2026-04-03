import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../../src/database/supabase";
import Screen from "../../../../src/components/Screen";
import SearchBar from "../../../../src/components/SearchBar";
import FilterChips from "../../../../src/components/FilterChips";
import { Plus, ChevronRight, Mail } from "../../../../assets/icons";
import { brandPrimary, ui, gradient } from "../../../../src/theme/colors";

const FILTER_OPTIONS = ["Todos", "Administradores", "Socios"];

export default function UsersList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = users?.filter((u) => {
    const q = search.toLowerCase();
    const match =
      u.name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    if (filter === "Administradores") return match && u.is_admin;
    if (filter === "Socios") return match && !u.is_admin;
    return match;
  });

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      className="mx-5 mb-3 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center active:scale-[0.98]"
    >
      {/* Avatar */}
      {item.image_profile ? (
        <Image
          source={{ uri: item.image_profile }}
          className="w-12 h-12 rounded-xl"
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View className="w-12 h-12 rounded-xl items-center justify-center bg-brandPrimary-50 dark:bg-brandPrimary-950">
          <Text className="font-jakarta-semi text-base text-brandPrimary-600 dark:text-brandPrimary-400">
            {item.name?.charAt(0)}
            {item.last_name?.charAt(0)}
          </Text>
        </View>
      )}

      {/* Info */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text
            className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {item.name} {item.last_name}
          </Text>
          {item.is_admin && (
            <View className="ml-2 px-1.5 py-0.5 rounded bg-brandPrimary-100 dark:bg-brandPrimary-900">
              <Text className="text-[8px] font-jakarta-semi uppercase text-brandPrimary-600 dark:text-brandPrimary-300">
                Admin
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center mt-0.5">
          <Mail size={10} color={ui.text.muted} />
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark ml-1">
            {item.email}
          </Text>
        </View>
      </View>

      <ChevronRight size={14} className="text-ui-text-muted dark:text-ui-text-mutedDark" />
    </Pressable>
  );

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="px-6 mb-4">
              <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandPrimary-500 dark:text-brandPrimary-400">
                Gestión
              </Text>
              <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
                Usuarios
              </Text>
            </View>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nombre o email..."
            />
            <FilterChips
              options={FILTER_OPTIONS}
              selected={filter}
              onSelect={setFilter}
            />
          </>
        }
        ListEmptyComponent={
          !isLoading && (
            <View className="items-center pt-20 px-10">
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center">
                {search
                  ? "Sin resultados para esta búsqueda."
                  : "Aún no hay usuarios registrados."}
              </Text>
            </View>
          )
        }
      />

      {isLoading && (
        <View className="absolute inset-0 items-center justify-center bg-ui-background-light/50 dark:bg-ui-background-dark/50">
          <ActivityIndicator size="large" color={brandPrimary[600]} />
        </View>
      )}

      {/* FAB */}
      <View
        className="absolute bottom-0 right-0 pr-5"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push("/admin/users/register");
          }}
          className="active:scale-95"
        >
          <LinearGradient
            colors={gradient.primary}
            className="w-14 h-14 rounded-2xl items-center justify-center shadow-xl shadow-brandPrimary-600/30"
          >
            <Plus size={28} color="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}
