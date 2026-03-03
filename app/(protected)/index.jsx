import { Text, Pressable, View, Image, Button } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/database/supabase.js";
import Screen from "../../src/components/Screen";

export default function Index() {
  const image = require("../../assets/icon.png");

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
          <Image source={image} style={{ width: 50, height: 50 }} />
        </View>
      </View>
      <View className="flex w-[90%] mx-auto h-1/3 bg-gray-400 items-center justify-center rounded-full">
        <Text className="text-2xl font-bold text-gray-700">SESIONES 1/3</Text>
      </View>
      <View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Lógica para iniciar entrenamiento aquí
          }}
          className=" flex flex-row justify-center items-center w-1/2 h-auto mx-auto bg-blue-400 active:bg-blue-500 p-4 rounded-full mt-6"
        >
          <Text className="text-white text-lg font-bold">
            Iniciar sesion 🏋️
          </Text>
        </Pressable>
      </View>
      <View className=" w-1/2 mx-auto my-4 rounded">
        <Button
          style={{ borderRadius: "100%" }}
          title="Log Out"
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await supabase.auth.signOut();
          }}
        />
      </View>
    </Screen>
  );
}
