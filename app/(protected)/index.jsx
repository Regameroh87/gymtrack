// React Native
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useMemo } from "react";

// Librerías externas
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Auth
import { useAuth } from "../../src/auth/lib/getSession.jsx";

// Componentes
import ButtonLogout from "../../src/components/buttons/ButtonLogout.jsx";

// Tema / assets
import {
  Barbell,
  ChevronRight,
  ClipboardList,
  Plus,
} from "../../assets/icons.jsx";

// ─── Brand tokens (Kinetic Precision / Editorial Pass) ───────────────────────
const BRAND_PRIMARY = "#4A44E4";
const BRAND_MINT = "#2DD4BF";
const SURFACE_DARK = "#0F0D20";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const DAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function formatDateLine(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month.toUpperCase()} ${year}`;
}

function greetingFor(date) {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const now = useMemo(() => new Date(), []);
  const dateLine = formatDateLine(now);
  const dayName = DAYS_ES[now.getDay()];
  const greeting = greetingFor(now);
  const firstName = (user?.name ?? "").split(" ")[0] || "Atleta";

  const imageProfile = require("../../assets/profile.png");

  return (
    <View className="flex-1" style={{ backgroundColor: SURFACE_DARK }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER editorial ────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          {/* Ticks editoriales */}
          <View
            className="flex-row items-center"
            style={{ gap: 6, marginBottom: 14 }}
          >
            <View
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                backgroundColor: BRAND_MINT,
              }}
            />
            <View
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                backgroundColor: "rgba(45,212,191,0.4)",
              }}
            />
          </View>

          {/* Línea fecha + indicador live */}
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 14 }}
          >
            <Text
              className="font-manrope-bold uppercase"
              style={{
                fontSize: 10,
                color: BRAND_MINT,
                letterSpacing: 2.4,
              }}
            >
              {dateLine} · {dayName.toUpperCase()}
            </Text>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: BRAND_MINT,
                  shadowColor: BRAND_MINT,
                  shadowOpacity: 1,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text
                className="font-jakarta-bold"
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: 2,
                }}
              >
                LIVE
              </Text>
            </View>
          </View>

          {/* Saludo + avatar */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1" style={{ marginRight: 12 }}>
              <Text
                className="font-manrope-semi"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: 0.4,
                  marginBottom: 2,
                }}
              >
                {greeting},
              </Text>
              <Text
                className="font-jakarta-bold text-white"
                style={{
                  fontSize: 30,
                  lineHeight: 34,
                  letterSpacing: -1,
                }}
                numberOfLines={1}
              >
                {firstName}.
              </Text>
            </View>

            <View className="flex-row items-center" style={{ gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: "rgba(74,68,228,0.5)",
                  padding: 2,
                  backgroundColor: "rgba(74,68,228,0.12)",
                }}
              >
                <Image
                  source={
                    user?.image_profile
                      ? { uri: user.image_profile }
                      : imageProfile
                  }
                  style={{ width: "100%", height: "100%", borderRadius: 18 }}
                />
              </View>
              <ButtonLogout />
            </View>
          </View>
        </View>

        {/* ── HERO: sesión de hoy (empty editorial) ───────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/rutinas");
            }}
            className="active:scale-[0.985]"
          >
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: SURFACE_DARK,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                shadowColor: BRAND_PRIMARY,
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* Halo mint top-left */}
              <LinearGradient
                colors={["rgba(45,212,191,0.22)", "rgba(45,212,191,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.7, y: 0.8 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 220,
                  height: 220,
                }}
              />

              {/* Glow indigo bottom-right */}
              <LinearGradient
                colors={["rgba(74,68,228,0)", "rgba(74,68,228,0.3)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 280,
                  height: 200,
                }}
              />

              {/* Número editorial gigante de fondo */}
              <Text
                className="font-jakarta-bold"
                style={{
                  position: "absolute",
                  top: -22,
                  right: -8,
                  fontSize: 180,
                  lineHeight: 180,
                  color: "rgba(255,255,255,0.04)",
                  letterSpacing: -8,
                }}
              >
                {String(now.getDate()).padStart(2, "0")}
              </Text>

              {/* Ticks decorativos */}
              <View
                style={{
                  position: "absolute",
                  top: 18,
                  left: 20,
                  width: 28,
                  height: 3,
                  backgroundColor: BRAND_MINT,
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 18,
                  left: 52,
                  width: 10,
                  height: 3,
                  backgroundColor: "rgba(45,212,191,0.4)",
                  borderRadius: 2,
                }}
              />

              {/* Header row */}
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 20, paddingTop: 32 }}
              >
                <Text
                  className="font-manrope-bold uppercase"
                  style={{
                    fontSize: 10,
                    color: BRAND_MINT,
                    letterSpacing: 2.4,
                  }}
                >
                  Today's Session
                </Text>

                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.35)",
                    }}
                  />
                  <Text
                    className="font-jakarta-bold"
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: 2,
                    }}
                  >
                    DESCANSO
                  </Text>
                </View>
              </View>

              {/* Body */}
              <View
                className="flex-row"
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 18,
                  paddingBottom: 22,
                  gap: 16,
                }}
              >
                {/* Columna izquierda */}
                <View
                  className="flex-1 justify-between"
                  style={{ gap: 14 }}
                >
                  <View style={{ gap: 8 }}>
                    <View
                      className="flex-row items-center"
                      style={{ gap: 6 }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "rgba(255,255,255,0.4)",
                        }}
                      />
                      <Text
                        className="font-manrope-bold uppercase"
                        style={{
                          fontSize: 9,
                          color: "rgba(255,255,255,0.55)",
                          letterSpacing: 1.6,
                        }}
                      >
                        Sin plan asignado
                      </Text>
                    </View>

                    <Text
                      className="font-jakarta-bold text-white"
                      style={{
                        fontSize: 26,
                        lineHeight: 30,
                        letterSpacing: -0.8,
                      }}
                      numberOfLines={3}
                    >
                      Hoy es día libre.
                    </Text>

                    <Text
                      className="font-manrope"
                      style={{
                        fontSize: 13,
                        lineHeight: 19,
                        color: "rgba(255,255,255,0.6)",
                        marginTop: 2,
                      }}
                    >
                      Explorá el catálogo y elegí un plan para empezar a entrenar.
                    </Text>
                  </View>
                </View>

                {/* Columna derecha — visual placeholder con ícono */}
                <View style={{ gap: 6, alignItems: "center" }}>
                  <View
                    style={{
                      position: "absolute",
                      left: -10,
                      top: 12,
                      width: 3,
                      height: 36,
                      backgroundColor: BRAND_MINT,
                      borderRadius: 2,
                    }}
                  />

                  <View
                    className="rounded-2xl overflow-hidden items-center justify-center"
                    style={{
                      width: 124,
                      height: 124,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "#1a1730",
                    }}
                  >
                    <LinearGradient
                      colors={["#0C0B14", "#1e1b4b", "#3023cd"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                      }}
                    />
                    <Barbell size={56} color="rgba(255,255,255,0.4)" />
                  </View>

                  <View
                    className="flex-row items-center"
                    style={{ gap: 4 }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 1,
                        backgroundColor: "rgba(255,255,255,0.25)",
                      }}
                    />
                    <Text
                      className="font-manrope-bold uppercase"
                      style={{
                        fontSize: 8,
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: 1.4,
                      }}
                    >
                      Empty
                    </Text>
                    <View
                      style={{
                        width: 14,
                        height: 1,
                        backgroundColor: "rgba(255,255,255,0.25)",
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* CTA strip */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.08)",
                }}
              >
                <View
                  className="flex-row items-center justify-between"
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                  }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ gap: 8 }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(74,68,228,0.18)",
                        borderWidth: 1,
                        borderColor: "rgba(74,68,228,0.5)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: BRAND_PRIMARY,
                        }}
                      />
                    </View>
                    <Text
                      className="font-manrope-bold uppercase text-white"
                      style={{
                        fontSize: 11,
                        letterSpacing: 1.5,
                      }}
                    >
                      Explorar planes
                    </Text>
                  </View>

                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: BRAND_PRIMARY,
                      shadowColor: BRAND_PRIMARY,
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    }}
                  >
                    <ChevronRight size={14} color="white" />
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ── ACCESO RÁPIDO ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            className="flex-row items-center"
            style={{ gap: 8, marginBottom: 14 }}
          >
            <View
              style={{
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: BRAND_MINT,
              }}
            />
            <Text
              className="font-manrope-bold uppercase"
              style={{
                fontSize: 10,
                color: BRAND_MINT,
                letterSpacing: 2.2,
              }}
            >
              Acceso Rápido
            </Text>
            <View
              style={{
                flex: 1,
                height: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
          </View>

          <View style={{ gap: 10 }}>
            <QuickAction
              kicker="Catálogo"
              title="Explorar rutinas"
              description="Planes y sesiones publicados por el gym."
              icon={<ClipboardList size={18} color="white" />}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/rutinas");
              }}
              variant="primary"
            />

            <QuickAction
              kicker="Personalizado"
              title="Crear mi rutina"
              description="Armá una rutina propia eligiendo ejercicios."
              icon={<Plus size={18} color={BRAND_MINT} />}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/rutinas/builder");
              }}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponente: QuickAction ──────────────────────────────────────────────

function QuickAction({
  kicker,
  title,
  description,
  icon,
  onPress,
  variant = "ghost",
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable onPress={onPress} className="active:scale-[0.985]">
      <View
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: isPrimary
            ? "rgba(74,68,228,0.12)"
            : "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: isPrimary
            ? "rgba(74,68,228,0.35)"
            : "rgba(255,255,255,0.08)",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: isPrimary
              ? BRAND_PRIMARY
              : "rgba(45,212,191,0.12)",
            borderWidth: 1,
            borderColor: isPrimary
              ? "rgba(255,255,255,0.18)"
              : "rgba(45,212,191,0.35)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: isPrimary ? BRAND_PRIMARY : "transparent",
            shadowOpacity: isPrimary ? 0.5 : 0,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {icon}
        </View>

        <View className="flex-1">
          <Text
            className="font-manrope-bold uppercase"
            style={{
              fontSize: 9,
              color: isPrimary ? BRAND_MINT : "rgba(255,255,255,0.45)",
              letterSpacing: 1.6,
              marginBottom: 3,
            }}
          >
            {kicker}
          </Text>
          <Text
            className="font-jakarta-bold text-white"
            style={{
              fontSize: 15,
              letterSpacing: -0.3,
              marginBottom: 2,
            }}
          >
            {title}
          </Text>
          <Text
            className="font-manrope"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>

        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 26,
            height: 26,
            backgroundColor: isPrimary
              ? "white"
              : "rgba(255,255,255,0.08)",
            borderWidth: isPrimary ? 0 : 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <ChevronRight
            size={12}
            color={isPrimary ? BRAND_PRIMARY : "rgba(255,255,255,0.65)"}
          />
        </View>
      </View>
    </Pressable>
  );
}
