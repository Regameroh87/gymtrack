// React Native
import { Image, Pressable, Text, View } from "react-native";

// Librerías
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// BD
import { supabase } from "../../database/supabase.js";

// Hooks
import { useAuth } from "../../auth/lib/getSession.jsx";

// Tema / assets
import { useGymTheme } from "../../contexts/gym-theme-context";
import { Barbell, ClipboardList, Home, Logout } from "../../../assets/icons.jsx";
import { makeShadow } from "../../utils/box-shadow";

const NAV = [
  { label: "Inicio",  icon: Home,          path: "/" },
  { label: "Planes", icon: ClipboardList, path: "/planes" },
];

const isActivePath = (itemPath, currentPath) => {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
};

export default function MemberNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { brandPrimary } = useGymTheme();

  const handleLogout = async () => {
    if (typeof window !== "undefined" && window.confirm("¿Cerrar sesión?")) {
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    }
  };

  const email     = user?.email || "";
  const firstName = (user?.name ?? "").split(" ")[0] || "";
  const initial   = (user?.name?.[0] ?? email[0] ?? "A").toUpperCase();

  return (
    <View
      className="flex-row items-center bg-ui-surface-light border-b border-ui-input-border px-7 h-[60px]"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        ...makeShadow({ color: "#000", opacity: 0.04, radius: 12, offset: { width: 0, height: 2 } }),
      }}
    >
      {/* Logo */}
      <Pressable
        onPress={() => router.push("/")}
        className="flex-row items-center gap-2.5 mr-9"
        style={{ cursor: "pointer" }}
      >
        <LinearGradient
          colors={[brandPrimary[700], brandPrimary[600]]}
          style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
        >
          <Barbell size={16} color="#fff" />
        </LinearGradient>
        <View>
          <Text className="text-[15px] font-jakarta-bold text-ui-text-main tracking-tight">
            GymTrack
          </Text>
          <Text className="text-[9px] font-manrope-semi uppercase tracking-[1.2px] text-ui-text-muted">
            Mi espacio
          </Text>
        </View>
      </Pressable>

      {/* Nav links */}
      <View className="flex-row items-center gap-1 flex-1">
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = isActivePath(item.path, pathname);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                active ? "bg-brandPrimary-600/10" : ""
              }`}
              style={({ hovered, pressed }) => ({
                cursor: "pointer",
                backgroundColor:
                  hovered || pressed
                    ? "rgba(15,13,32,0.04)"
                    : "transparent",
              })}
            >
              <Icon size={14} color={active ? brandPrimary[600] : "#6e6b8a"} />
              <Text
                className={`text-[13px] ${
                  active
                    ? "font-manrope-bold text-brandPrimary-600"
                    : "font-manrope text-ui-text-muted"
                }`}
              >
                {item.label}
              </Text>
              {active && (
                <View className="w-1 h-1 rounded-full bg-brandSecondary-400" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* User */}
      <View className="flex-row items-center gap-2.5">
        <View className="flex-row items-center gap-2">
          <LinearGradient
            colors={[brandPrimary[700], brandPrimary[600]]}
            style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
          >
            {user?.image_profile ? (
              <Image
                source={{ uri: user.image_profile }}
                style={{ width: 32, height: 32, borderRadius: 10 }}
              />
            ) : (
              <Text className="text-[13px] font-jakarta-bold text-white">
                {initial}
              </Text>
            )}
          </LinearGradient>
          {!!firstName && (
            <Text className="text-[13px] font-manrope-semi text-ui-text-main">
              {firstName}
            </Text>
          )}
        </View>

        <View className="w-px h-[22px] bg-ui-input-border" />

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={({ hovered, pressed }) => ({
            cursor: "pointer",
            backgroundColor: hovered || pressed ? "rgba(239,68,68,0.08)" : "transparent",
          })}
        >
          <Logout size={14} color="#ef4444" />
          <Text className="text-xs font-manrope-semi" style={{ color: "#ef4444" }}>
            Salir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
