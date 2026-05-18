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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";

import { supabase } from "../../../../src/database/supabase";
import { useAuth } from "../../../../src/auth/lib/getSession";
import { brandPrimary, ui } from "../../../../src/theme/colors";

import {
  QrCode,
  Search,
  Clock,
  Calendar,
  Mail,
  UserPlus,
  Users,
} from "../../../../assets/icons";

const PAGE_SIZE = 14;
const RANGE_FILTERS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7 días" },
  { key: "month", label: "30 días" },
  { key: "all", label: "Todo" },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function rangeStart(key) {
  if (key === "today") return startOfDay(new Date()).toISOString();
  if (key === "week") return daysAgo(7).toISOString();
  if (key === "month") return daysAgo(30).toISOString();
  return null;
}

const formatTime = (iso) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AttendanceListWeb() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const gymId = user?.gym_id || process.env.EXPO_PUBLIC_GYM_ID;
  const staffProfileId = user?.id;

  const [search, setSearch] = useState("");
  const [range, setRange] = useState("today");
  const [page, setPage] = useState(0);
  const [showManual, setShowManual] = useState(false);

  // ── Query: asistencias del rango ───────────────────────────────────
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin_attendance", gymId, range],
    enabled: !!gymId,
    queryFn: async () => {
      let q = supabase
        .from("attendances")
        .select(
          "id, checked_in_at, method, profile:profiles!profile_id(id,name,last_name,email,image_profile), staff:profiles!checked_in_by(id,name,last_name)"
        )
        .eq("gym_id", gymId)
        .order("checked_in_at", { ascending: false });
      const since = rangeStart(range);
      if (since) q = q.gte("checked_in_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows) return { today: 0, week: 0, month: 0 };
    const today = startOfDay(new Date()).getTime();
    const w = daysAgo(7).getTime();
    const m = daysAgo(30).getTime();
    let t = 0,
      ww = 0,
      mm = 0;
    for (const r of rows) {
      const ts = new Date(r.checked_in_at).getTime();
      if (ts >= today) t++;
      if (ts >= w) ww++;
      if (ts >= m) mm++;
    }
    return { today: t, week: ww, month: mm };
  }, [rows]);

  // ── Filtro búsqueda ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const p = r.profile;
      if (!p) return false;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

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
              Gestión
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase">
              Asistencias
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Asistencias del gimnasio
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Registro de entradas vía QR y check-in manual
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowManual(true)}
            className="flex-row items-center gap-2 px-3.5 py-2.5 rounded-[11px] bg-white border border-ui-input-border hover:bg-brandPrimary-50/60"
            style={{ cursor: "pointer" }}
          >
            <UserPlus size={14} color={ui.text.main} />
            <Text className="text-[13px] font-manrope-bold text-ui-text-main">
              Check-in manual
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/admin/attendance/kiosk")}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
            style={{ cursor: "pointer" }}
          >
            <QrCode size={15} color="#fff" />
            <Text className="text-[13px] font-manrope-bold text-white">
              Abrir kiosko
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Stat cards */}
      <View className="flex-row gap-3.5 mb-6">
        <StatCard
          icon={Clock}
          label="Hoy"
          value={stats.today}
          iconColor="#10b981"
          bubble="bg-emerald-50"
        />
        <StatCard
          icon={Calendar}
          label="Últimos 7 días"
          value={stats.week}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={Calendar}
          label="Últimos 30 días"
          value={stats.month}
          iconColor="#7c3aed"
          bubble="bg-violet-50"
        />
      </View>

      {/* Toolbar */}
      <View className="flex-row items-center gap-3 mb-4">
        <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
          <Search size={15} color={ui.text.muted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(0);
            }}
            placeholder="Buscar socio por nombre o email..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>

        <View className="flex-row bg-white rounded-xl p-1 border border-ui-input-border">
          {RANGE_FILTERS.map((f) => {
            const active = range === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  setRange(f.key);
                  setPage(0);
                }}
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
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tabla */}
      <View className="bg-white rounded-[18px] border border-ui-input-border overflow-hidden">
        <View className="flex-row px-5 py-3.5 bg-ui-background-light border-b border-ui-input-border">
          <HeaderCell label="Socio" flex={3} />
          <HeaderCell label="Email" flex={3} />
          <HeaderCell label="Método" flex={1.2} />
          <HeaderCell label="Hora" flex={1.6} />
          <HeaderCell label="Registró" flex={1.6} />
        </View>

        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="small" color={brandPrimary[600]} />
            <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
              Cargando asistencias...
            </Text>
          </View>
        ) : pageRows.length === 0 ? (
          <View className="py-16 items-center">
            <View className="w-12 h-12 rounded-[14px] bg-emerald-50 items-center justify-center mb-3">
              <QrCode size={20} color="#10b981" />
            </View>
            <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
              {search ? "Sin resultados" : "Aún no hay asistencias"}
            </Text>
            <Text className="text-xs font-manrope text-ui-text-muted">
              {search
                ? "Probá con otro nombre o email."
                : "Abrí el kiosko o registrá un check-in manual."}
            </Text>
          </View>
        ) : (
          pageRows.map((r, i) => (
            <AttendanceRow
              key={r.id}
              row={r}
              isLast={i === pageRows.length - 1}
            />
          ))
        )}
      </View>

      {/* Paginación */}
      {filtered.length > PAGE_SIZE && (
        <View className="flex-row items-center justify-between mt-4">
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

      {showManual && (
        <ManualCheckInModal
          gymId={gymId}
          staffProfileId={staffProfileId}
          onClose={() => setShowManual(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin_attendance"] });
            setShowManual(false);
          }}
        />
      )}
    </ScrollView>
  );
}

// ── Modal: check-in manual ────────────────────────────────────────────

