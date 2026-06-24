// React
import { useMemo, useState } from "react";

// React Native
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";

// Librerías
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Toast from "react-native-toast-message";

// BD / contextos / utils
import { supabase } from "../../../../src/database/supabase";
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../src/contexts/active-gym-context";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";

// Tema / assets
import {
  ShieldHalf,
  Plus,
  ArrowRight,
  ChevronRight,
  CheckCircle,
} from "../../../../assets/icons";

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

export default function PlatformDashboardWeb() {
  const router = useRouter();
  const { brandPrimary, brandSecondary } = useGymTheme();

  // Key propia (no comparte con la lista ["admin_gyms_web"], que trae un shape
  // más rico con owner/logo): así ninguna pisa la cache de la otra.
  const { data: gyms, isLoading } = useQuery({
    queryKey: ["platform_gyms_overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select(
          "id, name, slug, logo_url, theme_primary, theme_accent, is_active, created_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = gyms ?? [];
    return {
      total: list.length,
      active: list.filter((g) => g.is_active !== false).length,
      suspended: list.filter((g) => g.is_active === false).length,
      withTheme: list.filter((g) => g.theme_primary).length,
    };
  }, [gyms]);

  const recent = useMemo(() => (gyms ?? []).slice(0, 5), [gyms]);

  const dateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const STATS = [
    {
      label: "Gimnasios",
      value: stats.total,
      icon: ShieldHalf,
      bubble: "bg-brandPrimary-50",
      iconColor: brandPrimary[600],
      dot: "bg-brandPrimary-600",
    },
    {
      label: "Activos",
      value: stats.active,
      icon: CheckCircle,
      bubble: "bg-emerald-50",
      iconColor: "#10b981",
      dot: "bg-emerald-500",
    },
    {
      label: "Suspendidos",
      value: stats.suspended,
      icon: ShieldHalf,
      bubble: "bg-amber-50",
      iconColor: "#d97706",
      dot: "bg-amber-500",
    },
    {
      label: "Con tema propio",
      value: stats.withTheme,
      icon: ShieldHalf,
      bubble: "bg-sky-50",
      iconColor: "#0284c7",
      dot: "bg-sky-500",
    },
  ];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View className="flex-row items-end justify-between mb-7">
        <View>
          <Text className="text-xs font-manrope text-ui-text-muted capitalize mb-0.5">
            {dateStr}
          </Text>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Plataforma
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/platform/gyms/new")}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Crear gimnasio
          </Text>
        </Pressable>
      </View>

      {/* Welcome Banner */}
      <LinearGradient
        colors={[brandPrimary[800], brandPrimary[600], brandPrimary[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          padding: 30,
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <View className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full bg-white/5" />
        <View className="absolute right-[100px] -bottom-[50px] w-[140px] h-[140px] rounded-full bg-white/5" />

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-1.5 h-1.5 rounded-full bg-brandSecondary-400" />
              <Text className="text-xs font-manrope-semi text-white/65 tracking-wide">
                Modo plataforma
              </Text>
            </View>
            <Text className="text-[28px] font-jakarta-bold text-white tracking-tight mb-2">
              Hola, Super Admin
            </Text>
            <Text className="text-[13px] font-manrope text-white/55 leading-5 max-w-[420px]">
              Administrá todos los gimnasios de la plataforma. Entrá a cualquiera
              para gestionarlo o creá uno nuevo.
            </Text>
          </View>

          <View className="ml-8 bg-white/10 rounded-[20px] p-6 items-center justify-center border border-white/10">
            <ShieldHalf size={36} color="rgba(255,255,255,0.9)" />
            <Text className="text-[9px] font-manrope-semi text-white/55 mt-2 tracking-widest uppercase">
              GymTrack
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View className="flex-row gap-3.5 mb-7">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <View
              key={i}
              className="flex-1 bg-white rounded-[18px] p-5 border border-ui-input-border"
            >
              <View className="flex-row items-center justify-between mb-3.5">
                <View
                  className={`w-[38px] h-[38px] rounded-[11px] items-center justify-center ${stat.bubble}`}
                >
                  <Icon size={17} color={stat.iconColor} />
                </View>
                <View
                  className={`w-1.5 h-1.5 rounded-full ${stat.dot} opacity-40`}
                />
              </View>
              <Text className="text-[30px] font-jakarta-bold text-ui-text-main tracking-tight">
                {isLoading ? "—" : stat.value}
              </Text>
              <Text className="text-xs font-manrope text-ui-text-muted mt-1">
                {stat.label}
              </Text>
              <View
                className={`h-0.5 rounded-sm mt-4 w-[35%] opacity-30 ${stat.dot}`}
              />
            </View>
          );
        })}
      </View>

      {/* Recientes */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[10px] font-manrope-semi tracking-[1.5px] uppercase text-ui-text-muted">
          Gimnasios recientes
        </Text>
        <Pressable
          onPress={() => router.push("/platform/gyms")}
          className="flex-row items-center gap-1 hover:opacity-70"
          style={{ cursor: "pointer" }}
        >
          <Text className="text-[11px] font-manrope-semi text-brandPrimary-600">
            Ver todos
          </Text>
          <ChevronRight size={13} color={brandPrimary[600]} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="py-16 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
        </View>
      ) : recent.length === 0 ? (
        <View className="py-16 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-brandSecondary-500/10 items-center justify-center mb-3">
            <ShieldHalf size={20} color={brandSecondary[500]} />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            Aún no hay gimnasios
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            Creá el primero para empezar.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {recent.map((gym) => (
            <RecentGymRow key={gym.id} gym={gym} router={router} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function RecentGymRow({ gym, router }) {
  const { brandSecondary } = useGymTheme();
  const { switchGym } = useActiveGym();
  const [entering, setEntering] = useState(false);
  const logoUrl = getCloudinaryUrl(gym.logo_url);
  const suspended = gym.is_active === false;

  const handleEnter = async () => {
    if (entering) return;
    setEntering(true);
    try {
      await switchGym(gym.id);
      router.push("/admin");
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "No se pudo entrar al gimnasio",
        text2: e?.message,
        position: "bottom",
      });
      setEntering(false);
    }
  };

  return (
    <Pressable
      onPress={handleEnter}
      disabled={entering}
      className="flex-row items-center gap-3.5 bg-white hover:bg-brandPrimary-50/40 rounded-[15px] p-4 border border-ui-input-border"
      style={{ cursor: entering ? "default" : "pointer", opacity: suspended ? 0.6 : 1 }}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: 42, height: 42, borderRadius: 11 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View className="w-[42px] h-[42px] rounded-[11px] bg-brandSecondary-500/10 items-center justify-center">
          <ShieldHalf size={18} color={brandSecondary[500]} />
        </View>
      )}

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-jakarta-bold text-ui-text-main" numberOfLines={1}>
            {gym.name}
          </Text>
          {suspended && (
            <View className="px-1.5 py-0.5 rounded-md bg-amber-100 border border-amber-200">
              <Text className="text-[9px] font-manrope-bold text-amber-700 tracking-wide uppercase">
                Suspendido
              </Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] font-manrope text-ui-text-muted mt-px">
          /{gym.slug} · {formatDate(gym.created_at)}
        </Text>
      </View>

      {entering ? (
        <ActivityIndicator size="small" color={ui.text.muted} />
      ) : (
        <View className="flex-row items-center gap-1">
          <Text className="text-[12px] font-manrope-semi text-brandPrimary-600">
            Entrar
          </Text>
          <ArrowRight size={13} color={ui.text.muted} />
        </View>
      )}
    </Pressable>
  );
}
