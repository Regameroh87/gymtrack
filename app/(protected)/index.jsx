import { Text, View, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/database/supabase.js";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/auth/lib/getSession.jsx";
import { Calendar, Clock } from "../../assets/icons.jsx";

export default function Index() {
  const imageProfile = require("../../assets/profile.png");
  const { user } = useAuth();
  console.log("user en home", user);

  return (
    <Screen>
      {/* CARD PROFILE */}
      <View className="flex w-full p-4">
        <View className="flex flex-row gap-4">
          <View className=" flex justify-center items-center w-14 h-14 p-2 rounded-full border-2 border-indigo-600 shadow-sm">
            <Image
              source={
                user?.image_profile ? { uri: user.image_profile } : imageProfile
              }
              className="w-full h-full object-contain"
            />
          </View>
          <View className="flex-col">
            <Text className="text-slate-900 font-lexend-bold text-2xl tracking-tight">
              ¡Hola, {user?.name}!
            </Text>
            <Text className="text-xs w-fit text-center py-1 rounded-full text-indigo-600 font-lexend-bold bg-indigo-100">
              Listo para entrenar 💪
            </Text>
          </View>
        </View>
      </View>
      {/* CARD PROGRESS */}
      <View className="flex justify-center items-center mt-6">
        <View className=" relative bg-slate-200 rounded-3xl p-10 shadow-md rotate-3">
          <Calendar size={72} className="text-indigo-600" />
          <View className=" absolute -bottom-2 -right-2">
            <Clock size={48} className="text-emerald-400" />
          </View>
        </View>
        <Text className="flex text-center text-slate-900 font-lexend text-xl my-4 w-3/4">
          Aun no tienes una rutina para hoy.
        </Text>
        <Text className="text-slate-400 font-lexend text-sm leading-relaxed text-center w-[85%]">
          {
            "Parece que no hay ejercicios programados para hoy.\n¡Mantén el ritmo y comienza\nahora mismo!"
          }
        </Text>
      </View>

      <View className="flex mt-6 px-4">
        <Pressable
          className="rounded-2xl overflow-hidden shadow-xl shadow-indigo-400/40 active:scale-95 transition-all"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <LinearGradient
            colors={["#4f46e5", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="py-4 px-8"
          >
            <Text className="text-white text-center font-lexend-bold text-lg">
              Explorar Rutinas
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
      <View className="flex mt-6 px-4">
        <Pressable className=" border border-indigo-600 py-4 px-8 rounded-2xl active:bg-slate-50 active:scale-95 transition-all">
          <Text className="text-indigo-600 text-center font-lexend-bold text-lg">
            Crear Nueva Rutina
          </Text>
        </Pressable>
      </View>
      {/*  <View className=" w-1/2 mx-auto my-4 rounded">
        <Button
          style={{ borderRadius: "100%" }}
          title="Log Out"
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await supabase.auth.signOut();
          }}
        />
      </View> */}
    </Screen>
  );
}
