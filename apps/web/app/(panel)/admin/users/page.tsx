"use client";

// Usuarios del sistema (admin). Clon de apps/mobile admin/users/index.web.jsx:
// lista por memberships del gym activo (hook de core useGymMembers), stats,
// búsqueda + filtros (todos/staff/alumnos), tabla paginada.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import {
  Users,
  Search,
  UserPlus,
  ChevronRight,
  Mail,
  ShieldHalf,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Hook de datos (core), contextos y helpers
import {
  useGymMembers,
  type GymMember,
} from "@gymtrack/core/hooks/users/use-gym-members";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { isStaffRole, isSuperAdminRole, ROLE_LABELS } from "@/lib/auth/roles";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "staff", label: "Staff" },
  { key: "students", label: "Alumnos" },
];

const PAGE_SIZE = 12;

const formatDate = (iso: string | null) => {
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

export default function UsersListPage() {
  const { isSuperAdmin } = useUserRole();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { authUserId } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Multi-gym: lista por memberships del gym activo (rol por gym incluido).
  const { data: users, isLoading } = useGymMembers(gymId, authUserId);

  // El super_admin solo es visible para otro super_admin (la RLS ya lo oculta a roles inferiores).
  const visibleUsers = useMemo(() => {
    if (!users) return [];
    return isSuperAdmin ? users : users.filter((u) => !isSuperAdminRole(u.role));
  }, [users, isSuperAdmin]);

  const stats = useMemo(() => {
    const staff = visibleUsers.filter((u) => isStaffRole(u.role)).length;
    return { total: visibleUsers.length, staff, members: visibleUsers.length - staff };
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
    <div className="p-4 pb-14 md:p-9">
      {/* Header */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-end md:gap-0">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Gestión
            </span>
            <span className="text-[11px] text-ui-text-muted">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-600">
              Usuarios
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Usuarios del sistema
          </h1>
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">
            Socios y staff con acceso a la plataforma
          </p>
        </div>

        <Link
          href="/admin/users/register"
          className="flex items-center justify-center gap-2 self-start rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700 md:self-auto"
        >
          <UserPlus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Registrar socio
          </span>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Users} label="Total" value={stats.total} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={ShieldHalf} label="Staff" value={stats.staff} iconColor="#7c3aed" bubble="bg-violet-50" />
        <StatCard icon={Users} label="Alumnos" value={stats.members} iconColor="#0284c7" bubble="bg-sky-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nombre o email..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>

        <div className="flex justify-between rounded-xl border border-ui-input-border bg-white p-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  setPage(0);
                }}
                className={`flex flex-1 items-center justify-center rounded-[9px] px-3.5 py-1.5 md:flex-initial ${
                  active ? "bg-brandPrimary-600" : "hover:bg-brandPrimary-50/60"
                }`}
              >
                <span className={`text-xs ${active ? "font-manrope font-bold text-white" : "font-manrope font-semibold text-ui-text-muted"}`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-ui-input-border bg-white">
        {/* Head */}
        <div className="flex border-b border-ui-input-border bg-ui-background-light px-5 py-3.5">
          <HeaderCell label="Usuario" flex={3} />
          <HeaderCell label="Email" flex={3} className="hidden md:flex" />
          <HeaderCell label="Rol" flex={1.2} />
          <HeaderCell label="Fecha alta" flex={1.4} className="hidden md:flex" />
          <HeaderCell label="" flex={0.5} align="right" />
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
            <p className="mt-3 font-manrope text-xs text-ui-text-muted">
              Cargando usuarios...
            </p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandPrimary-50">
              <Users size={20} color={brandPrimary[600]} />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
              {search ? "Sin resultados" : "Aún no hay usuarios"}
            </p>
            <p className="font-manrope text-xs text-ui-text-muted">
              {search ? "Probá con otro nombre o email." : "Registrá el primer socio para empezar."}
            </p>
          </div>
        ) : (
          pageRows.map((u, i) => (
            <UserRow key={u.id} user={u} isLast={i === pageRows.length - 1} />
          ))
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="font-manrope text-xs text-ui-text-muted">
            Mostrando{" "}
            <span className="font-bold text-ui-text-main">
              {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}
            </span>{" "}
            de {filtered.length}
          </p>

          <div className="flex gap-2">
            <PageBtn label="Anterior" disabled={currentPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} />
            <PageBtn label="Siguiente" disabled={currentPage >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bubble,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  iconColor: string;
  bubble: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-2xl border border-ui-input-border bg-white p-4">
      <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl ${bubble}`}>
        <Icon size={18} color={iconColor} />
      </div>
      <div>
        <p className="font-jakarta text-[22px] font-bold tracking-tight text-ui-text-main">
          {value}
        </p>
        <p className="font-manrope text-[11px] text-ui-text-muted">{label}</p>
      </div>
    </div>
  );
}

function HeaderCell({
  label,
  flex,
  align,
  className,
}: {
  label: string;
  flex: number;
  align?: "right";
  className?: string;
}) {
  return (
    <div
      style={{ flex }}
      className={`flex flex-col ${align === "right" ? "items-end" : "items-start"} ${className || ""}`}
    >
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
        {label}
      </span>
    </div>
  );
}

function UserRow({ user, isLast }: { user: GymMember; isLast: boolean }) {
  const initials =
    `${user.name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U";
  const staff = isStaffRole(user.role);
  const roleLabel = ROLE_LABELS[user.role ?? ""] ?? user.role ?? "—";

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className={`flex items-center px-5 py-3 hover:bg-brandPrimary-50/40 ${isLast ? "" : "border-b border-ui-input-border"}`}
      style={{ opacity: user.is_active === false ? 0.55 : 1 }}
    >
      {/* Usuario */}
      <div className="flex items-center gap-3" style={{ flex: 3 }}>
        {user.image_profile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image_profile} alt="" className="h-9 w-9 rounded-[10px] object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brandPrimary-50">
            <span className="font-jakarta text-xs font-bold text-brandPrimary-600">
              {initials}
            </span>
          </div>
        )}
        <span className="truncate font-manrope text-[13px] font-bold text-ui-text-main">
          {user.name} {user.last_name}
        </span>
      </div>

      {/* Email */}
      <div className="hidden items-center gap-1.5 md:flex" style={{ flex: 3 }}>
        <Mail size={12} color={ui.text.muted} />
        <span className="truncate font-manrope text-xs text-ui-text-muted">
          {user.email}
        </span>
      </div>

      {/* Rol */}
      <div style={{ flex: 1.2 }}>
        <div className={`flex w-fit items-center gap-1 rounded-md px-2 py-0.5 ${staff ? "bg-violet-50" : "bg-brandPrimary-50"}`}>
          <span className={`h-1 w-1 rounded-full ${staff ? "bg-violet-600" : "bg-brandPrimary-600"}`} />
          <span className={`font-manrope text-[10px] font-bold uppercase tracking-wider ${staff ? "text-violet-600" : "text-brandPrimary-600"}`}>
            {roleLabel}
          </span>
        </div>
        {user.is_active === false && (
          <span className="mt-1 block font-manrope text-[9px] font-bold uppercase tracking-wider text-red-500">
            Baja
          </span>
        )}
      </div>

      {/* Fecha */}
      <div className="hidden md:block" style={{ flex: 1.4 }}>
        <span className="font-manrope text-xs text-ui-text-muted">
          {formatDate(user.created_at)}
        </span>
      </div>

      {/* Action */}
      <div className="flex items-center justify-end" style={{ flex: 0.5 }}>
        <ChevronRight size={14} color={ui.text.muted} />
      </div>
    </Link>
  );
}

function PageBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[9px] border border-ui-input-border px-3.5 py-2 ${
        disabled ? "bg-ui-background-light opacity-50" : "bg-white hover:bg-brandPrimary-50/60"
      }`}
    >
      <span className={`font-manrope text-xs font-semibold ${disabled ? "text-ui-text-muted" : "text-ui-text-main"}`}>
        {label}
      </span>
    </button>
  );
}
