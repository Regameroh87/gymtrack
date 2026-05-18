import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import {
  Users,
  Barbell,
  ClipboardList,
  Receipt,
  Settings,
  ChartBar,
  Lock,
  ChevronRight,
  UserPlus,
} from "../../../assets/icons";

import { brandSecondary, ui } from "../../../src/theme/colors";

const toRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

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

export default function AdminDashboardWeb() {
  const router = useRouter();

  const dateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nav = (path) => path && router.push(`/admin/${path}`);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
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

      <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
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
                    backgroundColor: hovered ? toRgba(mod.color, 0.04) : "#fff",
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

        <View style={{ flex: 2, gap: 0 }}>
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
  );
}

const styles = {
  sectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    color: ui.text.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
};
