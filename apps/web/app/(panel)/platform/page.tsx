// Dashboard del panel de PLATAFORMA (super_admin). Réplica de
// apps/mobile platform/index.web.jsx: banner de bienvenida, stats agregadas de
// gyms y lista de recientes con acción "Entrar". Data fetch en el servidor
// (cliente Supabase por request — regla de oro); la acción "Entrar" es cliente.

// Next
import Link from "next/link";
import { redirect } from "next/navigation";

// Iconos
import { ShieldHalf, Plus, ChevronRight, CheckCircle } from "lucide-react";

// Sesión, Supabase y helpers
import { getSessionContext } from "@/lib/auth/session";
import { PLATFORM_ROLES } from "@/lib/auth/roles";
import { createServerSupabase } from "@/lib/supabase-server";
import { mediaUrl } from "@/lib/media";
import { formatGymDate, type Gym } from "@/lib/gyms";

// Shell y acciones
import { PlatformShell } from "@/components/platform/platform-shell";
import { EnterGymButton } from "@/components/platform/enter-gym-button";
import { MediaImage } from "@/components/ui/media-image";

type OverviewGym = Pick<
  Gym,
  | "id"
  | "name"
  | "slug"
  | "logo_url"
  | "theme_primary"
  | "theme_accent"
  | "is_active"
  | "created_at"
>;

export default async function PlatformPage() {
  const ctx = await getSessionContext();
  // Gating por rol (el middleware solo valida sesión, no rol).
  if (!ctx.platformRole) redirect("/dashboard");
  // superadmin_coach no tiene acceso a gyms_select (RLS admin-tier): este
  // dashboard (stats de gyms + "Entrar") no le sirve, va directo a Catálogo.
  if (ctx.platformRole === PLATFORM_ROLES.SUPERADMIN_COACH) redirect("/platform/catalog");

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("gyms")
    .select(
      "id, name, slug, logo_url, theme_primary, theme_accent, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const gyms = (data as OverviewGym[]) ?? [];

  const stats = {
    total: gyms.length,
    active: gyms.filter((g) => g.is_active !== false).length,
    suspended: gyms.filter((g) => g.is_active === false).length,
    withTheme: gyms.filter((g) => g.theme_primary).length,
  };
  const recent = gyms.slice(0, 5);

  const dateStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const STATS = [
    { label: "Gimnasios", value: stats.total, dot: "bg-brandPrimary-700" },
    { label: "Activos", value: stats.active, dot: "bg-emerald-500" },
    { label: "Suspendidos", value: stats.suspended, dot: "bg-amber-500" },
    { label: "Con tema propio", value: stats.withTheme, dot: "bg-sky-500" },
  ];

  return (
    <PlatformShell>
      <div className="p-4 pb-10 md:p-9 md:pb-14">
        {/* Top bar */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-0.5 font-manrope text-xs capitalize text-gray-400">
              {dateStr}
            </p>
            <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
              Plataforma
            </h1>
          </div>

          <Link
            href="/platform/gyms/new"
            className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-700 px-4 py-2.5 shadow-md shadow-brandPrimary-700/30 transition hover:bg-brandPrimary-600"
          >
            <Plus size={15} color="#fff" />
            <span className="font-manrope text-[13px] font-bold text-white">
              Crear gimnasio
            </span>
          </Link>
        </div>

        {/* Welcome banner */}
        <div className="relative mb-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-brandPrimary-800 via-brandPrimary-700 to-brandPrimary-400 p-[30px]">
          <div className="absolute -right-10 -top-10 h-[180px] w-[180px] rounded-full bg-white/5" />
          <div className="absolute -bottom-[50px] right-[100px] h-[140px] w-[140px] rounded-full bg-white/5" />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brandSecondary-400" />
                <span className="font-manrope text-xs font-semibold tracking-wide text-white/65">
                  Modo plataforma
                </span>
              </div>
              <p className="mb-2 font-jakarta text-[28px] font-bold tracking-tight text-white">
                Hola, Super Admin
              </p>
              <p className="max-w-[420px] font-manrope text-[13px] leading-5 text-white/55">
                Administrá todos los gimnasios de la plataforma. Entrá a
                cualquiera para gestionarlo o creá uno nuevo.
              </p>
            </div>

            <div className="ml-8 hidden flex-col items-center justify-center rounded-[20px] border border-white/10 bg-white/10 p-6 md:flex">
              <ShieldHalf size={36} color="rgba(255,255,255,0.9)" />
              <span className="mt-2 font-manrope text-[9px] font-semibold uppercase tracking-widest text-white/55">
                GymTrack
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-7 grid grid-cols-2 gap-3.5 md:flex">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-[18px] border border-gray-200 bg-white p-5"
            >
              <div className="mb-3.5 flex items-center justify-between">
                <span
                  className={`flex h-[38px] w-[38px] items-center justify-center rounded-[11px] ${stat.dot} bg-opacity-10`}
                >
                  <span className={`h-2 w-2 rounded-full ${stat.dot}`} />
                </span>
                <span className={`h-1.5 w-1.5 rounded-full opacity-40 ${stat.dot}`} />
              </div>
              <p className="font-jakarta text-[30px] font-bold tracking-tight text-gray-900">
                {stat.value}
              </p>
              <p className="mt-1 font-manrope text-xs text-gray-400">
                {stat.label}
              </p>
              <span className={`mt-4 block h-0.5 w-[35%] rounded-sm opacity-30 ${stat.dot}`} />
            </div>
          ))}
        </div>

        {/* Recientes */}
        <div className="mb-3 flex items-center justify-between">
          <p className="font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-gray-400">
            Gimnasios recientes
          </p>
          <Link
            href="/platform/gyms"
            className="flex items-center gap-1 transition hover:opacity-70"
          >
            <span className="font-manrope text-[11px] font-semibold text-brandPrimary-700">
              Ver todos
            </span>
            <ChevronRight size={13} className="text-brandPrimary-700" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center rounded-[18px] border border-gray-200 bg-white py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandSecondary-500/10">
              <ShieldHalf size={20} className="text-brandSecondary-500" />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-gray-900">
              Aún no hay gimnasios
            </p>
            <p className="font-manrope text-xs text-gray-400">
              Creá el primero para empezar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((gym) => {
              const logo = mediaUrl(gym.logo_url);
              const suspended = gym.is_active === false;
              return (
                <div
                  key={gym.id}
                  className={`flex items-center gap-3.5 rounded-[15px] border border-gray-200 bg-white p-4 ${
                    suspended ? "opacity-60" : ""
                  }`}
                >
                  <MediaImage
                    src={logo}
                    wrapperClassName="h-[42px] w-[42px] shrink-0 rounded-[11px]"
                    fallback={
                      <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-brandSecondary-500/10">
                        <ShieldHalf size={18} className="text-brandSecondary-500" />
                      </div>
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-jakarta text-sm font-bold text-gray-900">
                        {gym.name}
                      </span>
                      {suspended && (
                        <span className="rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wide text-amber-700">
                          Suspendido
                        </span>
                      )}
                    </div>
                    <p className="mt-px font-manrope text-[11px] text-gray-400">
                      /{gym.slug} · {formatGymDate(gym.created_at)}
                    </p>
                  </div>

                  <EnterGymButton gymId={gym.id} variant="ghost" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}
