import { Text, Pressable, View, Image, Button } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/database/supabase.js";
import Screen from "../../src/components/Screen";
import { useAuth } from "../../src/auth/lib/getSession.jsx";

export default function Index() {
  const image = require("../../assets/icon.png");
  const { user } = useAuth();
  console.log("user en home", user);

  return (
    <Screen>
      <View className="flex flex-row self-center w-[92%] items-center justify-between bg-ui-card-light dark:bg-ui-card-dark p-4 rounded-[32px] shadow-sm border border-ui-input-border dark:border-ui-input-borderDark my-6">
        <View className="flex flex-row items-center gap-4">
          <View className="shadow-sm">
            <Image
              source={user?.image_profile ? { uri: user.image_profile } : image}
              className="w-14 h-14 rounded-full border-2 border-brand-lime"
            />
          </View>
          <View className="flex-col">
            <Text className="text-sm font-semibold text-ui-text-muted dark:text-ui-text-mutedDark">
              Hola 👋
            </Text>
            <Text className="text-lg font-bold text-ui-text-main dark:text-ui-text-mainDark leading-tight">
              {user?.name} {user?.last_name}
            </Text>
            <Text className="text-xs text-ui-text-muted dark:text-ui-text-mutedDark">
              Listo para entrenar 💪
            </Text>
          </View>
        </View>
      </View>
      <View className="flex w-[85%] mx-auto py-8 bg-ui-card-light dark:bg-ui-card-dark items-center justify-center rounded-[32px] shadow-sm border border-ui-input-border dark:border-ui-input-borderDark">
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
