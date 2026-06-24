import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Screen from "../../../../../src/components/Screen";
import SearchBar from "../../../../../src/components/SearchBar";
import ButtonAdd from "../../../../../src/components/buttons/ButtonAdd";
import { Flame, Pencil } from "../../../../../assets/icons";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActivities } from "@gymtrack/core/hooks/activities/use-activities";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";

// Resumen de los pases de una actividad para la tarjeta: "N pases · desde $X/mes".
const planSummary = (plans = []) => {
  if (!plans.length) return "Sin pases";
  const prices = plans
    .filter((p) => p.is_active && p.price != null)
    .map((p) => Number(p.price));
  const count = `${plans.length} ${plans.length === 1 ? "pase" : "pases"}`;
  if (!prices.length) return count;
  const min = Math.min(...prices);
  return `${count} · desde $${min.toLocaleString("es-AR")}/mes`;
};

export default function ActivitiesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const [search, setSearch] = useState("");

  const { data: activities, isLoading } = useActivities(gymId);

  const filtered =
    activities?.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const renderItem = ({ item }) => (
    <View className="mx-5 mb-3 bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border rounded-2xl p-3.5 flex-row items-center">
      {/* Color dot */}
      <View
        className="w-11 h-11 rounded-xl items-center justify-center"
        style={{ backgroundColor: `${item.color ?? brandPrimary[600]}1A` }}
      >
        <Flame size={20} color={item.color ?? brandPrimary[600]} />
      </View>

      {/* Info */}
      <View className="flex-1 ml-3">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-[15px] font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {!item.is_active && (
            <View className="bg-ui-input-light dark:bg-ui-input-dark px-1.5 py-0.5 rounded">
              <Text className="text-[9px] font-manrope-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-mutedDark">
                Inactiva
              </Text>
            </View>
          )}
        </View>
        <Text className="text-[12px] font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
          {planSummary(item.activity_plans)}
        </Text>
        {item.coach && (
          <Text className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5">
            Coach: {[item.coach.name, item.coach.last_name].filter(Boolean).join(" ")}
          </Text>
        )}
      </View>

      {/* Action */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/admin/activities/edit/${item.id}`);
        }}
        className="p-3 bg-brandPrimary-100 dark:bg-brandPrimary-900/30 rounded-xl active:scale-95"
      >
        <Pencil size={16} color="#3b82f6" />
      </Pressable>
    </View>
  );

  return (
    <Screen safe={Platform.OS === "android"}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="px-6 mb-4">
              <Text className="text-xs font-jakarta-semi uppercase tracking-widest mb-1 text-brandSecondary-500 dark:text-brandSecondary-400">
                Oferta
              </Text>
              <Text className="text-2xl font-jakarta tracking-tighter text-ui-text-main dark:text-ui-text-mainDark">
                Actividades
              </Text>
            </View>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar actividad..."
            />
          </>
        }
        ListEmptyComponent={
          !isLoading && (
            <View className="items-center pt-20 px-10">
              <Flame size={48} color={ui.text.muted} />
              <Text className="text-sm font-manrope text-ui-text-muted dark:text-ui-text-mutedDark text-center mt-4">
                {search
                  ? "Sin resultados."
                  : "Creá la primera actividad de tu gimnasio."}
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
      <ButtonAdd route="/admin/activities/add" />
    </Screen>
  );
}
