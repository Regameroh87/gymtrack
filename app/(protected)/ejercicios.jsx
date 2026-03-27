import { View, Text, Pressable, Image, FlatList } from "react-native";
import { Plus } from "../../assets/icons";

// Datos exactos de tu pantalla "Biblioteca de Ejercicios (Lista)" original en Stitch
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
  return (
    <View className="flex-1 bg-[#fcf8ff] dark:bg-[#0f172a]">
      {/* Encabezado idéntico al del diseño original de Stitch */}
      <View className="px-5 pt-8 pb-4">
        <Text className="text-gray-500 dark:text-gray-400 text-[13px] font-bold uppercase tracking-widest mb-1">
          Exercise Lab
        </Text>
        <Text className="text-[32px] leading-10 font-black text-[#1b1b24] dark:text-white tracking-tight">
          Biblioteca de Ejercicios
        </Text>
      </View>

      {/* Lista de Ejercicios */}
      <FlatList
        data={EJERCICIOS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-white dark:bg-[#1e293b] p-4 rounded-3xl mb-4 shadow-sm border border-[#eae6f4] dark:border-slate-700">
            <Image
              source={{ uri: item.image }}
              className="w-[72px] h-[72px] rounded-[18px] bg-gray-200"
            />
            <View className="flex-1 ml-4 justify-center">
              <Text className="text-[18px] font-bold text-[#1b1b24] dark:text-white mb-1">
                {item.name}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-[14px] text-[#777587] dark:text-gray-400 font-medium tracking-wide">
                  {item.type} <Text className="px-1 opacity-50">•</Text>{" "}
                  {item.muscle}
                </Text>
              </View>
            </View>
            <Pressable className="w-11 h-11 bg-[#f2effc] dark:bg-[#3023cd] rounded-full items-center justify-center active:bg-[#e2dfff] transition-colors ml-2">
              <Plus size={20} className="text-[#4A44E4] dark:text-white" />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
