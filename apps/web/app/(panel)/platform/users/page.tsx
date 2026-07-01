// Usuarios globales de la plataforma (staff de plataforma: super_admin +
// superadmin_admin/coach). Gating por rol en el server. La escritura (alta de
// staff nuevo) queda restringida a admin-tier vía canAccessPlatformModule +
// isPlatformAdminRole; superadmin_coach ve el listado en solo lectura.
import Link from "next/link";
import { redirect } from "next/navigation";

import { ShieldHalf, UserPlus, Plus } from "lucide-react";

import { getSessionContext } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  ROLE_LABELS,
  canAccessPlatformModule,
  isPlatformAdminRole,
  resolvePlatformRole,
} from "@/lib/auth/roles";
import { PlatformShell } from "@/components/platform/platform-shell";

type PlatformStaffRow = {
  id: string;
  user_id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
  is_super_admin: boolean;
  platform_staff_role: string | null;
  created_at: string | null;
};

export default async function PlatformUsersPage() {
  const ctx = await getSessionContext();
  if (!canAccessPlatformModule(ctx.platformRole, "users")) redirect("/dashboard");

  const canCreate = isPlatformAdminRole(ctx.platformRole);

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, user_id, name, last_name, email, is_super_admin, platform_staff_role, created_at"
    )
    .or("is_super_admin.eq.true,platform_staff_role.not.is.null")
    .order("created_at", { ascending: false });

  const staff = (data as PlatformStaffRow[]) ?? [];

  return (
    <PlatformShell>
      <div className="p-4 pb-10 md:p-9 md:pb-14">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
                Plataforma
              </span>
              <span className="text-[11px] text-gray-400">·</span>
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandSecondary-500">
                Usuarios globales
              </span>
            </div>
            <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
              Usuarios globales
            </h1>
            <p className="mt-1 font-manrope text-xs text-gray-400">
              Super admins y staff con alcance de plataforma
            </p>
          </div>

          {canCreate && (
            <Link
              href="/platform/users/register"
              className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-700 px-4 py-2.5 shadow-md shadow-brandPrimary-700/30 transition hover:bg-brandPrimary-600"
            >
              <Plus size={15} color="#fff" />
              <span className="font-manrope text-[13px] font-bold text-white">
                Crear staff de plataforma
              </span>
            </Link>
          )}
        </div>

        {staff.length === 0 ? (
          <div className="flex flex-col items-center rounded-[18px] border border-gray-200 bg-white py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandSecondary-500/10">
              <ShieldHalf size={20} className="text-brandSecondary-500" />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-gray-900">
              Aún no hay staff de plataforma
            </p>
            <p className="font-manrope text-xs text-gray-400">
              {canCreate ? "Creá el primero para empezar." : "Todavía no se dio de alta a nadie."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {staff.map((row) => {
              const role = resolvePlatformRole(row);
              const fullName = [row.name, row.last_name].filter(Boolean).join(" ");
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3.5 rounded-[15px] border border-gray-200 bg-white p-4"
                >
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-brandSecondary-500/10">
                    <UserPlus size={18} className="text-brandSecondary-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="truncate font-jakarta text-sm font-bold text-gray-900">
                      {fullName || row.email || "Sin nombre"}
                    </span>
                    <p className="mt-px font-manrope text-[11px] text-gray-400">
                      {row.email}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-md border border-brandPrimary-200 bg-brandPrimary-50 px-2 py-1 font-manrope text-[10px] font-bold uppercase tracking-wide text-brandPrimary-700">
                    {role ? ROLE_LABELS[role] : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
