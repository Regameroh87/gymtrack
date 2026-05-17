// React Native
import { View, Text, ScrollView, Pressable } from "react-native";

// Librerías
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";

// BD / Auth
import { supabase } from "../../../src/database/supabase.js";

// Iconos
import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
  Lock,
  ChevronRight,
  Home,
  Logout,
  UserPlus,
} from "../../../assets/icons";

// Tema
import { brandSecondary, ui, gradient } from "../../../src/theme/colors";

// ── Helpers ──
const toRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Datos estáticos ──
const NAV_ITEMS = [
  {
    icon: Home,
    label: "Dashboard",
    path: null,
    active: true,
    color: gradient.primary[0],
  },
  { icon: Users, label: "Usuarios", path: "users", color: gradient.primary[0] },
  {
    icon: Barbell,
    label: "Ejercicios",
    path: "exercises",
    color: brandSecondary[500],
  },
  { icon: Barbell, label: "Máquinas", path: "equipments", color: "#f43f5e" },
  {
    icon: ClipboardList,
    label: "Sesiones",
    path: "sessions",
    color: "#7c3aed",
  },
  { icon: ClipboardList, label: "Planes", path: "plans", color: "#0284c7" },
  { icon: Receipt, label: "Contabilidad", path: "billing", color: "#d97706" },
  { icon: ChartBar, label: "Reportes", path: "reports", comingSoon: true },
  { icon: Settings, label: "Ajustes", path: "settings", comingSoon: true },
];

const STATS = [
  {
    label: "Socios activos",
    value: "—",
    icon: Users,
    color: "#3023cd",
    bg: "#eef0ff",
  },
  {
    label: "Sesiones totales",
    value: "—",
    icon: ClipboardList,
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    label: "Planes activos",
    value: "—",
    icon: ClipboardList,
    color: "#0284c7",
    bg: "#e0f2fe",
  },
  {
    label: "Facturación mes",
    value: "—",
    icon: Receipt,
    color: "#d97706",
    bg: "#fffbeb",
  },
];

const MODULES = [
  {
    icon: Users,
    label: "Usuarios",
    sub: "Socios y Staff",
    path: "users",
    color: "#3023cd",
  },
  {
    icon: Barbell,
    label: "Ejercicios",
    sub: "Catálogo maestro",
    path: "exercises",
    color: brandSecondary[500],
  },
  {
    icon: Barbell,
    label: "Máquinas",
    sub: "Inventario del gimnasio",
    path: "equipments",
    color: "#f43f5e",
  },
  {
    icon: ClipboardList,
    label: "Sesiones",
    sub: "Armador técnico",
    path: "sessions",
    color: "#7c3aed",
  },
  {
    icon: ClipboardList,
    label: "Planes",
    sub: "Plantillas de entreno",
    path: "plans",
    color: "#0284c7",
  },
  {
    icon: Receipt,
    label: "Contabilidad",
    sub: "Membresías y pagos",
    path: "billing",
    color: "#d97706",
  },
];

const QUICK_ACTIONS = [
  {
    label: "Registrar socio",
    sub: "Nuevo miembro",
    path: "users/register",
    color: "#3023cd",
    icon: UserPlus,
  },
  {
    label: "Crear ejercicio",
    sub: "Builder de ejercicios",
    path: "exercises/builder",
    color: brandSecondary[500],
    icon: Barbell,
  },
  {
    label: "Armar sesión",
    sub: "Constructor técnico",
    path: "sessions/builder",
    color: "#7c3aed",
    icon: ClipboardList,
  },
  {
    label: "Crear plan",
    sub: "Plantilla semanal",
    path: "plans/builder",
    color: "#0284c7",
    icon: ClipboardList,
  },
];

