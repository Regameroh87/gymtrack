"use client";

// Equipo del gym (admin): owner/admin/coach, separado de la lista de socios.
// Vive acá (y no en /admin/users) para que features propias de staff (permisos,
// a futuro comisiones/actividades que dicta) no se mezclen con la ficha de un
// socio común. Clon de admin/users/page.tsx en estructura, con useGymStaff
// (core) como fuente de datos.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { Users, Search, UserPlus, ChevronRight, Mail, ShieldHalf, Loader2 } from "lucide-react";

// Hook de datos (core), contextos y helpers
import { useGymStaff, type StaffMember } from "@gymtrack/core/hooks/users/use-gym-staff";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { isSuperAdminRole, ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

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

export default function TeamListPage() {
  const { isSuperAdmin } = useUserRole();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { authUserId } = useAuth();
  const [search, setSearch] = useState("");

  const { data: staff, isLoading } = useGymStaff(gymId);

  const visibleStaff = useMemo(() => {
    if (!staff) return [];
    return isSuperAdmin ? staff : staff.filter((s) => !isSuperAdminRole(s.role));
  }, [staff, isSuperAdmin]);

  const stats = useMemo(() => {
    const admins = visibleStaff.filter(
      (s) => s.role === ROLES.OWNER || s.role === ROLES.ADMIN
    ).length;
    const coaches = visibleStaff.filter((s) => s.role === ROLES.COACH).length;
    return { total: visibleStaff.length, admins, coaches };
  }, [visibleStaff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleStaff;
    return visibleStaff.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.last_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    );
  }, [visibleStaff, search]);

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Equipo"
        title="Equipo del gimnasio"
        description="Dueños, administradores y coaches con acceso al panel"
        cta={
          <Link href="/admin/users/register">
            <Button icon={<UserPlus size={15} color="#fff" />}>
              Agregar staff
            </Button>
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Users} label="Total" value={stats.total} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" dot="bg-brandPrimary-600" />
        <StatCard icon={ShieldHalf} label="Administradores" value={stats.admins} iconColor="#7c3aed" bubble="bg-violet-50" dot="bg-violet-600" />
        <StatCard icon={Users} label="Coaches" value={stats.coaches} iconColor="#0284c7" bubble="bg-sky-50" dot="bg-sky-600" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
        <Search size={15} color={ui.text.muted} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-ui-input-border bg-white shadow-card-brand">
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
              Cargando equipo...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-brandPrimary-50">
              <Users size={20} color={brandPrimary[600]} />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
              {search ? "Sin resultados" : "Aún no hay staff"}
            </p>
            <p className="font-manrope text-xs text-ui-text-muted">
              {search ? "Probá con otro nombre o email." : "Agregá administradores o coaches para empezar."}
            </p>
          </div>
        ) : (
          filtered.map((s, i) => (
            <StaffRow
              key={s.id}
              staff={s}
              isLast={i === filtered.length - 1}
              isSelf={s.user_id === authUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ──

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

function StaffRow({
  staff,
  isLast,
  isSelf,
}: {
  staff: StaffMember;
  isLast: boolean;
  isSelf: boolean;
}) {
  const initials =
    `${staff.name?.[0] || ""}${staff.last_name?.[0] || ""}`.toUpperCase() || "U";
  const roleLabel = ROLE_LABELS[staff.role ?? ""] ?? staff.role ?? "—";

  return (
    <Link
      href={`/admin/team/${staff.id}`}
      className={`flex items-center px-5 py-3 transition hover:bg-brandPrimary-50/40 ${isLast ? "" : "border-b border-ui-input-border"}`}
      style={{ opacity: staff.is_active === false ? 0.55 : 1 }}
    >
      {/* Usuario */}
      <div className="flex items-center gap-3" style={{ flex: 3 }}>
        {staff.image_profile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={staff.image_profile} alt="" className="h-9 w-9 rounded-[10px] object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brandPrimary-50">
            <span className="font-jakarta text-xs font-bold text-brandPrimary-600">
              {initials}
            </span>
          </div>
        )}
        <span className="truncate font-manrope text-[13px] font-bold text-ui-text-main">
          {staff.name} {staff.last_name}
          {isSelf && (
            <span className="ml-1.5 font-manrope text-[11px] font-normal text-ui-text-muted">
              (vos)
            </span>
          )}
        </span>
      </div>

      {/* Email */}
      <div className="hidden items-center gap-1.5 md:flex" style={{ flex: 3 }}>
        <Mail size={12} color={ui.text.muted} />
        <span className="truncate font-manrope text-xs text-ui-text-muted">
          {staff.email}
        </span>
      </div>

      {/* Rol */}
      <div style={{ flex: 1.2 }}>
        <Badge color="violet" label={roleLabel} />
        {staff.is_active === false && (
          <span className="mt-1 block font-manrope text-[9px] font-bold uppercase tracking-wider text-red-500">
            Baja
          </span>
        )}
      </div>

      {/* Fecha */}
      <div className="hidden md:block" style={{ flex: 1.4 }}>
        <span className="font-manrope text-xs text-ui-text-muted">
          {formatDate(staff.created_at)}
        </span>
      </div>

      {/* Action */}
      <div className="flex items-center justify-end" style={{ flex: 0.5 }}>
        <ChevronRight size={14} color={ui.text.muted} />
      </div>
    </Link>
  );
}
