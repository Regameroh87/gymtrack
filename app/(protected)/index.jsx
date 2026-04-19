import { Text, View, Image, Pressable, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/auth/lib/getSession.jsx";
import { brandPrimary } from "../../src/theme/colors.js";
import { Calendar, Clock, Logout } from "../../assets/icons.jsx";
import { supabase } from "../../src/database/supabase.js";

export default function Index() {
  const imageProfile = require("../../assets/profile.png");
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <Screen>
      {/* CARD PROFILE */}
      <View className="flex w-full p-4">
        <View className="flex flex-row justify-between items-center w-full">
          <View className="flex flex-row gap-4 items-center">
            <View className=" flex justify-center items-center w-14 h-14 p-2 rounded-full border-2 border-brandPrimary-600 shadow-sm">
              <Image
                source={
                  user?.image_profile
                    ? { uri: user.image_profile }
                    : imageProfile
                }
                className="w-full h-full object-contain"
              />
            </View>
            <View className="flex-col">
              <Text className="text-ui-text-main dark:text-ui-text-mainDark font-jakarta-bold text-2xl tracking-tight mb-1">
                ¡Hola, {user?.name}!
              </Text>
              <Text className="text-xs w-fit text-center p-1 rounded-xl bg-brandPrimary-100 text-brandPrimary-600 font-jakarta-bold">
                Listo para entrenar 💪
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleLogout}
            className="p-3 border border-red-500/20 bg-red-500/10 rounded-full active:scale-95 transition-all"
          >
            <Logout color="#ef4444" size={24} />
          </Pressable>
        </View>
      </View>
      {/* CARD PROGRESS */}
      <View className=" flex rounded-2xl mx-4 py-10 bg-ui-surface-light dark:bg-ui-surface-dark shadow-md">
        <View className="flex justify-center items-center mt-6">
          <View className=" relative bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark rounded-3xl p-10 shadow-md rotate-3">
            <Calendar size={72} className="text-brandPrimary-600" />
            <View className=" absolute -bottom-2 -right-2">
              <Clock size={48} className="text-brandSecondary-400" />
            </View>
          </View>
          <Text className="flex text-center text-ui-text-main dark:text-ui-text-mainDark font-jakarta-regular text-xl my-4 w-3/4">
            {"Aun no tienes una rutina para\nhoy"}
          </Text>
          <Text className="text-ui-text-muted dark:text-ui-text-mutedDark font-jakarta-regular text-sm leading-relaxed text-center w-[85%]">
            {
              "Parece que no hay ejercicios programados para hoy.\n¡Mantén el ritmo y comienza\nahora mismo!"
            }
          </Text>
        </View>

        <View className="flex mt-6 px-4">
          <Link href="/rutinas" asChild>
            <Pressable
              className="rounded-2xl overflow-hidden shadow-xl shadow-brandPrimary-400/40 active:scale-95 transition-all"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
            >
              <LinearGradient
                colors={[brandPrimary[600], brandPrimary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl"
              >
                <View className="py-4 px-8">
                  <Text className="text-white text-center font-jakarta-bold text-lg">
                    Explorar Rutinas
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Link>
        </View>
        <View className="flex mt-6 px-4">
          <Pressable className=" border border-brandPrimary-600 py-4 px-8 rounded-2xl active:bg-ui-background-light active:scale-95 transition-all">
            <Text className="text-brandPrimary-600 text-center font-jakarta-bold text-lg">
              Crear Nueva Rutina
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
