// React Native
import { View, Text, ScrollView, Pressable } from "react-native";

// Librerías
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// BD / Auth
import { supabase } from "../../database/supabase.js";
import { useAuth } from "../../auth/lib/getSession";

// Tema / assets
import { brandPrimary, brandSecondary } from "../../theme/colors";
import {
  ShieldHalf,
  Users,
  Receipt,
  Settings,
  Home,
  Logout,
} from "../../../assets/icons";

// Sidebar del SUPER ADMIN (modo plataforma). A diferencia del panel de un gym,
// usa la marca fija GymTrack (no el theme de ningún gimnasio) y lista las
// secciones de plataforma: gimnasios, facturación, usuarios globales y ajustes.
const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", path: "" },
  { icon: ShieldHalf, label: "Gimnasios", path: "gyms" },
  { icon: Receipt, label: "Facturación", path: "billing", comingSoon: true },
  { icon: Users, label: "Usuarios globales", path: "users", comingSoon: true },
  { icon: Settings, label: "Ajustes", path: "settings", comingSoon: true },
];

function isActive(currentPath, itemPath) {
  if (!currentPath) return itemPath === "";
  const segments = currentPath.split("/").filter(Boolean);
  const rootIdx = segments.indexOf("platform");
  const sub = rootIdx >= 0 ? segments[rootIdx + 1] : undefined;
  if (itemPath === "") return !sub;
  return sub === itemPath;
}

export default function PlatformSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const nav = (path) => {
    const target = path ? `/platform/${path}` : "/platform";
    router.push(target);
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined" && window.confirm("¿Cerrar sesión?")) {
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    }
  };

  const email = user?.email || "";
  const initial = (email[0] || "A").toUpperCase();

  return (
    <View className="w-[248px] h-screen bg-[#0C0B14] shrink-0">
      {/* Brand GymTrack (plataforma) */}
      <LinearGradient
        colors={[brandPrimary[800], "#0C0B14"]}
        style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}
      >
        <View className="flex-row items-center gap-2.5">
          <LinearGradient
            colors={[brandPrimary[700], brandPrimary[600]]}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldHalf size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text className="text-white text-base font-jakarta-bold tracking-tight">
              GymTrack
            </Text>
            <Text className="text-white/40 text-[10px] font-manrope tracking-wide">
              Plataforma
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Nav */}
      <ScrollView className="flex-1 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="px-[18px] mb-1.5 mt-1 text-[9px] font-manrope-semi uppercase tracking-[1.5px] text-white/25">
          Plataforma
        </Text>

        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.path);
          const disabled = item.comingSoon || active;

          return (
            <Pressable
              key={i}
              onPress={() => !item.comingSoon && !active && nav(item.path)}
              className={`relative flex-row items-center gap-2.5 px-2.5 py-2.5 mx-2 mb-0.5 rounded-[10px] ${
                active
                  ? "bg-brandPrimary-600"
                  : item.comingSoon
                    ? "opacity-40"
                    : "hover:bg-white/5"
              }`}
              style={{ cursor: disabled ? "default" : "pointer" }}
            >
              {active && (
                <View className="absolute -left-2 w-[3px] h-[22px] rounded-sm bg-brandSecondary-400" />
              )}

              <View
                className={`w-7 h-7 rounded-lg items-center justify-center ${
                  active ? "bg-white/20" : "bg-white/5"
                }`}
              >
                <Icon
                  size={14}
                  color={active ? "#fff" : "rgba(255,255,255,0.55)"}
                />
              </View>

              <Text
                className={`flex-1 text-[13px] ${
                  active
                    ? "font-manrope-bold text-white"
                    : "font-manrope text-white/55"
                }`}
              >
                {item.label}
              </Text>

              {item.comingSoon && (
                <View className="bg-white/5 px-1.5 py-0.5 rounded">
                  <Text className="text-[8px] font-manrope-semi tracking-wider text-white/30">
                    SOON
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <View className="h-px bg-white/5 mx-4 my-4" />

        {/* Status card */}
        <View className="mx-4 mb-3 rounded-xl p-3.5 bg-brandSecondary-400/7 border border-brandSecondary-400/10">
          <Text className="text-brandSecondary-400 text-[11px] font-manrope-semi mb-0.5">
            Modo plataforma
          </Text>
          <Text className="text-white/35 text-[10px] font-manrope leading-[15px]">
            Estás administrando todos los gimnasios
          </Text>
        </View>
      </ScrollView>

      {/* Footer user */}
      <View className="p-3.5 border-t border-white/5">
        <View className="flex-row items-center gap-2.5 mb-2.5">
          <LinearGradient
            colors={[brandPrimary[700], brandPrimary[600]]}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-white text-sm font-jakarta-bold">
              {initial}
            </Text>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-white/90 text-xs font-manrope-bold">
              Super Admin
            </Text>
            <Text
              className="text-white/30 text-[10px] font-manrope"
              numberOfLines={1}
            >
              {email}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-1.5 py-2 rounded-[9px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/15"
          style={{ cursor: "pointer" }}
        >
          <Logout size={13} color="#ef4444" />
          <Text className="text-red-500 text-xs font-manrope-semi">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
