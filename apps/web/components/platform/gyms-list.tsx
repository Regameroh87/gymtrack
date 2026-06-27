"use client";

// Lista de gimnasios del panel de plataforma. Réplica de
// apps/mobile platform/gyms/index.web.jsx: stats, buscador, grid de cards
// (Entrar + Configurar) y paginación. Recibe la data ya resuelta del servidor.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Iconos
import { ShieldHalf, Users, Search, MapPin, Pencil } from "lucide-react";

// Helpers y acciones
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatGymDate, ownerLabel, type Gym, type GymOwner } from "@/lib/gyms";
import { EnterGymButton } from "@/components/platform/enter-gym-button";

const PAGE_SIZE = 12;

export type GymWithOwner = Gym & { owner: GymOwner | null };

export function GymsList({ gyms }: { gyms: GymWithOwner[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const stats = useMemo(
    () => ({
      total: gyms.length,
      withLogo: gyms.filter((g) => g.logo_url).length,
      withTheme: gyms.filter((g) => g.theme_primary).length,
    }),
    [gyms]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gyms;
    return gyms.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.slug?.toLowerCase().includes(q) ||
        g.owner?.name?.toLowerCase().includes(q) ||
        g.owner?.email?.toLowerCase().includes(q)
    );
  }, [gyms, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <>
      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-3 md:flex md:gap-3.5">
        <StatCard icon={ShieldHalf} label="Total" value={stats.total} />
        <StatCard icon={Users} label="Con logo" value={stats.withLogo} />
        <StatCard icon={MapPin} label="Con tema propio" value={stats.withTheme} />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
        <Search size={15} className="text-gray-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nombre, slug o dueño..."
          className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Body */}
      {pageRows.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-gray-200 bg-white py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandSecondary-500/10">
            <ShieldHalf size={20} className="text-brandSecondary-500" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-gray-900">
            {search ? "Sin resultados" : "Aún no hay gimnasios"}
          </p>
          <p className="font-manrope text-xs text-gray-400">
            {search
              ? "Probá con otra búsqueda."
              : "Creá el primer gimnasio para empezar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((gym) => (
            <GymCard key={gym.id} gym={gym} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
          <p className="font-manrope text-xs text-gray-400">
            Mostrando{" "}
            <span className="font-bold text-gray-900">
              {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}
            </span>{" "}
            de {filtered.length}
          </p>
          <div className="flex gap-2">
            <PageBtn
              label="Anterior"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            />
            <PageBtn
              label="Siguiente"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldHalf;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-1 items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-brandPrimary-50">
        <Icon size={18} className="text-brandPrimary-700" />
      </div>
      <div>
        <p className="font-jakarta text-[22px] font-bold tracking-tight text-gray-900">
          {value}
        </p>
        <p className="font-manrope text-[11px] text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function GymCard({ gym }: { gym: GymWithOwner }) {
  const logo = cloudinaryUrl(gym.logo_url);
  const suspended = gym.is_active === false;

  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-gray-200 bg-white transition hover:border-brandPrimary-300 ${
        suspended ? "opacity-55" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brandSecondary-500/10">
            <ShieldHalf size={20} className="text-brandSecondary-500" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-jakarta text-[14px] font-bold tracking-tight text-gray-900">
              {gym.name}
            </span>
            {suspended && (
              <span className="shrink-0 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wide text-amber-700">
                Suspendido
              </span>
            )}
          </div>
          <p className="truncate font-manrope text-[11px] text-gray-400">
            /{gym.slug}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="mb-2.5 flex items-center gap-1.5">
          <Users size={12} className="text-gray-400" />
          <span className="truncate font-manrope text-[11px] text-gray-400">
            {ownerLabel(gym.owner)}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ backgroundColor: gym.theme_primary || "#4A44E4" }}
            />
            <span
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ backgroundColor: gym.theme_accent || "#2DD4BF" }}
            />
            {!gym.theme_primary && (
              <span className="ml-1 font-manrope text-[9px] text-gray-400">
                Tema por defecto
              </span>
            )}
          </div>
          <span className="font-manrope text-[10px] text-gray-400">
            {formatGymDate(gym.created_at)}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <EnterGymButton gymId={gym.id} />
          <Link
            href={`/platform/gyms/${gym.id}`}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border border-gray-200 bg-white px-3 py-2 transition hover:bg-brandPrimary-50"
          >
            <Pencil size={12} className="text-gray-400" />
            <span className="font-manrope text-[12px] font-semibold text-gray-900">
              Configurar
            </span>
          </Link>
        </div>
      </div>
    </div>
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
      className={`rounded-[9px] border border-gray-200 px-3.5 py-2 font-manrope text-xs font-semibold ${
        disabled
          ? "bg-gray-50 text-gray-400 opacity-50"
          : "bg-white text-gray-900 hover:bg-brandPrimary-50"
      }`}
    >
      {label}
    </button>
  );
}
