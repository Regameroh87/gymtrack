import { View, Text, ScrollView, Pressable } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../../database/supabase.js";
import { useAuth } from "../../auth/lib/getSession";
import { brandSecondary, gradient } from "../../theme/colors";

import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
  Home,
  Logout,
} from "../../../assets/icons";

const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", path: "", color: gradient.primary[0] },
  { icon: Users, label: "Usuarios", path: "users", color: gradient.primary[0] },
  { icon: Barbell, label: "Ejercicios", path: "exercises", color: brandSecondary[500] },
  { icon: Barbell, label: "Máquinas", path: "equipments", color: "#f43f5e" },
  { icon: ClipboardList, label: "Sesiones", path: "sessions", color: "#7c3aed" },
  { icon: ClipboardList, label: "Planes", path: "plans", color: "#0284c7" },
  { icon: Receipt, label: "Contabilidad", path: "billing", color: "#d97706" },
  { icon: ChartBar, label: "Reportes", path: "reports", comingSoon: true },
  { icon: Settings, label: "Ajustes", path: "settings", comingSoon: true },
];

function isActive(currentPath, itemPath) {
  if (!currentPath) return itemPath === "";
  const segments = currentPath.split("/").filter(Boolean);
  const adminIdx = segments.indexOf("admin");
  const sub = adminIdx >= 0 ? segments[adminIdx + 1] : undefined;
  if (itemPath === "") return !sub;
  return sub === itemPath;
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const nav = (path) => {
    const target = path ? `/admin/${path}` : "/admin";
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
    <View
      style={{
        width: 248,
        height: "100vh",
        backgroundColor: "#0C0B14",
        flexShrink: 0,
      }}
    >
      <LinearGradient
        colors={["#2518b8", "#0C0B14"]}
        style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LinearGradient
            colors={["#4a44e4", "#3023cd"]}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Barbell size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#fff",
                fontSize: 16,
                letterSpacing: -0.3,
              }}
            >
              GymTrack
            </Text>
            <Text
              style={{
                fontFamily: "Manrope_400Regular",
                color: "rgba(255,255,255,0.4)",
                fontSize: 10,
                letterSpacing: 0.3,
              }}
            >
              Panel de Control
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.navSectionLabel}>Navegación</Text>

        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.path);
          return (
            <Pressable
              key={i}
              onPress={() => !item.comingSoon && !active && nav(item.path)}
              style={({ hovered }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 10,
                paddingVertical: 9,
                marginHorizontal: 8,
                marginBottom: 2,
                borderRadius: 10,
                backgroundColor: active
                  ? "#3023cd"
                  : hovered && !item.comingSoon
                    ? "rgba(255,255,255,0.055)"
                    : "transparent",
                opacity: item.comingSoon ? 0.38 : 1,
                cursor: item.comingSoon || active ? "default" : "pointer",
              })}
            >
              {active && (
                <View
                  style={{
                    position: "absolute",
                    left: -8,
                    width: 3,
                    height: 22,
                    borderRadius: 2,
                    backgroundColor: "#2dd4bf",
                  }}
                />
              )}

              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.05)",
                }}
              >
                <Icon size={14} color={active ? "#fff" : "rgba(255,255,255,0.55)"} />
              </View>

              <Text
                style={{
                  fontFamily: active ? "Manrope_700Bold" : "Manrope_400Regular",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>

              {item.comingSoon && (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Manrope_600SemiBold",
                      color: "rgba(255,255,255,0.28)",
                      fontSize: 8,
                      letterSpacing: 0.5,
                    }}
                  >
                    SOON
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        <View
          style={{
            height: 1,
            backgroundColor: "rgba(255,255,255,0.05)",
            marginHorizontal: 16,
            marginVertical: 16,
          }}
        />

        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 12,
            padding: 14,
            backgroundColor: "rgba(45,212,191,0.07)",
            borderWidth: 1,
            borderColor: "rgba(45,212,191,0.12)",
          }}
        >
          <Text
            style={{
              fontFamily: "Manrope_600SemiBold",
              color: "#2dd4bf",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            Sistema activo
          </Text>
          <Text
            style={{
              fontFamily: "Manrope_400Regular",
              color: "rgba(255,255,255,0.35)",
              fontSize: 10,
              lineHeight: 15,
            }}
          >
            Todos los módulos operativos
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          padding: 14,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.05)",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <LinearGradient
            colors={["#4a44e4", "#3023cd"]}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#fff",
                fontSize: 14,
              }}
            >
              {initial}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Manrope_700Bold",
                color: "rgba(255,255,255,0.9)",
                fontSize: 12,
              }}
            >
              Administrador
            </Text>
            <Text
              style={{
                fontFamily: "Manrope_400Regular",
                color: "rgba(255,255,255,0.3)",
                fontSize: 10,
              }}
              numberOfLines={1}
            >
              {email}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ hovered }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 8,
            borderRadius: 9,
            backgroundColor: hovered
              ? "rgba(239,68,68,0.15)"
              : "rgba(239,68,68,0.07)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.18)",
            cursor: "pointer",
          })}
        >
          <Logout size={13} color="#ef4444" />
          <Text
            style={{
              fontFamily: "Manrope_600SemiBold",
              color: "#ef4444",
              fontSize: 12,
            }}
          >
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = {
  navSectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: "rgba(255,255,255,0.25)",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    marginBottom: 6,
    marginTop: 4,
  },
};
