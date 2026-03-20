import { Text, View, Image, Button } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/database/supabase.js";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/auth/lib/getSession.jsx";
import { CalendarTime } from "../../assets/icons.jsx";

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
            <Text className="text-slate-900 font-lexend-bold text-3xl tracking-tight">
              ¡Hola, {user?.name}!
            </Text>
            <Text className="text-xs text-indigo-600 font-lexend">
              Listo para entrenar 💪
            </Text>
          </View>
        </View>
      </View>
      {/* CARD PROGRESS */}
      <View className="flex justify-center items-center mt-6">
        <View
          className="  bg-slate-200 rounded-2xl p-10 shadow-md"
          style={{ transform: [{ rotate: "3deg" }] }}
        >
          <CalendarTime size={64} className="text-indigo-600" />
        </View>
        <Text className="flex text-center text-slate-900 font-lexend text-xl my-3 w-3/4">
          Aun no tienes una rutina para hoy.
        </Text>
        <Text className="text-slate-400 font-lexend text-md leading-relaxed text-center w-[85%]">
          {
            "Parece que no hay ejercicios programados para hoy.\n¡Mantén el ritmo y comienza\nahora mismo!"
          }
        </Text>
      </View>
      {/* SESIONES DE ENTRENAMIENTO */}
      {/*      <View className="flex w-[85%] mx-auto py-8 bg-ui-card-light dark:bg-ui-card-dark items-center justify-center rounded-[32px] shadow-sm border border-ui-input-border dark:border-ui-input-borderDark">
        <Text className="text-sm font-bold text-brand-primary uppercase tracking-widest">
          PROGRESO DE HOY
        </Text>
        <Text className="text-4xl font-lexend-ebold text-ui-text-main dark:text-ui-text-mainDark mt-2">
          1/3{" "}
          <Text className="text-xl font-lexend-bold text-ui-text-muted">
            SESIONES
          </Text>
        </Text>
      </View>
      <View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Lógica para iniciar entrenamiento aquí
          }}
          className="flex flex-row justify-center items-center w-[80%] mx-auto bg-brand-primary active:bg-brand-dark py-4 rounded-2xl mt-6 shadow-sm"
        >
          <Text className="text-ui-background-dark text-lg font-bold">
            Iniciar sesión 🏋️
          </Text>
        </Pressable>
      </View> */}
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
