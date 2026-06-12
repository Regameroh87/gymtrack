import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DEV_USERS, devSignIn } from "../auth/lib/dev-login.js";

// Accesos rápidos de desarrollo: un tap loguea con un usuario de prueba por
// rol, sin pasar por el OTP. Invisible en producción (__DEV__).
const DevLoginPanel = () => {
  const [pendingEmail, setPendingEmail] = useState(null);
  const [error, setError] = useState("");

  if (!__DEV__) return null;

  const handlePress = async (email) => {
    setError("");
    setPendingEmail(email);
    try {
      await devSignIn(email);
    } catch (err) {
      console.error("Dev login:", err.message);
      setError(err.message);
      setPendingEmail(null);
    }
  };

  return (
    <View className="w-[85%] max-w-[440px] mt-6 items-center">
      <Text className="font-manrope-bold text-[11px] uppercase tracking-widest text-[#2DD4BF] mb-3">
        Dev login
      </Text>
      <View className="flex-row gap-3">
        {DEV_USERS.map(({ label, email }) => (
          <Pressable
            key={email}
            disabled={pendingEmail !== null}
            onPress={() => handlePress(email)}
            className={`px-4 py-2 rounded-xl border ${
              pendingEmail === email
                ? "bg-[#2DD4BF]/30 border-[#2DD4BF]"
                : "bg-white/10 border-white/20"
            }`}
          >
            <Text className="text-white font-manrope-bold text-sm">
              {pendingEmail === email ? "..." : label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text className="text-[#ffdad6] mt-2 text-xs font-manrope-bold">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default DevLoginPanel;
