"use client";

// Ficha de un miembro del equipo (owner/admin/coach). Hermana de
// admin/users/[id]/page.tsx pero sin las secciones de socio (plan, actividades,
// entrenamientos): acá viven datos de contacto y la card de Permisos, y es el
// lugar natural para sumar a futuro features propias de staff (comisiones,
// actividades que dicta, liquidaciones) sin volver a mezclarlas con la ficha
// de un socio común.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  IdCard,
  MapPin,
  Pencil,
  Trash2,
  Power,
  CalendarCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { useMemberDetail } from "@gymtrack/core/hooks/users/use-member-detail";
import { useMembershipPermissions } from "@gymtrack/core/hooks/users/use-membership-permissions";
import { PERMISSIONS, hasGymPermission } from "@gymtrack/core/permissions";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import {
  useToggleMemberActive,
  useDeleteMember,
} from "@/lib/hooks/use-admin-member";
import { useMembershipPermissionMutations } from "@/lib/hooks/use-membership-permission-mutations";
import { ROLE_LABELS, ROLES, isStaffRole } from "@/lib/auth/roles";
import { PROFILE_GENDERS } from "@/lib/gender-options";
import { mediaUrl } from "@/lib/media";
import { DeleteConfirmModal, Toggle, ErrorBanner } from "@/components/platform/catalog/catalog-ui";
import { MediaImage } from "@/components/ui/media-image";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

const genderLabel = (v: string | null) =>
  PROFILE_GENDERS.find((g) => g.value === v)?.label ?? null;

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { userId: myProfileId } = useAuth();
  const { isAdmin, isOwner } = useUserRole();

  const { data, isLoading, isError } = useMemberDetail(id, gymId);
  const toggleActive = useToggleMemberActive(id);
  const deleteMember = useDeleteMember();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const profile = data?.profile as any;
  const fullName = useMemo(
    () => [profile?.name, profile?.last_name].filter(Boolean).join(" ") || "—",
    [profile]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }
  if (isError || !profile || !isStaffRole(profile.role)) {
    return (
      <div className="p-9">
        <BackLink />
        <p className="mt-4 font-manrope text-sm text-ui-text-muted">
          {profile && !isStaffRole(profile.role) ? (
            <>
              Esta persona no es staff.{" "}
              <Link href={`/admin/users/${id}`} className="font-bold text-brandPrimary-600">
                Ver su ficha de socio
              </Link>
              .
            </>
          ) : (
            "No se encontró al miembro del equipo."
          )}
        </p>
      </div>
    );
  }

  const initials =
    `${profile.name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() ||
    "U";
  const roleLabel = ROLE_LABELS[profile.role ?? ""] ?? profile.role ?? "—";
  const isActive = profile.is_active !== false;
  const avatar = profile.image_profile
    ? mediaUrl(profile.image_profile)
    : null;
  const isOwnerProfile = profile.role === ROLES.OWNER;
  const isSelf = profile.id === myProfileId;
  const canManage = isAdmin && !isOwnerProfile && !isSelf;

  const handleToggle = () => toggleActive.mutate(isActive ? false : true);

  const handleDelete = async () => {
    setDeleteError(null);
    if (!gymId || !profile.user_id) return;
    try {
      await deleteMember.mutateAsync({
        gymId,
        targetUserId: profile.user_id,
      });
      router.push("/admin/team");
      router.refresh();
    } catch (err) {
      setDeleteError((err as Error)?.message || "No se pudo eliminar a la persona.");
    }
  };

  return (
    <div className="p-4 pb-14 md:p-9">
      <BackLink />

      {/* Header card */}
      <div className="mt-3 flex flex-col items-start gap-4 rounded-[20px] border border-ui-input-border bg-white p-6 md:flex-row md:items-center">
        <MediaImage
          src={avatar}
          wrapperClassName="h-20 w-20 shrink-0 rounded-[18px]"
          fallback={
            <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-violet-50">
              <span className="font-jakarta text-xl font-bold text-violet-600">
                {initials}
              </span>
            </div>
          }
        />

        <div className="flex-1">
          <h1 className="font-jakarta text-[24px] font-bold capitalize tracking-tight text-ui-text-main">
            {fullName}
            {isSelf && (
              <span className="ml-2 align-middle font-manrope text-xs font-normal text-ui-text-muted">
                (vos)
              </span>
            )}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5">
              <span className="h-1 w-1 rounded-full bg-violet-600" />
              <span className="font-manrope text-[10px] font-bold uppercase tracking-wider text-violet-600">
                {roleLabel}
              </span>
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {isActive ? "Activo" : "Baja"}
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            <Link
              href={`/admin/users/edit/${id}`}
              className="flex items-center justify-center gap-2 rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 font-manrope text-[13px] font-bold text-white transition hover:bg-brandPrimary-700"
            >
              <Pencil size={14} color="#fff" />
              Editar
            </Link>
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggleActive.isPending}
              className="flex items-center justify-center gap-2 rounded-[11px] border border-ui-input-border bg-white px-4 py-2.5 font-manrope text-[13px] font-bold text-ui-text-main transition hover:bg-ui-background-light disabled:opacity-50"
            >
              <Power size={14} />
              {isActive ? "Dar de baja" : "Reactivar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 rounded-[11px] bg-red-50 px-4 py-2.5 font-manrope text-[13px] font-bold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 size={14} color="#dc2626" />
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Datos de contacto */}
      <div className="mt-4 rounded-[18px] border border-ui-input-border bg-white p-6">
        <SectionTitle>Datos</SectionTitle>
        <div className="flex flex-col gap-3">
          <InfoRow icon={Mail} value={profile.email} />
          <InfoRow icon={Phone} value={profile.phone} />
          <InfoRow icon={IdCard} value={profile.document_number} />
          <InfoRow icon={MapPin} value={profile.address} capitalize />
          <InfoRow
            icon={CalendarCheck}
            value={`Alta · ${formatDate(profile.created_at)}`}
          />
          {genderLabel(profile.gender) && (
            <div className="font-manrope text-[12px] text-ui-text-muted">
              Género:{" "}
              <span className="font-bold text-ui-text-main">
                {genderLabel(profile.gender)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Permisos: solo el owner decide, por persona, quién puede registrar/anular
          cobros más allá de lo que ya le da su rol. No aplica a otro owner. */}
      {isOwner && !isOwnerProfile && (
        <PermissionsCard membershipId={profile.membership_id} role={profile.role} />
      )}

      {/* Futuro: cambio de rol, actividades que dicta, liquidaciones */}

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar del equipo"
        message={`Vas a eliminar a ${fullName} del gym. Si no pertenece a otro gimnasio se borra su cuenta. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={deleteMember.isPending}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/team"
      className="flex w-fit items-center gap-1 transition hover:opacity-70"
    >
      <ArrowLeft size={11} className="text-ui-text-muted" />
      <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
        Equipo
      </span>
    </Link>
  );
}

