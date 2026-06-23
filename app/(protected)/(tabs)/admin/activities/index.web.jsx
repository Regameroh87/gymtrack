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

import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import { useActivities } from "../../../../../src/hooks/activities/use-activities";

import { Flame, Search, ChevronRight, Plus, Receipt, CheckCircle } from "../../../../../assets/icons";

const PAGE_SIZE = 18;

const formatPrice = (price) =>
  price == null ? "Sin precio" : `$${Number(price).toLocaleString("es-AR")}`;

export default function ActivitiesListWeb() {
  const router = useRouter();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: activities, isLoading } = useActivities();

  const stats = useMemo(() => {
    if (!activities) return { total: 0, active: 0, revenue: 0 };
    const active = activities.filter((a) => a.is_active);
    const revenue = active.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    return { total: activities.length, active: active.length, revenue };
  }, [activities]);

  const filtered = useMemo(() => {
    if (!activities) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name?.toLowerCase().includes(q));
  }, [activities, search]);

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
              Oferta
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-teal-500 tracking-[1.4px] uppercase">
              Actividades
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Actividades del gimnasio
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Disciplinas y cuotas mensuales que ofrecés a tus socios
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/activities/add")}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Agregar actividad
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={Flame}
          label="Total"
          value={stats.total}
          iconColor="#14b8a6"
          bubble="bg-teal-500/10"
        />
        <StatCard
          icon={CheckCircle}
          label="Activas"
          value={stats.active}
          iconColor="#10b981"
          bubble="bg-emerald-50"
        />
        <StatCard
          icon={Receipt}
          label="Recaudación potencial"
          value={`$${stats.revenue.toLocaleString("es-AR")}`}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
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
            Cargando actividades...
          </Text>
        </View>
      ) : pageRows.length === 0 ? (
        <View className="py-24 items-center bg-white rounded-[18px] border border-ui-input-border">
          <View className="w-12 h-12 rounded-[14px] bg-teal-500/10 items-center justify-center mb-3">
            <Flame size={20} color="#14b8a6" />
          </View>
          <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
            {search ? "Sin resultados" : "Aún no hay actividades"}
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted">
            {search
              ? "Probá con otro nombre."
              : "Agregá la primera disciplina de tu gimnasio."}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {pageRows.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              brandPrimary={brandPrimary}
              onPress={() => router.push(`/admin/activities/edit/${activity.id}`)}
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
      <View className="flex-1">
        <Text
          className="text-[22px] font-jakarta-bold text-ui-text-main tracking-tight"
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text className="text-[11px] font-manrope text-ui-text-muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

function ActivityCard({ activity, brandPrimary, onPress }) {
  const color = activity.color ?? brandPrimary[600];
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-[16px] border border-ui-input-border overflow-hidden hover:border-brandPrimary-600/30 active:scale-[0.99]"
      style={{ cursor: "pointer", width: "calc(33.333% - 9.34px)" }}
    >
      <View className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2 mb-3">
          <View className="flex-row items-center gap-2.5 flex-1">
            <View
              className="w-9 h-9 rounded-[10px] items-center justify-center"
              style={{ backgroundColor: `${color}1A` }}
            >
              <Flame size={17} color={color} />
            </View>
            <Text
              className="flex-1 text-[14px] font-jakarta-bold text-ui-text-main tracking-tight"
              numberOfLines={1}
            >
              {activity.name}
            </Text>
          </View>
          <ChevronRight size={14} color={ui.text.muted} />
        </View>

        {activity.description ? (
          <Text
            className="text-[11px] font-manrope text-ui-text-muted leading-4 mb-3"
            numberOfLines={2}
          >
            {activity.description}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-jakarta-bold text-ui-text-main">
            {formatPrice(activity.price)}
            {activity.price != null && (
              <Text className="text-[11px] font-manrope text-ui-text-muted">
                {" "}
                /mes
              </Text>
            )}
          </Text>

          <View
            className={`px-2 py-0.5 rounded-md ${
              activity.is_active ? "bg-emerald-50" : "bg-ui-background-light"
            }`}
          >
            <Text
              className={`text-[9px] font-manrope-bold tracking-wider uppercase ${
                activity.is_active ? "text-emerald-600" : "text-ui-text-muted"
              }`}
            >
              {activity.is_active ? "Activa" : "Inactiva"}
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
