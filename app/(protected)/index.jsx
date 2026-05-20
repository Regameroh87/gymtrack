import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../src/auth/lib/getSession.jsx";
import ButtonLogout from "../../src/components/buttons/ButtonLogout.jsx";
import {
  brandPrimary,
  brandSecondary,
  gradient,
  ui,
} from "../../src/theme/colors.js";
import { useTheme } from "../../src/theme/theme.jsx";
import {
  Barbell,
  ChevronRight,
  ClipboardList,
  Plus,
  QrCode,
} from "../../assets/icons.jsx";

// Constantes de marca usadas en LinearGradient y shadow (no soportados por Tailwind)
const BRAND_PRIMARY = brandPrimary[700];
const BRAND_MINT = brandSecondary[400];

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
  return `${day} ${MONTHS_ES[date.getMonth()].toUpperCase()} ${date.getFullYear()}`;
}

function greetingFor(date) {
  const h = date.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const now = new Date();
  const dateLine = formatDateLine(now);
  const dayName = DAYS_ES[now.getDay()];
  const greeting = greetingFor(now);
  const firstName = (user?.name ?? "").split(" ")[0] || "Atleta";
  const imageProfile = require("../../assets/profile.png");

  // isDark solo para seleccionar entre las variantes dark/light de colors.js
  const mintHaloColors = isDark
    ? gradient.mintHalo.dark
    : gradient.mintHalo.light;
  const primaryHaloColors = isDark
    ? gradient.primaryHalo.dark
    : gradient.primaryHalo.light;
  const placeholderGradientColors = isDark
    ? gradient.sessionPlaceholder.dark
    : gradient.sessionPlaceholder.light;
  const iconMint = isDark ? brandSecondary[400] : brandSecondary[700];

  return (
    <View className="flex-1 bg-ui-background-light dark:bg-ui-background-dark">
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER editorial ── */}
        <View className=" px-5 mb-7">
          {/* Ticks */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-brandSecondary-400 w-7 h-1 rounded-sm" />
            <View className="bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40 w-2.5 h-1 rounded-sm" />
          </View>

          {/* Fecha + LIVE */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400 text-xs tracking-wide">
              {dateLine} · {dayName.toUpperCase()}
            </Text>
            {/*     <View className="flex-row items-center gap-2">
              <View
                className="bg-brandSecondary-400 w-2 h-2 rounded-full shadow-md"
                style={{
                  boxShadow: `0 0 6px ${BRAND_MINT}`,
                }}
              />
              <Text className="font-jakarta-bold text-brandSecondary-700 dark:text-brandSecondary-400 text-xs tracking-wide">
                LIVE
              </Text>
            </View> */}
          </View>

          {/* Saludo + avatar */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-manrope-semi text-[#0f0d20]/55 dark:text-white/50 text-sm tracking-wider mb-1">
                {greeting},
              </Text>
              <Text
                className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark leading-10 text-3xl tracking-tighter"
                numberOfLines={1}
              >
                {firstName}.
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <View className="border-brandPrimary-700/50 bg-brandPrimary-700/[6%] dark:bg-brandPrimary-700/[12%] w-11 h-11 rounded-3xl border-2 p-1 ">
                <Image
                  source={
                    user?.image_profile
                      ? { uri: user.image_profile }
                      : imageProfile
                  }
                  style={{ width: "100%", height: "100%", borderRadius: 18 }}
                />
              </View>
              {/* <ButtonLogout /> */}
            </View>
          </View>
        </View>

        {/* ── HERO: sesión de hoy ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/sesion");
            }}
            className="active:scale-[0.985]"
          >
            <View
              className="rounded-3xl overflow-hidden bg-ui-surface-light dark:bg-ui-background-dark border border-[#0f0d20]/8 dark:border-white/8"
              style={{
                shadowColor: BRAND_PRIMARY,
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              <LinearGradient
                colors={mintHaloColors}
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
              <LinearGradient
                colors={primaryHaloColors}
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
                className="font-jakarta-bold text-[#0f0d20]/5 dark:text-white/[4%]"
                style={{
                  position: "absolute",
                  top: -22,
                  right: -8,
                  fontSize: 180,
                  lineHeight: 180,
                  letterSpacing: -8,
                }}
              >
                {String(now.getDate()).padStart(2, "0")}
              </Text>

              {/* Ticks decorativos */}
              <View
                className="bg-brandSecondary-400"
                style={{
                  position: "absolute",
                  top: 18,
                  left: 20,
                  width: 28,
                  height: 3,
                  borderRadius: 2,
                }}
              />
              <View
                className="bg-brandSecondary-700/50 dark:bg-brandSecondary-400/40"
                style={{
                  position: "absolute",
                  top: 18,
                  left: 52,
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                }}
              />

              {/* Header row */}
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 20, paddingTop: 32 }}
              >
                <Text
                  className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
                  style={{ fontSize: 10, letterSpacing: 2.4 }}
                >
                  Today's Session
                </Text>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <View
                    className="bg-brandSecondary-400"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      shadowColor: BRAND_MINT,
                      shadowOpacity: 0.9,
                      shadowRadius: 5,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  />
                  <Text
                    className="font-jakarta-bold text-brandSecondary-700 dark:text-brandSecondary-400"
                    style={{ fontSize: 10, letterSpacing: 2 }}
                  >
                    PRÓXIMA
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
                <View className="flex-1 justify-between" style={{ gap: 14 }}>
                  <View style={{ gap: 8 }}>
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <View
                        className="bg-brandSecondary-700 dark:bg-brandSecondary-400"
                        style={{ width: 4, height: 4, borderRadius: 2 }}
                      />
                      <Text
                        className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
                        style={{ fontSize: 9, letterSpacing: 1.6 }}
                      >
                        Fuerza Total 4x · Día A
                      </Text>
                    </View>
                    <Text
                      className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark"
                      style={{
                        fontSize: 26,
                        lineHeight: 30,
                        letterSpacing: -0.8,
                      }}
                      numberOfLines={3}
                    >
                      Pecho &{"\n"}Tríceps.
                    </Text>
                    <Text
                      className="font-manrope text-[#0f0d20]/65 dark:text-white/60"
                      style={{ fontSize: 13, lineHeight: 19, marginTop: 2 }}
                    >
                      5 ejercicios · 60 min est.
                    </Text>
                  </View>
                </View>

                {/* Placeholder visual */}
                <View style={{ gap: 6, alignItems: "center" }}>
                  <View
                    className="bg-brandSecondary-400"
                    style={{
                      position: "absolute",
                      left: -10,
                      top: 12,
                      width: 3,
                      height: 36,
                      borderRadius: 2,
                    }}
                  />
                  <View
                    className="rounded-2xl overflow-hidden items-center justify-center border border-[#0f0d20]/10 dark:border-white/[12%]"
                    style={{
                      width: 124,
                      height: 124,
                      backgroundColor: isDark
                        ? ui.surface.dim
                        : brandPrimary[50],
                    }}
                  >
                    <LinearGradient
                      colors={placeholderGradientColors}
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
                    <Barbell
                      size={56}
                      color={isDark ? ui.icon.onDark : ui.icon.onLight}
                    />
                  </View>
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <View
                      className="bg-[#0f0d20]/[18%] dark:bg-white/25"
                      style={{ width: 14, height: 1 }}
                    />
                    <Text
                      className="font-manrope-bold uppercase text-[#0f0d20]/45 dark:text-white/45"
                      style={{ fontSize: 8, letterSpacing: 1.4 }}
                    >
                      Día A
                    </Text>
                    <View
                      className="bg-[#0f0d20]/[18%] dark:bg-white/25"
                      style={{ width: 14, height: 1 }}
                    />
                  </View>
                </View>
              </View>

              {/* CTA strip */}
              <View className="border-t border-[#0f0d20]/8 dark:border-white/8">
                <View
                  className="flex-row items-center justify-between"
                  style={{ paddingHorizontal: 20, paddingVertical: 14 }}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View
                      className="items-center justify-center bg-brandPrimary-700/[18%] border border-brandPrimary-700/50"
                      style={{ width: 22, height: 22, borderRadius: 11 }}
                    >
                      <View
                        className="bg-brandPrimary-700"
                        style={{ width: 6, height: 6, borderRadius: 3 }}
                      />
                    </View>
                    <Text
                      className="font-manrope-bold uppercase text-ui-text-main dark:text-ui-text-mainDark"
                      style={{ fontSize: 11, letterSpacing: 1.5 }}
                    >
                      Iniciar sesión
                    </Text>
                  </View>
                  <View
                    className="items-center justify-center rounded-full bg-brandPrimary-700"
                    style={{
                      width: 30,
                      height: 30,
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

        {/* ── ACCESO RÁPIDO ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            className="flex-row items-center"
            style={{ gap: 8, marginBottom: 14 }}
          >
            <View
              className="bg-brandSecondary-400"
              style={{ width: 16, height: 2, borderRadius: 1 }}
            />
            <Text
              className="font-manrope-bold uppercase text-brandSecondary-700 dark:text-brandSecondary-400"
              style={{ fontSize: 10, letterSpacing: 2.2 }}
            >
              Acceso Rápido
            </Text>
            <View
              className="flex-1 bg-[#0f0d20]/8 dark:bg-white/8"
              style={{ height: 1 }}
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
              icon={<Plus size={18} color={iconMint} />}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/rutinas/builder");
              }}
              variant="ghost"
            />
            <QuickAction
              kicker="Asistencia"
              title="Check-in en el gym"
              description="Escaneá el QR de recepción al llegar."
              icon={<QrCode size={18} color={iconMint} />}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/check-in");
              }}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponente ────────────────────────────────────────────────────────────

function QuickAction({
  kicker,
  title,
  description,
  icon,
  onPress,
  variant = "ghost",
}) {
  const isPrimary = variant === "primary";
  const { isDark } = useTheme();

  const arrowColor = isPrimary
    ? BRAND_PRIMARY
    : isDark
      ? ui.arrow.onDark
      : ui.arrow.onLight;

  return (
    <Pressable onPress={onPress} className="active:scale-[0.985]">
      <View
        className={`rounded-2xl overflow-hidden border p-4 flex-row items-center gap-[14px] ${
          isPrimary
            ? "bg-brandPrimary-700/10 dark:bg-brandPrimary-700/[18%] border-brandPrimary-700/25 dark:border-brandPrimary-700/35"
            : "bg-[#0f0d20]/[3%] dark:bg-white/[4%] border-[#0f0d20]/8 dark:border-white/8"
        }`}
      >
        <View
          className={`items-center justify-center ${
            isPrimary
              ? "bg-brandPrimary-700 border border-white/40 dark:border-white/[18%]"
              : "bg-brandSecondary-400/12 border border-brandSecondary-700/35 dark:border-brandSecondary-400/35"
          }`}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
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
            className={`font-manrope-bold uppercase mb-[3px] ${
              isPrimary
                ? "text-brandSecondary-700 dark:text-brandSecondary-400"
                : "text-[#0f0d20]/45 dark:text-white/45"
            }`}
            style={{ fontSize: 9, letterSpacing: 1.6 }}
          >
            {kicker}
          </Text>
          <Text
            className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark mb-[2px]"
            style={{ fontSize: 15, letterSpacing: -0.3 }}
          >
            {title}
          </Text>
          <Text
            className="font-manrope text-[#0f0d20]/55 dark:text-white/50"
            style={{ fontSize: 12, lineHeight: 16 }}
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>

        <View
          className={`items-center justify-center rounded-full ${
            isPrimary
              ? "bg-white"
              : "bg-[#0f0d20]/5 dark:bg-white/8 border border-[#0f0d20]/10 dark:border-white/[12%]"
          }`}
          style={{ width: 26, height: 26 }}
        >
          <ChevronRight size={12} color={arrowColor} />
        </View>
      </View>
    </Pressable>
  );
}