// Permisos puntuales sobre pagos. Cada fila es "incluido por su rol" (no
// editable: ya lo tiene por default) o un Toggle que otorga/revoca el grant
// explícito en membership_permissions.
const PERMISSION_ITEMS = [
  {
    key: PERMISSIONS.PAYMENTS_REGISTER,
    label: "Registrar cobros",
    hint: "Puede registrar el pago de un socio.",
  },
  {
    key: PERMISSIONS.PAYMENTS_VOID,
    label: "Anular cobros",
    hint: "Puede anular un cobro ya registrado (con motivo).",
  },
];

function PermissionsCard({
  membershipId,
  role,
}: {
  membershipId: string | null;
  role: string | null;
}) {
  const { data: grants } = useMembershipPermissions(membershipId);
  const { grant, revoke } = useMembershipPermissionMutations(membershipId);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (permission: string, next: boolean) => {
    setError(null);
    try {
      if (next) await grant.mutateAsync(permission);
      else await revoke.mutateAsync(permission);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar el permiso.");
    }
  };

  return (
    <div className="mt-4 rounded-[18px] border border-ui-input-border bg-white p-6">
      <SectionTitle>Permisos</SectionTitle>
      <ErrorBanner message={error} />
      <div className="flex flex-col gap-2.5">
        {PERMISSION_ITEMS.map((item) => {
          // Si el rol ya lo incluye por default, no es un grant editable.
          const isDefault = hasGymPermission(role, [], item.key);
          if (isDefault) {
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-3"
              >
                <span className="flex-1">
                  <span className="block font-manrope text-[13px] font-bold text-ui-text-main">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block font-manrope text-[11px] text-ui-text-muted">
                    Incluido por su rol.
                  </span>
                </span>
              </div>
            );
          }
          return (
            <Toggle
              key={item.key}
              label={item.label}
              hint={item.hint}
              value={hasGymPermission(role, grants ?? [], item.key)}
              onChange={(next) => toggle(item.key, next)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
      {children}
    </p>
  );
}

function InfoRow({
  icon: Icon,
  value,
  capitalize,
}: {
  icon: LucideIcon;
  value: string | null | undefined;
  capitalize?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-ui-text-muted" />
      <span
        className={`font-manrope text-[13px] text-ui-text-main ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
