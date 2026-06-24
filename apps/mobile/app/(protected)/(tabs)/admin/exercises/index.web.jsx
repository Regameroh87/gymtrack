import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";

import { supabase } from "../../../../../src/database/supabase";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";

import {
  Barbell,
  Search,
  ChevronRight,
  ListDetails,
  Filter,
  Plus,
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

export default function ExercisesListWeb() {
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { brandPrimary, brandSecondary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const cardWidth = isMobile
    ? "100%"
    : width < 1024
      ? "calc(50% - 7px)"
      : "calc(33.333% - 9.34px)";

  // Multi-gym: la RLS devuelve todos los gyms del usuario; el filtro por
  // gym activo es del cliente.
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["admin_exercises_web", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises_base")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!exercises) return { total: 0, categories: 0, muscles: 0 };
    const categories = new Set(
      exercises.map((e) => e.category).filter(Boolean)
    );
    const muscles = new Set(
      exercises.map((e) => e.muscle_group).filter(Boolean)
    );
    return {
      total: exercises.length,
      categories: categories.size,
      muscles: muscles.size,
    };
  }, [exercises]);

  const categories = useMemo(() => {
    if (!exercises) return [];
    const set = new Set(exercises.map((e) => e.category).filter(Boolean));
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matches =
        !q ||
        e.name?.toLowerCase().includes(q) ||
        e.muscle_group?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);
      if (!matches) return false;
      if (category !== "all" && e.category !== category) return false;
      return true;
    });
  }, [exercises, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: isMobile ? 16 : 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className={`flex-row justify-between mb-6 ${isMobile ? "flex-col items-stretch gap-4" : "items-end"}`}>
        <View>
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <Text className="text-[11px] font-manrope-semi text-ui-text-muted tracking-[1.4px] uppercase">
              Catálogo
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-brandSecondary-500 tracking-[1.4px] uppercase">
              Ejercicios
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Catálogo de ejercicios
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Biblioteca maestra de movimientos disponibles para las sesiones
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/exercises/builder")}
          className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30 self-start md:self-auto"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Crear ejercicio
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className={isMobile ? "flex-col gap-3.5 mb-6" : "flex-row gap-3.5 mb-6"}>
        <StatCard
          icon={Barbell}
          label="Total"
          value={stats.total}
          iconColor={brandSecondary[500]}
          bubble="bg-brandSecondary-500/10"
        />
        <StatCard
          icon={ListDetails}
          label="Categorías"
          value={stats.categories}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={Filter}
          label="Grupos musculares"
          value={stats.muscles}
          iconColor="#0284c7"
          bubble="bg-sky-50"
        />
      </View>

      {/* Toolbar */}
      <View className={isMobile ? "flex-col items-stretch gap-3 mb-5" : "flex-row items-center gap-3 mb-5"}>
        {/* Search */}
        <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
          <Search size={15} color={ui.text.muted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(0);
            }}
            placeholder="Buscar por nombre, grupo o categoría..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>

        {/* Category filter */}
        <View className="flex-row flex-wrap gap-1 bg-white rounded-xl p-1 border border-ui-input-border justify-start">
          <FilterChip
            label="Todas"
            active={category === "all"}
            onPress={() => {
              setCategory("all");
              setPage(0);
            }}
          />
          {categories.slice(0, 5).map((cat) => (
            <FilterChip
              key={cat}
              label={cat}
              active={category === cat}
              onPress={() => {
                setCategory(cat);
                setPage(0);
              }}
            />
          ))}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
          <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
            Cargando ejercicios...
          </Text>
        </View>
      ) : pageRows.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-brandSecondary-500/10 items-center justify-center mb-3">
            <Barbell size={20} color={brandSecondary[500]} />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search || category !== "all"
              ? "Sin resultados"
              : "Aún no hay ejercicios"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search || category !== "all"
              ? "Ajustá los filtros o probá con otra búsqueda."
              : "Creá el primer ejercicio para empezar el catálogo."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {pageRows.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              width={cardWidth}
              onPress={() => router.push(`/admin/exercises/${ex.id}`)}
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

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3.5 py-1.5 rounded-[9px] ${
        active ? "bg-brandPrimary-600" : "hover:bg-brandPrimary-50/60"
      }`}
      style={{ cursor: "pointer" }}
    >
      <Text
        className={`text-xs ${
          active
            ? "font-manrope-bold text-white"
            : "font-manrope-semi text-ui-text-muted"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ExerciseCard({ exercise, onPress, width }) {
  const { brandSecondary } = useGymTheme();
  const imageUrl =
    getCloudinaryUrl(exercise.image_uri) ||
    (exercise.image_uri ? `${exercise.image_uri}` : null);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-[16px] border border-ui-input-border overflow-hidden hover:border-brandPrimary-600/30 active:scale-[0.99]"
      style={{
        cursor: "pointer",
        width: width || "calc(33.333% - 9.34px)",
      }}
    >
      {/* Image */}
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
          <View className="flex-1 items-center justify-center bg-brandSecondary-500/5">
            <Barbell size={32} color={brandSecondary[500]} />
          </View>
        )}
      </View>

      {/* Body */}
      <View className="p-3.5">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <Text
            className="flex-1 text-[14px] font-jakarta-bold text-ui-text-main tracking-tight"
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          <ChevronRight size={14} color={ui.text.muted} />
        </View>

        <View className="flex-row items-center gap-1.5 flex-wrap">
          {exercise.muscle_group && (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-brandSecondary-500/10">
              <View className="w-1 h-1 rounded-full bg-brandSecondary-500" />
              <Text className="text-[10px] font-manrope-bold tracking-wider uppercase text-brandSecondary-700">
                {exercise.muscle_group}
              </Text>
            </View>
          )}
          {exercise.category && (
            <Text className="text-[10px] font-manrope text-ui-text-muted">
              {exercise.category}
            </Text>
          )}
        </View>

        <View className="mt-3 pt-3 border-t border-ui-input-border flex-row items-center justify-between">
          <Text className="text-[10px] font-manrope text-ui-text-muted">
            {formatDate(exercise.created_at)}
          </Text>
          {exercise.is_unilateral && (
            <View className="px-1.5 py-0.5 rounded bg-amber-50">
              <Text className="text-[9px] font-manrope-bold tracking-wider uppercase text-amber-700">
                Unilateral
              </Text>
            </View>
          )}
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
