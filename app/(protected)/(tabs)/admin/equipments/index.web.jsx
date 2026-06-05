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
import { brandPrimary, ui } from "../../../../../src/theme/colors";
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";

import {
  Barbell,
  Search,
  ChevronRight,
  Plus,
  Photo,
  CameraPlus,
} from "../../../../../assets/icons";

const PAGE_SIZE = 18;

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

export default function EquipmentsListWeb() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: equipments, isLoading } = useQuery({
    queryKey: ["admin_equipments_web"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!equipments) return { total: 0, withImage: 0, withoutImage: 0 };
    const withImage = equipments.filter((e) => !!e.image_uri).length;
    return {
      total: equipments.length,
      withImage,
      withoutImage: equipments.length - withImage,
    };
  }, [equipments]);

  const filtered = useMemo(() => {
    if (!equipments) return [];
    const q = search.trim().toLowerCase();
    if (!q) return equipments;
    return equipments.filter((e) => e.name?.toLowerCase().includes(q));
  }, [equipments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
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
              Inventario
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-rose-500 tracking-[1.4px] uppercase">
              Máquinas
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Máquinas del gimnasio
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Equipamiento disponible para asignar a los ejercicios
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/equipments/add")}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Agregar máquina
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={Barbell}
          label="Total"
          value={stats.total}
          iconColor="#f43f5e"
          bubble="bg-rose-500/10"
        />
        <StatCard
          icon={Photo}
          label="Con imagen"
          value={stats.withImage}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={CameraPlus}
          label="Sin imagen"
          value={stats.withoutImage}
          iconColor="#d97706"
          bubble="bg-amber-50"
        />
      </View>

      {/* Toolbar */}
      <View className="flex-row items-center gap-3 mb-5">
        <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
          <Search size={15} color={ui.text.muted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(0);
            }}
            placeholder="Buscar por nombre..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
          <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
            Cargando máquinas...
          </Text>
        </View>
      ) : pageRows.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-rose-500/10 items-center justify-center mb-3">
            <Barbell size={20} color="#f43f5e" />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search ? "Sin resultados" : "Aún no hay máquinas"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search
              ? "Probá con otro nombre."
              : "Agregá la primera máquina al inventario."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {pageRows.map((eq) => (
            <EquipmentCard
              key={eq.id}
              equipment={eq}
              onPress={() => router.push(`/admin/equipments/edit/${eq.id}`)}
            />
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

function EquipmentCard({ equipment, onPress }) {
  const imageUrl =
    getCloudinaryUrl(equipment.image_uri) ||
    (equipment.image_uri ? `${equipment.image_uri}` : null);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-[16px] border border-ui-input-border overflow-hidden hover:border-brandPrimary-600/30 active:scale-[0.99]"
      style={{
        cursor: "pointer",
        width: "calc(33.333% - 9.34px)",
      }}
    >
      <View
        className="w-full bg-ui-background-light overflow-hidden"
        style={{ aspectRatio: 16 / 10 }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-rose-500/5">
            <Barbell size={32} color="#f43f5e" />
          </View>
        )}
      </View>

      <View className="p-3.5">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <Text
            className="flex-1 text-[14px] font-jakarta-bold text-ui-text-main tracking-tight"
            numberOfLines={1}
          >
            {equipment.name}
          </Text>
          <ChevronRight size={14} color={ui.text.muted} />
        </View>

        <Text className="text-[10px] font-manrope text-ui-text-muted">
          Agregada {formatDate(equipment.created_at)}
        </Text>
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
