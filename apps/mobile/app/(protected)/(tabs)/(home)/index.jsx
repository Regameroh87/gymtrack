// ── React Native ──
import { Image, Pressable, ScrollView, Text, View } from "react-native";

// ── Expo ──
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Auth / Theme ──
import { useAuth } from "../../../../src/auth/lib/getSession.jsx";
import { useTheme } from "../../../../src/theme/theme.jsx";

// ── Design Tokens ──
import {
  brandPrimary,
  brandSecondary,
  ui,
} from "@gymtrack/core/colors";

// ── Utils ──
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { makeShadow } from "../../../../src/utils/box-shadow.js";

// ── Assets ──
import {
  ChevronRight,
  ClipboardList,
  Plus,
  QrCode,
} from "../../../../assets/icons.jsx";

// ── Components ──
import HeroeCardHome from "../../../../src/components/cards/heroe-card-home.jsx";

const BRAND_PRIMARY = brandPrimary[700];

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
  const rawFirst = (user?.name ?? "").split(" ")[0] || "Atleta";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const imageProfile = require("../../../../assets/profile.png");
  const profileUrl = getCloudinaryUrl(user?.image_profile);
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
        <View className=" px-5 pt-4 mb-7">
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
          </View>

          {/* Saludo + avatar */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="font-manrope-semi text-ui-text-main/55 dark:text-white/50 text-sm tracking-wider mb-1">
                {greeting},
              </Text>
              <Text
                className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark leading-10 text-3xl tracking-tighter"
                numberOfLines={1}
              >
                {firstName}.
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.soft);
                router.navigate("/(protected)/profile");
              }}
              className="flex-row items-center gap-2 active:opacity-70 active:scale-110"
            >
              <View className="border-brandPrimary-700/50 bg-brandPrimary-700/[6%] dark:bg-brandPrimary-700/[12%] w-11 h-11 rounded-3xl border-2 p-1 ">
                <Image
                  source={profileUrl ? { uri: profileUrl } : imageProfile}
                  style={{ width: "100%", height: "100%", borderRadius: 18 }}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── HERO: sesión de hoy ── */}
        <HeroeCardHome />

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
              className="flex-1 bg-ui-text-main/[8%] dark:bg-white/[8%]"
              style={{ height: 1 }}
            />
          </View>

          <View style={{ gap: 10 }}>
            <QuickAction
              kicker="Catálogo"
              title="Explorar rutinas"
              description="Planes y sesiones publicados por el gym."
              icon={<ClipboardList size={18} color="white" />}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/planes");
              }}
              variant="primary"
            />
            <QuickAction
              kicker="Personalizado"
              title="Crear mi rutina"
              description="Armá una rutina propia eligiendo ejercicios."
              icon={<Plus size={18} color={iconMint} />}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/planes/builder");
              }}
              variant="ghost"
            />
            <QuickAction
              kicker="Asistencia"
              title="Check-in en el gym"
              description="Escaneá el QR de recepción al llegar."
              icon={<QrCode size={18} color={iconMint} />}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            : "bg-ui-text-main/[3%] dark:bg-white/[4%] border-ui-text-main/[8%] dark:border-white/[8%]"
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
            ...makeShadow({ color: isPrimary ? BRAND_PRIMARY : "transparent", opacity: isPrimary ? 0.5 : 0, radius: 10, offset: { width: 0, height: 4 } }),
          }}
        >
          {icon}
        </View>

        <View className="flex-1">
          <Text
            className={`font-manrope-bold uppercase mb-[3px] ${
              isPrimary
                ? "text-brandSecondary-700 dark:text-brandSecondary-400"
                : "text-ui-text-main/45 dark:text-white/45"
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
            className="font-manrope text-ui-text-main/55 dark:text-white/50"
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
              : "bg-ui-text-main/5 dark:bg-white/[8%] border border-ui-text-main/10 dark:border-white/[12%]"
          }`}
          style={{ width: 26, height: 26 }}
        >
          <ChevronRight size={12} color={arrowColor} />
        </View>
      </View>
    </Pressable>
  );
}
