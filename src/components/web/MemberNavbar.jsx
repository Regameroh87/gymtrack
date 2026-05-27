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
import { brandPrimary, brandSecondary, ui } from "../../theme/colors.js";
import { Barbell, ClipboardList, Home, Logout } from "../../../assets/icons.jsx";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const P600       = brandPrimary[600];
const P700       = brandPrimary[700];
const MINT       = brandSecondary[400];
const SURFACE    = ui.surface.light;
const TEXT_MAIN  = ui.text.main;
const TEXT_MUTED = ui.text.muted;
const BORDER     = "rgba(196,190,230,0.25)";

const NAV = [
  { label: "Inicio",  icon: Home,          path: "/" },
  { label: "Rutinas", icon: ClipboardList, path: "/rutinas" },
];

const isActivePath = (itemPath, currentPath) => {
  if (itemPath === "/") return currentPath === "/";
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
};

export default function MemberNavbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

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
    <View style={{
      position: "sticky", top: 0, zIndex: 100,
      backgroundColor: SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 28,
      height: 60,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
    }}>
      {/* Logo */}
      <Pressable
        onPress={() => router.push("/")}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, marginRight: 36, cursor: "pointer" }}
      >
        <LinearGradient
          colors={[P700, P600]}
          style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
        >
          <Barbell size={16} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: TEXT_MAIN, letterSpacing: -0.3 }}>
            GymTrack
          </Text>
          <Text style={{ fontSize: 9, fontFamily: "Manrope_600SemiBold", color: TEXT_MUTED, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Mi espacio
          </Text>
        </View>
      </Pressable>

      {/* Nav links */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = isActivePath(item.path, pathname);
          return (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path)}
              style={({ pressed, hovered }) => ({
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: active
                  ? `rgba(48,35,205,0.08)`
                  : hovered || pressed
                    ? "rgba(15,13,32,0.04)"
                    : "transparent",
                cursor: "pointer",
              })}
            >
              <Icon size={14} color={active ? P600 : TEXT_MUTED} />
              <Text style={{
                fontSize: 13,
                fontFamily: active ? "Manrope_700Bold" : "Manrope_400Regular",
                color: active ? P600 : TEXT_MUTED,
              }}>
                {item.label}
              </Text>
              {active && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: MINT }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* User */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <LinearGradient
            colors={[P700, P600]}
            style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
          >
            {user?.image_profile
              ? <Image source={{ uri: user.image_profile }} style={{ width: 32, height: 32, borderRadius: 10 }} />
              : <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: "#fff" }}>{initial}</Text>
            }
          </LinearGradient>
          {!!firstName && (
            <Text style={{ fontSize: 13, fontFamily: "Manrope_600SemiBold", color: TEXT_MAIN }}>
              {firstName}
            </Text>
          )}
        </View>

        <View style={{ width: 1, height: 22, backgroundColor: BORDER }} />

        <Pressable
          onPress={handleLogout}
          style={({ hovered, pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 5,
            paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 99,
            backgroundColor: hovered || pressed ? "rgba(239,68,68,0.08)" : "transparent",
            cursor: "pointer",
          })}
        >
          <Logout size={14} color="#ef4444" />
          <Text style={{ fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#ef4444" }}>
            Salir
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
