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
import { ui } from "@gymtrack/core/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActiveGym } from "../../../../../src/contexts/active-gym-context";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { PLAN_GENDER_BADGES } from "../../../../../src/constants/gender-options";

import {
  ClipboardList,
  Search,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Calendar,
  Clock,
} from "../../../../../assets/icons";

const PAGE_SIZE = 12;

const LEVEL_META = {
  principiante: { label: "Principiante", color: "#10b981", bubble: "bg-emerald-50", text: "text-emerald-700" },
  intermedio: { label: "Intermedio", color: "#f59e0b", bubble: "bg-amber-50", text: "text-amber-700" },
  avanzado: { label: "Avanzado", color: "#ef4444", bubble: "bg-red-50", text: "text-red-700" },
};

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

export default function PlansListWeb() {
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [page, setPage] = useState(0);

  // Multi-gym: la RLS devuelve todos los gyms del usuario; el filtro por
  // gym activo es del cliente.
  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin_plans_web", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["admin_plan_assignments_active", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_assignments")
        .select("plan_id, status")
        .eq("status", "active")
        .eq("gym_id", gymId);
      if (error) throw error;
      return data;
    },
  });

  const activeCountByPlan = useMemo(() => {
    const map = {};
    (assignments || []).forEach((a) => {
      map[a.plan_id] = (map[a.plan_id] || 0) + 1;
    });
    return map;
  }, [assignments]);

  const stats = useMemo(() => {
    if (!plans) return { total: 0, active: 0, levels: 0 };
    const levels = new Set(plans.map((p) => p.level).filter(Boolean));
    return {
      total: plans.length,
      active: assignments?.length || 0,
      levels: levels.size,
    };
  }, [plans, assignments]);

  const levels = useMemo(() => {
    if (!plans) return [];
    const set = new Set(plans.map((p) => p.level).filter(Boolean));
    return Array.from(set);
  }, [plans]);

  const filtered = useMemo(() => {
    if (!plans) return [];
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      const matches =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.objective?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      if (!matches) return false;
      if (level !== "all" && p.level !== level) return false;
      return true;
    });
  }, [plans, search, level]);

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
              Programación
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-sky-600 tracking-[1.4px] uppercase">
              Planes
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Planes de entrenamiento
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Plantillas semanales que combinan sesiones a lo largo del tiempo
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/plans/builder")}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Crear plan
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={ClipboardList}
          label="Total"
          value={stats.total}
          iconColor="#0284c7"
          bubble="bg-sky-50"
        />
        <StatCard
          icon={Users}
          label="Asignaciones activas"
          value={stats.active}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={Filter}
          label="Niveles únicos"
          value={stats.levels}
          iconColor="#7c3aed"
          bubble="bg-violet-50"
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
            placeholder="Buscar por nombre, objetivo o descripción..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>

        {levels.length > 0 && (
          <View className="flex-row bg-white rounded-xl p-1 border border-ui-input-border">
            <FilterChip
              label="Todos"
              active={level === "all"}
              onPress={() => {
                setLevel("all");
                setPage(0);
              }}
            />
            {levels.map((lvl) => (
              <FilterChip
                key={lvl}
                label={LEVEL_META[lvl]?.label || lvl}
                active={level === lvl}
                onPress={() => {
                  setLevel(lvl);
                  setPage(0);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Body */}
      {isLoading ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <ActivityIndicator size="small" color={brandPrimary[600]} />
          <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
            Cargando planes...
          </Text>
        </View>
      ) : pageRows.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-sky-50 items-center justify-center mb-3">
            <ClipboardList size={20} color="#0284c7" />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search || level !== "all" ? "Sin resultados" : "Aún no hay planes"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search || level !== "all"
              ? "Ajustá los filtros o probá con otra búsqueda."
              : "Creá el primer plan de entrenamiento."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {pageRows.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              activeAssignments={activeCountByPlan[p.id] || 0}
              onPress={() => router.push(`/admin/plans/${p.id}`)}
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

function PlanCard({ plan, activeAssignments, onPress }) {
  const { brandPrimary } = useGymTheme();
  const imageUrl =
    getCloudinaryUrl(plan.cover_image_uri) ||
    (plan.cover_image_uri ? `${plan.cover_image_uri}` : null);
  const lvl = LEVEL_META[plan.level];

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-[18px] border border-ui-input-border overflow-hidden hover:border-brandPrimary-600/30 active:scale-[0.99]"
      style={{
        cursor: "pointer",
        width: "calc(50% - 7px)",
      }}
    >
      <View className="flex-row" style={{ minHeight: 180 }}>
        {/* Cover */}
        <View
          className="bg-ui-background-light overflow-hidden"
          style={{ width: 160 }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-sky-500/5">
              <ClipboardList size={32} color="#0284c7" />
            </View>
          )}
        </View>

        {/* Body */}
        <View className="flex-1 p-4">
          {/* Top: title + chevron */}
          <View className="flex-row items-start justify-between gap-2 mb-1">
            <Text
              className="flex-1 text-[15px] font-jakarta-bold text-ui-text-main tracking-tight"
              numberOfLines={1}
            >
              {plan.name}
            </Text>
            <ChevronRight size={14} color={ui.text.muted} />
          </View>

          {/* Objective */}
          {plan.objective ? (
            <Text
              className="text-[11px] font-manrope text-ui-text-muted leading-4 mb-2"
              numberOfLines={2}
            >
              {plan.objective}
            </Text>
          ) : (
            <View className="mb-2" />
          )}

          {/* Badges */}
          <View className="flex-row items-center gap-1.5 flex-wrap mb-3">
            {lvl && (
              <View
                className={`flex-row items-center gap-1 px-2 py-0.5 rounded-md ${lvl.bubble}`}
              >
                <View
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: lvl.color }}
                />
                <Text
                  className={`text-[10px] font-manrope-bold tracking-wider uppercase ${lvl.text}`}
                >
                  {lvl.label}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-brandPrimary-50">
              <Calendar size={10} color={brandPrimary[600]} />
              <Text className="text-[10px] font-manrope-bold tracking-wider uppercase text-brandPrimary-600">
                {plan.duration_weeks} sem
              </Text>
            </View>
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-brandPrimary-50">
              <Clock size={10} color={brandPrimary[600]} />
              <Text className="text-[10px] font-manrope-bold tracking-wider uppercase text-brandPrimary-600">
                {plan.weekly_days}×/sem
              </Text>
            </View>
            {PLAN_GENDER_BADGES[plan.target_gender] && (
              <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-brandPrimary-500/10 border border-brandPrimary-500/25">
                <Text className="text-[10px] font-manrope-bold tracking-wider uppercase text-brandPrimary-600">
                  {PLAN_GENDER_BADGES[plan.target_gender]}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View className="flex-row items-center justify-between mt-auto pt-2 border-t border-ui-input-border">
            <View className="flex-row items-center gap-1">
              <Users size={11} color={ui.text.muted} />
              <Text className="text-[10px] font-manrope text-ui-text-muted">
                {activeAssignments} asignación
                {activeAssignments === 1 ? "" : "es"} activa
                {activeAssignments === 1 ? "" : "s"}
              </Text>
            </View>
            <Text className="text-[10px] font-manrope text-ui-text-muted">
              {formatDate(plan.created_at)}
            </Text>
          </View>
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
