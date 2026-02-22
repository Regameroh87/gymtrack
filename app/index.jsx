import { Text, Pressable, View, Image } from "react-native";
import Screen from "../src/components/Screen";

export default function Index() {
  return (
    <Screen>
      <View className=" flex flex-row w-full justify-between my-6">
        <View>
          <Text className="text-base font-bold text-gray-500">Bienvenido,</Text>
          <Text className="text-md font-bold text-gray-900">
            Rodrigo Emmanuel Gamero Hubka
          </Text>
        </View>
        <View>
          <Image
            source={require("../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </View>
      </View>
      <View className="flex w-[90%] mx-auto h-1/3 bg-gray-400 items-center justify-center rounded-full">
        <Text className="text-2xl font-bold text-gray-700">ESTADISTICAS</Text>
      </View>
      <View>
        <Pressable className=" bg-blue-400 active:bg-blue-500 p-4 rounded-full mt-6">
          <Text className="text-white text-sm font-bold">
            Iniciar sesion de entrenamiento
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
