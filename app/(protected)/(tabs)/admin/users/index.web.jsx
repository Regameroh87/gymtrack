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
import { Image } from "expo-image";

import { useGymMembers } from "../../../../../src/hooks/users/use-gym-members";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";
import {
  isStaffRole,
  isSuperAdminRole,
  ROLE_LABELS,
} from "../../../../../src/constants/roles";
import { useUserRole } from "../../../../../src/hooks/shared/use-user-role";

import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  Mail,
  ShieldHalf,
} from "../../../../../assets/icons";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "staff", label: "Staff" },
  { key: "students", label: "Alumnos" },
];

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

export default function UsersListWeb() {
  const router = useRouter();
  const { isSuperAdmin } = useUserRole();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  // Multi-gym: lista por memberships del gym activo (rol por gym incluido).
  const { data: users, isLoading } = useGymMembers();

  // El super_admin solo es visible para otro super_admin (defensa en UI; la RLS
  // de profiles ya lo oculta a roles inferiores a nivel API).
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    return isSuperAdmin
      ? users
      : users.filter((u) => !isSuperAdminRole(u.role));
  }, [users, isSuperAdmin]);

  const stats = useMemo(() => {
    const staff = visibleUsers.filter((u) => isStaffRole(u.role)).length;
    return {
      total: visibleUsers.length,
      staff,
      members: visibleUsers.length - staff,
    };
  }, [visibleUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleUsers.filter((u) => {
      const matches =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      if (!matches) return false;
      if (filter === "staff") return isStaffRole(u.role);
      if (filter === "students") return !isStaffRole(u.role);
      return true;
    });
  }, [visibleUsers, search, filter]);

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
              Gestión
            </Text>
            <Text className="text-ui-text-muted text-[11px]">·</Text>
            <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase">
              Usuarios
            </Text>
          </View>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Usuarios del sistema
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Socios y staff con acceso a la plataforma
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/admin/users/register")}
          className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30 self-start md:self-auto"
          style={{ cursor: "pointer" }}
        >
          <UserPlus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Registrar socio
          </Text>
        </Pressable>
      </View>

      {/* Stat cards */}
      <View className={isMobile ? "flex-col gap-3.5 mb-6" : "flex-row gap-3.5 mb-6"}>
        <StatCard
          icon={Users}
          label="Total"
          value={stats.total}
          iconColor={brandPrimary[600]}
          bubble="bg-brandPrimary-50"
        />
        <StatCard
          icon={ShieldHalf}
          label="Staff"
          value={stats.staff}
          iconColor="#7c3aed"
          bubble="bg-violet-50"
        />
        <StatCard
          icon={Users}
          label="Alumnos"
          value={stats.members}
          iconColor="#0284c7"
          bubble="bg-sky-50"
        />
      </View>

      {/* Toolbar */}
      <View className={isMobile ? "flex-col items-stretch gap-3 mb-4" : "flex-row items-center gap-3 mb-4"}>
        {/* Search */}
        <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-ui-input-border">
          <Search size={15} color={ui.text.muted} />
          <TextInput
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(0);
            }}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={ui.text.muted}
            className="flex-1 text-[13px] font-manrope text-ui-text-main"
            style={{ outlineWidth: 0 }}
          />
        </View>

        {/* Filters */}
        <View className="flex-row bg-white rounded-xl p-1 border border-ui-input-border justify-between">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  setFilter(f.key);
                  setPage(0);
                }}
                className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-[9px] items-center justify-center ${
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

      {/* Table */}
      <View className="bg-white rounded-[18px] border border-ui-input-border overflow-hidden">
        {/* Head */}
        <View className="flex-row px-5 py-3.5 bg-ui-background-light border-b border-ui-input-border">
          <HeaderCell label="Usuario" flex={3} />
          <HeaderCell label="Email" flex={3} className="hidden md:flex" />
          <HeaderCell label="Rol" flex={1.2} />
          <HeaderCell label="Fecha alta" flex={1.4} className="hidden md:flex" />
          <HeaderCell label="" flex={0.5} align="right" />
        </View>

        {/* Body */}
        {isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator size="small" color={brandPrimary[600]} />
            <Text className="mt-3 text-xs font-manrope text-ui-text-muted">
              Cargando usuarios...
            </Text>
          </View>
        ) : pageRows.length === 0 ? (
          <View className="py-16 items-center">
            <View className="w-12 h-12 rounded-[14px] bg-brandPrimary-50 items-center justify-center mb-3">
              <Users size={20} color={brandPrimary[600]} />
            </View>
            <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
              {search ? "Sin resultados" : "Aún no hay usuarios"}
            </Text>
            <Text className="text-xs font-manrope text-ui-text-muted">
              {search
                ? "Probá con otro nombre o email."
                : "Registrá el primer socio para empezar."}
            </Text>
          </View>
        ) : (
          pageRows.map((u, i) => (
            <UserRow
              key={u.id}
              user={u}
              isLast={i === pageRows.length - 1}
              onPress={() => router.push(`/admin/users/${u.id}`)}
            />
          ))
        )}
      </View>

      {/* Pagination */}
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

