import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { supabase } from "../../database/supabase.js";
import { useAuth } from "../../auth/lib/getSession";
import { useUserRole } from "../../hooks/shared/use-user-role";
import { useActiveGym } from "../../contexts/active-gym-context";
import { canAccessModule } from "../../constants/roles";
import { useGymTheme } from "../../contexts/gym-theme-context";

import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
  Home,
  Logout,
  QrCode,
  ArrowLeft,
  Flame,
  X,
} from "../../../assets/icons";

// Nota: el campo `color` no se usa en el render (los íconos usan colores fijos
// sobre el sidebar oscuro). Se conserva como metadata.
const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", path: "", color: "#3023cd" },
  { icon: Users, label: "Usuarios", path: "users", color: "#3023cd" },
  {
    icon: Barbell,
    label: "Ejercicios",
    path: "exercises",
    color: "#10b981",
  },
  { icon: Barbell, label: "Máquinas", path: "equipments", color: "#f43f5e" },
  {
    icon: ClipboardList,
    label: "Sesiones",
    path: "sessions",
    color: "#7c3aed",
  },
  { icon: ClipboardList, label: "Planes", path: "plans", color: "#0284c7" },
  { icon: Flame, label: "Actividades", path: "activities", color: "#14b8a6" },
  { icon: Receipt, label: "Contabilidad", path: "billing", color: "#d97706" },
  { icon: QrCode, label: "Asistencias", path: "attendance", color: "#10b981" },
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

export default function AdminSidebar({ isMobile, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { role } = useUserRole();
  const { isSuperAdmin, exitGym } = useActiveGym();
  const { brandPrimary, brandSecondary, logoUrl, gymName } = useGymTheme();

  // El Dashboard ("") siempre visible; el resto según permisos del rol.
  const navItems = NAV_ITEMS.filter(
    (item) => item.path === "" || canAccessModule(role, item.path)
  );

  const nav = (path) => {
    const target = path ? `/admin/${path}` : "/admin";
    router.push(target);
    if (onClose) onClose();
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined" && window.confirm("¿Cerrar sesión?")) {
      await supabase.auth.signOut();
      if (onClose) onClose();
      router.replace("/(auth)/login");
    }
  };

  // Super admin: vuelve a su home base de plataforma sin desloguear.
  const handleBackToPlatform = () => {
    exitGym();
    if (onClose) onClose();
    router.replace("/platform");
  };

  const email = user?.email || "";
  const initial = (email[0] || "A").toUpperCase();

  return (
    <View className="w-[248px] h-screen bg-[#0C0B14] shrink-0">
      {/* Brand */}
      <LinearGradient
        colors={[brandPrimary[800], "#0C0B14"]}
        style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={{ width: 38, height: 38, borderRadius: 9 }}
                resizeMode="cover"
              />
            ) : (
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
                <Barbell size={18} color="#fff" />
              </LinearGradient>
            )}
            <View>
              <Text className="text-white text-base font-jakarta-bold tracking-tight">
                {gymName ?? "GymTrack"}
              </Text>
              <Text className="text-white/40 text-[10px] font-manrope tracking-wide">
                Panel de Control
              </Text>
            </View>
          </View>

          {isMobile && (
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10"
              style={{ cursor: "pointer" }}
            >
              <X size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Volver a plataforma (solo super admin: está dentro de un gym ajeno) */}
      {isSuperAdmin && (
        <Pressable
          onPress={handleBackToPlatform}
          className="flex-row items-center gap-2 mx-2 mt-2 px-2.5 py-2 rounded-[10px] bg-white/5 hover:bg-white/10"
          style={{ cursor: "pointer" }}
        >
          <View className="w-7 h-7 rounded-lg items-center justify-center bg-white/5">
            <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
          </View>
          <Text className="flex-1 text-[12px] font-manrope-semi text-white/70">
            Volver a plataforma
          </Text>
        </Pressable>
      )}

      {/* Nav */}
      <ScrollView className="flex-1 pt-2" showsVerticalScrollIndicator={false}>
        <Text className="px-[18px] mb-1.5 mt-1 text-[9px] font-manrope-semi uppercase tracking-[1.5px] text-white/25">
          Navegación
        </Text>

        {navItems.map((item, i) => {
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
            Sistema activo
          </Text>
          <Text className="text-white/35 text-[10px] font-manrope leading-[15px]">
            Todos los módulos operativos
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
              Administrador
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
