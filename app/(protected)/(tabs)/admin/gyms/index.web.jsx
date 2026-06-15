import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";

import { supabase } from "../../../../../src/database/supabase";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";

import {
  ShieldHalf,
  Users,
  Search,
  ChevronRight,
  Plus,
  MapPin,
} from "../../../../../assets/icons";

const PAGE_SIZE = 12;

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

export default function GymsListWeb() {
  const router = useRouter();
  const { brandPrimary, brandSecondary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: gyms, isLoading } = useQuery({
    queryKey: ["admin_gyms_web"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // El owner vive en profiles (FK por user_id); PostgREST no puede
      // joinear gyms→profiles directo porque la FK apunta a auth.users.
      const ownerIds = [...new Set(data.map((g) => g.owner_id).filter(Boolean))];
      let ownersByUserId = {};
      if (ownerIds.length) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("user_id, name, last_name, email")
          .in("user_id", ownerIds);
        ownersByUserId = Object.fromEntries(
          (owners || []).map((o) => [o.user_id, o])
        );
      }

      return data.map((g) => ({ ...g, owner: ownersByUserId[g.owner_id] }));
    },
  });

  const stats = useMemo(() => {
    if (!gyms) return { total: 0, withLogo: 0, withTheme: 0 };
    return {
      total: gyms.length,
      withLogo: gyms.filter((g) => g.logo_url).length,
      withTheme: gyms.filter((g) => g.theme_primary).length,
    };
  }, [gyms]);

  const filtered = useMemo(() => {
    if (!gyms) return [];
    const q = search.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.slug?.toLowerCase().includes(q) ||
        g.owner?.name?.toLowerCase().includes(q) ||
        g.owner?.email?.toLowerCase().includes(q)
    );
  }, [gyms, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-end justify-between mb-6">
        <View>
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Plataforma
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-brandSecondary-500 tracking-[1.4px] uppercase">
              Gimnasios
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Gimnasios
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Gestión de los gimnasios de la plataforma (solo super admin)
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/gyms/new")}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Crear gimnasio
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={ShieldHalf}
          label="Total"
          value={stats.total}
          iconColor={brandSecondary[500]}
          bubble="bg-brandSecondary-500/10"
        />
        <StatCard
          icon={Users}
          label="Con logo"
          value={stats.withLogo}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={MapPin}
          label="Con tema propio"
          value={stats.withTheme}
          iconColor="#0284c7"
          bubble="bg-sky-50"
        />
      </View>

      {/* Toolbar */}
      <View className="flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border mb-5">
        <Search size={15} color={ui.text.muted} />
        <TextInput
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setPage(0);
          }}
          placeholder="Buscar por nombre, slug o dueño..."
          placeholderTextColor={ui.text.muted}
          className="flex-1 text-[13px] font-manrope text-ui-text-main"
          style={{ outlineWidth: 0 }}
        />
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
          <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
            Cargando gimnasios...
          </Text>
        </View>
      ) : pageRows.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-brandSecondary-500/10 items-center justify-center mb-3">
            <ShieldHalf size={20} color={brandSecondary[500]} />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search ? "Sin resultados" : "Aún no hay gimnasios"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search
              ? "Probá con otra búsqueda."
              : "Creá el primer gimnasio para empezar."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {pageRows.map((gym) => (
            <GymCard key={gym.id} gym={gym} router={router} />
          ))}
        </View>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <View className="flex-row items-center justify-between mt-5">
          <Text className="text-xs font-manrope text-ui-text-muted">
            Mostrando{" "}
            <Text className="font-manrope-bold text-ui-text-main">
              {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}
            </Text>{" "}
            de {filtered.length}
          </Text>

          <View className="flex-row gap-2">
            <PageBtn
              label="Anterior"
              disabled={currentPage === 0}
              onPress={() => setPage((p) => Math.max(0, p - 1))}
            />
            <PageBtn
              label="Siguiente"
              disabled={currentPage >= totalPages - 1}
              onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Subcomponents ──

function StatCard({ icon: Icon, label, value, iconColor, bubble }) {
  return (
    <View className="flex-1 flex-row items-center gap-3.5 bg-white rounded-2xl p-4 border border-ui-input-border">
      <View
        className={`w-[42px] h-[42px] rounded-xl items-center justify-center ${bubble}`}
      >
        <Icon size={18} color={iconColor} />
      </View>
      <View>
        <Text className="text-[22px] font-jakarta-bold text-ui-text-main tracking-tight">
          {value}
        </Text>
        <Text className="text-[11px] font-manrope text-ui-text-muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

function GymCard({ gym, router }) {
  const { brandSecondary } = useGymTheme();
  const logoUrl =
    getCloudinaryUrl(gym.logo_url) || (gym.logo_url ? `${gym.logo_url}` : null);
  const ownerLabel = gym.owner
    ? `${gym.owner.name || ""} ${gym.owner.last_name || ""}`.trim() ||
      gym.owner.email
    : "Sin dueño asignado";

  return (
    <Pressable
      onPress={() => router.push(`/admin/gyms/${gym.id}`)}
      className="bg-white rounded-[16px] border border-ui-input-border overflow-hidden hover:border-brandPrimary-300"
      style={{ width: "calc(33.333% - 9.34px)", cursor: "pointer" }}
    >
      <View className="p-4 flex-row items-center gap-3">
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 48, height: 48, borderRadius: 12 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="w-12 h-12 rounded-xl bg-brandSecondary-500/10 items-center justify-center">
            <ShieldHalf size={20} color={brandSecondary[500]} />
          </View>
        )}

        <View className="flex-1">
          <Text
            className="text-[14px] font-jakarta-bold text-ui-text-main tracking-tight"
            numberOfLines={1}
          >
            {gym.name}
          </Text>
          <Text
            className="text-[11px] font-manrope text-ui-text-muted"
            numberOfLines={1}
          >
            /{gym.slug}
          </Text>
        </View>

        <ChevronRight size={14} color={ui.text.muted} />
      </View>

      <View className="px-4 pb-4">
        <View className="flex-row items-center gap-1.5 mb-2.5">
          <Users size={12} color={ui.text.muted} />
          <Text
            className="text-[11px] font-manrope text-ui-text-muted flex-1"
            numberOfLines={1}
          >
            {ownerLabel}
          </Text>
        </View>

        <View className="pt-3 border-t border-ui-input-border flex-row items-center justify-between">
          {/* Colores del tema del gym */}
          <View className="flex-row items-center gap-1.5">
            <View
              className="w-4 h-4 rounded-full border border-black/10"
              style={{ backgroundColor: gym.theme_primary || "#4A44E4" }}
            />
            <View
              className="w-4 h-4 rounded-full border border-black/10"
              style={{ backgroundColor: gym.theme_accent || "#2DD4BF" }}
            />
            {!gym.theme_primary && (
              <Text className="text-[9px] font-manrope text-ui-text-muted ml-1">
                Tema por defecto
              </Text>
            )}
          </View>
          <Text className="text-[10px] font-manrope text-ui-text-muted">
            {formatDate(gym.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function PageBtn({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-3.5 py-2 rounded-[9px] border border-ui-input-border ${
        disabled
          ? "bg-ui-background-light opacity-50"
          : "bg-white hover:bg-brandPrimary-50/60"
      }`}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      <Text
        className={`text-xs font-manrope-semi ${
          disabled ? "text-ui-text-muted" : "text-ui-text-main"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