function ManualCheckInModal({ gymId, staffProfileId, onClose, onDone }) {
  const [q, setQ] = useState("");

  const { data: members } = useQuery({
    queryKey: ["gym_members", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, last_name, email, image_profile")
        .eq("gym_id", gymId)
        .eq("role", "member")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const insert = useMutation({
    mutationFn: async (profileId) => {
      const { error } = await supabase.from("attendances").insert({
        gym_id: gymId,
        profile_id: profileId,
        method: "manual",
        checked_in_by: staffProfileId,
      });
      if (error) throw error;
    },
    onSuccess: onDone,
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    const s = q.trim().toLowerCase();
    if (!s) return members.slice(0, 20);
    return members
      .filter(
        (m) =>
          m.name?.toLowerCase().includes(s) ||
          m.last_name?.toLowerCase().includes(s) ||
          m.email?.toLowerCase().includes(s)
      )
      .slice(0, 20);
  }, [members, q]);

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: "rgba(15,13,32,0.45)" }}
    >
      <View className="w-[440px] bg-white rounded-2xl border border-ui-input-border overflow-hidden">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-ui-input-border">
          <Text className="text-base font-jakarta-bold text-ui-text-main">
            Check-in manual
          </Text>
          <Pressable
            onPress={onClose}
            className="px-2.5 py-1 rounded-md hover:bg-ui-background-light"
            style={{ cursor: "pointer" }}
          >
            <Text className="text-xs font-manrope-semi text-ui-text-muted">
              Cerrar
            </Text>
          </Pressable>
        </View>

        <View className="px-5 pt-4">
          <View className="flex-row items-center gap-2.5 bg-ui-background-light rounded-xl px-3.5 py-2.5 border border-ui-input-border">
            <Search size={14} color={ui.text.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar socio..."
              placeholderTextColor={ui.text.muted}
              className="flex-1 text-[13px] font-manrope text-ui-text-main"
              style={{ outlineWidth: 0 }}
              autoFocus
            />
          </View>
        </View>

        <ScrollView className="max-h-[360px] px-2.5 py-2.5">
          {filtered.length === 0 ? (
            <Text className="text-center py-6 text-xs font-manrope text-ui-text-muted">
              Sin coincidencias
            </Text>
          ) : (
            filtered.map((m) => (
              <Pressable
                key={m.id}
                disabled={insert.isPending}
                onPress={() => insert.mutate(m.id)}
                className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-brandPrimary-50/50"
                style={{ cursor: "pointer" }}
              >
                {m.image_profile ? (
                  <Image
                    source={{ uri: m.image_profile }}
                    style={{ width: 30, height: 30, borderRadius: 8 }}
                  />
                ) : (
                  <View className="w-[30px] h-[30px] rounded-lg bg-brandPrimary-50 items-center justify-center">
                    <Users size={14} color={brandPrimary[600]} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                    {m.name} {m.last_name}
                  </Text>
                  <Text
                    className="text-[11px] font-manrope text-ui-text-muted"
                    numberOfLines={1}
                  >
                    {m.email}
                  </Text>
                </View>
                <Text className="text-[11px] font-manrope-semi text-brandPrimary-600">
                  Registrar
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────

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

function HeaderCell({ label, flex }) {
  return (
    <View style={{ flex }} className="items-start">
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        {label}
      </Text>
    </View>
  );
}

function AttendanceRow({ row, isLast }) {
  const p = row.profile;
  const initials =
    `${p?.name?.[0] || ""}${p?.last_name?.[0] || ""}`.toUpperCase() || "U";
  const isQr = row.method === "qr";

  return (
    <View
      className={`flex-row items-center px-5 py-3 ${
        isLast ? "" : "border-b border-ui-input-border"
      }`}
    >
      <View className="flex-row items-center gap-3" style={{ flex: 3 }}>
        {p?.image_profile ? (
          <Image
            source={{ uri: p.image_profile }}
            style={{ width: 32, height: 32, borderRadius: 9 }}
          />
        ) : (
          <View className="w-8 h-8 rounded-[9px] bg-brandPrimary-50 items-center justify-center">
            <Text className="text-[11px] font-jakarta-bold text-brandPrimary-600">
              {initials}
            </Text>
          </View>
        )}
        <Text
          className="text-[13px] font-manrope-bold text-ui-text-main"
          numberOfLines={1}
        >
          {p?.name} {p?.last_name}
        </Text>
      </View>

      <View className="flex-row items-center gap-1.5" style={{ flex: 3 }}>
        <Mail size={12} color={ui.text.muted} />
        <Text
          className="text-xs font-manrope text-ui-text-muted"
          numberOfLines={1}
        >
          {p?.email}
        </Text>
      </View>

      <View style={{ flex: 1.2 }}>
        <View
          className={`self-start flex-row items-center gap-1 px-2 py-0.5 rounded-md ${
            isQr ? "bg-emerald-50" : "bg-amber-50"
          }`}
        >
          <View
            className={`w-1 h-1 rounded-full ${
              isQr ? "bg-emerald-600" : "bg-amber-600"
            }`}
          />
          <Text
            className={`text-[10px] font-manrope-bold tracking-wider uppercase ${
              isQr ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {isQr ? "QR" : "Manual"}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1.6 }}>
        <Text className="text-xs font-manrope text-ui-text-muted">
          {formatTime(row.checked_in_at)}
        </Text>
      </View>

      <View style={{ flex: 1.6 }}>
        <Text
          className="text-xs font-manrope text-ui-text-muted"
          numberOfLines={1}
        >
          {row.staff
            ? `${row.staff.name ?? ""} ${row.staff.last_name ?? ""}`.trim()
            : "—"}
        </Text>
      </View>
    </View>
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
