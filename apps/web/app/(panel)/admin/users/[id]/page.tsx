"use client";

// Ficha de un socio del gym (admin). Port a Next de apps/mobile admin/users/[id].jsx.
// Datos de los hooks web-safe de core (useMemberDetail / useMemberSubscriptions);
// acciones (editar, alta/baja, borrar) vía use-admin-member. Supabase directo.

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
  ClipboardList,
  CalendarCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { useMemberDetail } from "@gymtrack/core/hooks/users/use-member-detail";
import { useMemberSubscriptions } from "@gymtrack/core/hooks/activities/use-member-subscriptions";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import {
  useToggleMemberActive,
  useDeleteMember,
} from "@/lib/hooks/use-admin-member";
import { ROLE_LABELS, isStaffRole } from "@/lib/auth/roles";
import { PROFILE_GENDERS } from "@/lib/gender-options";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { DeleteConfirmModal } from "@/components/platform/catalog/catalog-ui";

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

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { isAdmin } = useUserRole();

  const { data, isLoading, isError } = useMemberDetail(id, gymId);
  const { data: subs } = useMemberSubscriptions(id, gymId);
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
  if (isError || !profile) {
    return (
      <div className="p-9">
        <BackLink />
        <p className="mt-4 font-manrope text-sm text-ui-text-muted">
          No se encontró el socio.
        </p>
      </div>
    );
  }

  const initials =
    `${profile.name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() ||
    "U";
  const staff = isStaffRole(profile.role);
  const roleLabel = ROLE_LABELS[profile.role ?? ""] ?? profile.role ?? "—";
  const isActive = profile.is_active !== false;
  const avatar = profile.image_profile
    ? cloudinaryUrl(profile.image_profile, "w_160,h_160,c_fill,f_auto,q_auto")
    : null;

  const activePlan = data?.activePlan as any;
  const history = (data?.history ?? []) as any[];

  const handleToggle = () => toggleActive.mutate(isActive ? false : true);

  const handleDelete = async () => {
    setDeleteError(null);
    if (!gymId || !profile.user_id) return;
    try {
      await deleteMember.mutateAsync({
        gymId,
        targetUserId: profile.user_id,
      });
      router.push("/admin/users");
      router.refresh();
    } catch (err) {
      setDeleteError((err as Error)?.message || "No se pudo eliminar el socio.");
    }
  };

  return (
    <div className="p-4 pb-14 md:p-9">
      <BackLink />

      {/* Header card */}
      <div className="mt-3 flex flex-col items-start gap-4 rounded-[20px] border border-ui-input-border bg-white p-6 md:flex-row md:items-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-20 w-20 rounded-[18px] object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-brandPrimary-50">
            <span className="font-jakarta text-xl font-bold text-brandPrimary-600">
              {initials}
            </span>
          </div>
        )}

        <div className="flex-1">
          <h1 className="font-jakarta text-[24px] font-bold capitalize tracking-tight text-ui-text-main">
            {fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${
                staff ? "bg-violet-50" : "bg-brandPrimary-50"
              }`}
            >
              <span
                className={`h-1 w-1 rounded-full ${
                  staff ? "bg-violet-600" : "bg-brandPrimary-600"
                }`}
              />
              <span
                className={`font-manrope text-[10px] font-bold uppercase tracking-wider ${
                  staff ? "text-violet-600" : "text-brandPrimary-600"
                }`}
              >
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

        {isAdmin && (
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

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Datos de contacto */}
        <div className="rounded-[18px] border border-ui-input-border bg-white p-6 lg:col-span-1">
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

        {/* Plan activo + suscripciones */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-[18px] border border-ui-input-border bg-white p-6">
            <SectionTitle>Plan activo</SectionTitle>
            {activePlan?.plan ? (
              <div className="flex items-center gap-3 rounded-xl border border-ui-input-light bg-ui-background-light p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-sky-50">
                  <ClipboardList size={18} color="#0284c7" />
                </div>
                <div className="flex-1">
                  <p className="font-manrope text-[14px] font-bold capitalize text-ui-text-main">
                    {activePlan.plan.name}
                    {activePlan.is_custom && (
                      <span className="ml-2 rounded bg-brandPrimary-50 px-1.5 py-0.5 align-middle font-manrope text-[9px] font-bold uppercase tracking-wider text-brandPrimary-600">
                        Custom
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-manrope text-[11px] capitalize text-ui-text-muted">
                    {activePlan.plan.duration_weeks
                      ? `${activePlan.plan.duration_weeks} sem`
                      : "Flexible"}{" "}
                    · {activePlan.plan.weekly_days} días/sem
                    {activePlan.plan.objective
                      ? ` · ${activePlan.plan.objective}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-manrope text-[12px] text-ui-text-muted">
                Sin plan asignado.
              </p>
            )}
          </div>

          <div className="rounded-[18px] border border-ui-input-border bg-white p-6">
            <SectionTitle>Actividades</SectionTitle>
            {subs?.active?.length ? (
              <div className="flex flex-col gap-2">
                {subs.active.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-ui-input-light bg-ui-background-light px-3 py-2"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.activities?.color || "#9ca3af" }}
                    />
                    <span className="flex-1 font-manrope text-[13px] font-bold text-ui-text-main">
                      {s.activities?.name ?? "Actividad"}
                    </span>
                    {s.activity_plans?.label && (
                      <span className="font-manrope text-[11px] text-ui-text-muted">
                        {s.activity_plans.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-manrope text-[12px] text-ui-text-muted">
                Sin actividades activas.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="mt-4 rounded-[18px] border border-ui-input-border bg-white p-6">
        <SectionTitle>Últimos entrenamientos</SectionTitle>
        {history.length === 0 ? (
          <p className="font-manrope text-[12px] text-ui-text-muted">
            Todavía no registró entrenamientos.
          </p>
        ) : (
          <div className="flex flex-col">
            {history.slice(0, 15).map((l, i) => (
              <div
                key={l.id ?? i}
                className={`flex items-center gap-3 py-2.5 ${
                  i === 0 ? "" : "border-t border-ui-input-light"
                }`}
              >
                <CalendarCheck size={14} className="text-brandPrimary-600" />
                <span className="flex-1 font-manrope text-[13px] capitalize text-ui-text-main">
                  {l.session_name ?? "Sesión libre"}
                </span>
                <span className="font-manrope text-[11px] text-ui-text-muted">
                  {formatDate(l.completed_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar socio"
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
      href="/admin/users"
      className="flex w-fit items-center gap-1 transition hover:opacity-70"
    >
      <ArrowLeft size={11} className="text-ui-text-muted" />
      <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
        Usuarios
      </span>
    </Link>
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
