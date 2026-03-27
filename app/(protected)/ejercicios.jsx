import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pencil, Trash, Plus } from "../../assets/icons";

// Datos de la Biblioteca de Ejercicios
const EJERCICIOS = [
  {
    id: "1",
    name: "Press de Banca",
    type: "Fuerza",
    muscle: "Pecho",
    image:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "2",
    name: "Sentadilla",
    type: "Fuerza",
    muscle: "Piernas",
    image:
      "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "3",
    name: "Dominadas",
    type: "Calistenia",
    muscle: "Espalda",
    image:
      "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "4",
    name: "Curl de Bíceps",
    type: "Hipertrofia",
    muscle: "Brazos",
    image:
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: "5",
    name: "Elevaciones Laterales",
    type: "Hipertrofia",
    muscle: "Hombros",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200",
  },
];

export default function EjerciciosScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#f8f9fc] dark:bg-[#1e1b4b]">
      {/* List content handles top and bottom insets smoothly */}
      <FlatList
        data={EJERCICIOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100, // Space for FAB
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-6">
            <Text className="text-[#6e6b8a] dark:text-[#9d99b8] text-[13px] font-bold uppercase tracking-widest mb-1">
              Exercise Lab
            </Text>
            <Text className="text-[32px] leading-10 font-black text-[#0f0d20] dark:text-[#f0eef8] tracking-tight">
              Biblioteca de Ejercicios
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable className="flex-row items-center bg-white dark:bg-[#231f42] p-4 rounded-3xl mb-4 shadow-sm active:scale-[0.98] transition-all">
            <Image
              source={item.image}
              className="w-[72px] h-[72px] rounded-[18px] bg-[#eae8f4] dark:bg-[#1e1b4b]"
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <View className="flex-1 ml-4 justify-center">
              <Text className="text-[18px] font-bold text-[#0f0d20] dark:text-[#f0eef8] mb-1.5">
                {item.name}
              </Text>

              <View className="flex-row flex-wrap items-center gap-2">
                <View className="bg-[#eef0ff] dark:bg-[#312e81]/30 px-3 py-1 rounded-full">
                  <Text className="text-[12px] text-[#3023cd] dark:text-[#a5b4fc] font-bold tracking-wide">
                    {item.type}
                  </Text>
                </View>
                <View className="bg-[#eae8f4] dark:bg-[#1e1b4b] px-3 py-1 rounded-full">
                  <Text className="text-[12px] text-[#6e6b8a] dark:text-[#9d99b8] font-bold tracking-wide">
                    {item.muscle}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-2 ml-2">
              <Pressable className="w-10 h-10 bg-[#f8f9fc] dark:bg-[#1e1b4b] rounded-2xl items-center justify-center active:scale-90 transition-all">
                <Pencil
                  size={20}
                  color="currentColor"
                  className="text-[#6e6b8a] dark:text-[#9d99b8]"
                />
              </Pressable>
              <Pressable className="w-10 h-10 bg-[#fff5f5] dark:bg-rose-950/30 rounded-2xl items-center justify-center active:scale-90 transition-all">
                <Trash
                  size={20}
                  color="currentColor"
                  className="text-rose-500 dark:text-rose-400"
                />
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Floating Action Button */}
      <View
        className="absolute bottom-0 w-full px-5 items-end pointer-events-none"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <Pressable className="pointer-events-auto active:scale-95 transition-all shadow-lg shadow-indigo-500/30">
          <LinearGradient
            colors={["#4a44e4", "#3023cd"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-16 h-16 rounded-[22px] items-center justify-center"
          >
            <Plus size={32} color="#ffffff" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