// ── Component ──
export default function AdminDashboardWeb() {
  const router = useRouter();

  const dateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nav = (path) => path && router.push(`/admin/${path}`);

  const handleLogout = async () => {
    if (window.confirm("¿Cerrar sesión?")) {
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        height: "100vh",
        backgroundColor: ui.background.light,
      }}
    >
      {/* ════════════════ SIDEBAR ════════════════ */}
      <View
        style={{
          width: 248,
          height: "100%",
          backgroundColor: "#0C0B14",
          flexShrink: 0,
        }}
      >
        {/* Brand */}
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

        {/* Nav links */}
        <ScrollView
          style={{ flex: 1, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.navSectionLabel}>Navegación</Text>

          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={i}
                onPress={() =>
                  !item.comingSoon && !item.active && nav(item.path)
                }
                style={({ hovered }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  marginHorizontal: 8,
                  marginBottom: 2,
                  borderRadius: 10,
                  backgroundColor: item.active
                    ? "#3023cd"
                    : hovered && !item.comingSoon
                      ? "rgba(255,255,255,0.055)"
                      : "transparent",
                  opacity: item.comingSoon ? 0.38 : 1,
                  cursor:
                    item.comingSoon || item.active ? "default" : "pointer",
                })}
              >
                {/* Left accent dot for active */}
                {item.active && (
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
                    backgroundColor: item.active
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Icon
                    size={14}
                    color={item.active ? "#fff" : "rgba(255,255,255,0.55)"}
                  />
                </View>

                <Text
                  style={{
                    fontFamily: item.active
                      ? "Manrope_700Bold"
                      : "Manrope_400Regular",
                    color: item.active ? "#fff" : "rgba(255,255,255,0.55)",
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

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(255,255,255,0.05)",
              marginHorizontal: 16,
              marginVertical: 16,
            }}
          />

          {/* Mint accent strip */}
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

        {/* User section */}
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
                A
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
                gamero.rodrigo@gmail.com
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

      {/* ════════════════ MAIN ════════════════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Manrope_400Regular",
                color: ui.text.muted,
                fontSize: 12,
                textTransform: "capitalize",
                marginBottom: 3,
              }}
            >
              {dateStr}
            </Text>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: ui.text.main,
                fontSize: 26,
                letterSpacing: -0.6,
              }}
            >
              Panel de Control
            </Text>
          </View>

          {/* Badge admin */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              backgroundColor: "#fff",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: "rgba(196,190,230,0.2)",
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: "#22c55e",
              }}
            />
            <Text
              style={{
                fontFamily: "Manrope_600SemiBold",
                color: ui.text.main,
                fontSize: 12,
              }}
            >
              Admin activo
            </Text>
          </View>
        </View>

        {/* ── Welcome Banner ── */}
        <LinearGradient
          colors={["#2518b8", "#4a44e4", "#6366f1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 30,
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 100,
              bottom: -50,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          />
          <View
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#2dd4bf",
                  }}
                />
                <Text
                  style={{
                    fontFamily: "Manrope_600SemiBold",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 12,
                    letterSpacing: 0.3,
                  }}
                >
                  Bienvenido de vuelta
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: "#fff",
                  fontSize: 28,
                  letterSpacing: -0.8,
                  marginBottom: 8,
                }}
              >
                Hola, Administrador
              </Text>
              <Text
                style={{
                  fontFamily: "Manrope_400Regular",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  lineHeight: 20,
                  maxWidth: 380,
                }}
              >
                Gestiona tu gimnasio desde aquí. Usuarios, rutinas, equipos y
                más, todo centralizado.
              </Text>

              {/* Stats mini-row */}
              <View style={{ flexDirection: "row", gap: 20, marginTop: 20 }}>
                {[
                  { label: "Módulos activos", val: "6" },
                  { label: "Próximamente", val: "2" },
                ].map((s, i) => (
                  <View key={i}>
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        color: "#fff",
                        fontSize: 22,
                        letterSpacing: -0.5,
                      }}
                    >
                      {s.val}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Manrope_400Regular",
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 11,
                      }}
                    >
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Icon badge */}
            <View
              style={{
                marginLeft: 32,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding: 24,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Barbell size={36} color="rgba(255,255,255,0.9)" />
              <Text
                style={{
                  fontFamily: "Manrope_600SemiBold",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 9,
                  marginTop: 8,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                GymTrack
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Stats Row ── */}
        <View style={{ flexDirection: "row", gap: 14, marginBottom: 28 }}>
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "rgba(196,190,230,0.18)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      backgroundColor: stat.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={17} color={stat.color} />
                  </View>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: toRgba(stat.color, 0.35),
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: ui.text.main,
                    fontSize: 30,
                    letterSpacing: -1,
                  }}
                >
                  {stat.value}
                </Text>
                <Text
                  style={{
                    fontFamily: "Manrope_400Regular",
                    color: ui.text.muted,
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {stat.label}
                </Text>
                <View
                  style={{
                    height: 2,
                    backgroundColor: stat.color,
                    borderRadius: 1,
                    marginTop: 16,
                    width: "35%",
                    opacity: 0.28,
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* ── Bottom Section ── */}
        <View
          style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}
        >
          {/* Modules list */}
          <View style={{ flex: 3 }}>
            <Text style={styles.sectionLabel}>Módulos del sistema</Text>
            <View style={{ gap: 8 }}>
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <Pressable
                    key={i}
                    onPress={() => nav(mod.path)}
                    style={({ hovered, pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      backgroundColor: hovered
                        ? toRgba(mod.color, 0.04)
                        : "#fff",
                      borderRadius: 15,
                      padding: 15,
                      borderWidth: 1,
                      borderColor: hovered
                        ? toRgba(mod.color, 0.22)
                        : "rgba(196,190,230,0.18)",
                      cursor: "pointer",
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    })}
                  >
                    <View
                      style={{
                        width: 3,
                        height: 38,
                        borderRadius: 2,
                        backgroundColor: mod.color,
                      }}
                    />
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        backgroundColor: toRgba(mod.color, 0.1),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={17} color={mod.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "PlusJakartaSans_700Bold",
                          color: ui.text.main,
                          fontSize: 14,
                        }}
                      >
                        {mod.label}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Manrope_400Regular",
                          color: ui.text.muted,
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {mod.sub}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={ui.text.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Right column */}
          <View style={{ flex: 2, gap: 0 }}>
            {/* Quick actions */}
            <Text style={styles.sectionLabel}>Acciones rápidas</Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={i}
                    onPress={() => nav(action.path)}
                    style={({ hovered }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: hovered
                        ? toRgba(action.color, 0.05)
                        : "#fff",
                      borderRadius: 13,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: hovered
                        ? toRgba(action.color, 0.22)
                        : "rgba(196,190,230,0.18)",
                      cursor: "pointer",
                    })}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: toRgba(action.color, 0.1),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={14} color={action.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Manrope_700Bold",
                          color: ui.text.main,
                          fontSize: 13,
                        }}
                      >
                        {action.label}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Manrope_400Regular",
                          color: ui.text.muted,
                          fontSize: 11,
                        }}
                      >
                        {action.sub}
                      </Text>
                    </View>
                    <ChevronRight size={13} color={ui.text.muted} />
                  </Pressable>
                );
              })}
            </View>

            {/* Coming soon */}
            <Text style={styles.sectionLabel}>Próximamente</Text>
            <View style={{ gap: 8 }}>
              {[
                {
                  icon: ChartBar,
                  label: "Reportes",
                  sub: "Estadísticas del gimnasio",
                },
                {
                  icon: Settings,
                  label: "Ajustes",
                  sub: "Configuración del sistema",
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: "#f8f9fc",
                      borderRadius: 13,
                      padding: 13,
                      borderWidth: 1,
                      borderColor: "rgba(196,190,230,0.12)",
                      opacity: 0.55,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: "rgba(110,107,138,0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Lock size={13} color={ui.text.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Manrope_700Bold",
                          color: ui.text.muted,
                          fontSize: 13,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Manrope_400Regular",
                          color: ui.text.muted,
                          fontSize: 11,
                        }}
                      >
                        {item.sub}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: "rgba(110,107,138,0.1)",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Manrope_600SemiBold",
                          color: ui.text.muted,
                          fontSize: 9,
                          letterSpacing: 0.5,
                        }}
                      >
                        SOON
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles compartidos ──
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
  sectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: ui.text.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
};