function HeaderCell({ label, flex, align, className }) {
  return (
    <View
      style={{ flex }}
      className={`${align === "right" ? "items-end" : "items-start"} ${className || ""}`}
    >
      <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
        {label}
      </Text>
    </View>
  );
}

function UserRow({ user, isLast, onPress }) {
  const initials =
    `${user.name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U";
  const staff = isStaffRole(user.role);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role ?? "—";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-5 py-3 hover:bg-brandPrimary-50/40 ${
        isLast ? "" : "border-b border-ui-input-border"
      }`}
      style={{
        cursor: "pointer",
        opacity: user.is_active === false ? 0.55 : 1,
      }}
    >
      {/* Usuario */}
      <View className="flex-row items-center gap-3" style={{ flex: 3 }}>
        {user.image_profile ? (
          <Image
            source={{ uri: user.image_profile }}
            style={{ width: 36, height: 36, borderRadius: 10 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="w-9 h-9 rounded-[10px] bg-brandPrimary-50 items-center justify-center">
            <Text className="text-xs font-jakarta-bold text-brandPrimary-600">
              {initials}
            </Text>
          </View>
        )}
        <Text
          className="text-[13px] font-manrope-bold text-ui-text-main"
          numberOfLines={1}
        >
          {user.name} {user.last_name}
        </Text>
      </View>

      {/* Email */}
      <View className="hidden md:flex flex-row items-center gap-1.5" style={{ flex: 3 }}>
        <Mail size={12} color={ui.text.muted} />
        <Text
          className="text-xs font-manrope text-ui-text-muted"
          numberOfLines={1}
        >
          {user.email}
        </Text>
      </View>

      {/* Rol */}
      <View style={{ flex: 1.2 }}>
        <View
          className={`self-start flex-row items-center gap-1 px-2 py-0.5 rounded-md ${
            staff ? "bg-violet-50" : "bg-brandPrimary-50"
          }`}
        >
          <View
            className={`w-1 h-1 rounded-full ${
              staff ? "bg-violet-600" : "bg-brandPrimary-600"
            }`}
          />
          <Text
            className={`text-[10px] font-manrope-bold tracking-wider uppercase ${
              staff ? "text-violet-600" : "text-brandPrimary-600"
            }`}
          >
            {roleLabel}
          </Text>
        </View>
        {user.is_active === false && (
          <Text className="mt-1 text-[9px] font-manrope-bold tracking-wider uppercase text-red-500">
            Baja
          </Text>
        )}
      </View>

      {/* Fecha */}
      <View className="hidden md:flex" style={{ flex: 1.4 }}>
        <Text className="text-xs font-manrope text-ui-text-muted">
          {formatDate(user.created_at)}
        </Text>
      </View>

      {/* Action */}
      <View className="items-end" style={{ flex: 0.5 }}>
        <ChevronRight size={14} color={ui.text.muted} />
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
