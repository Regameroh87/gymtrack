"use client";

// Inventario de máquinas (admin). Clon de apps/mobile admin/equipments/index.web.jsx:
// lee la tabla equipment del gym activo, stats, búsqueda, grid paginado de cards.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Search,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Supabase, tema y helpers
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { mediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 18;

type Equipment = {
  id: string;
  name: string | null;
  image_uri: string | null;
  created_at: string | null;
};

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

export default function EquipmentsListPage() {
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: equipments, isLoading } = useQuery({
    queryKey: ["admin_equipments_web", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const stats = useMemo(() => {
    if (!equipments) return { total: 0, withImage: 0, withoutImage: 0 };
    const withImage = equipments.filter((e) => !!e.image_uri).length;
    return {
      total: equipments.length,
      withImage,
      withoutImage: equipments.length - withImage,
    };
  }, [equipments]);

  const filtered = useMemo(() => {
    if (!equipments) return [];
    const q = search.trim().toLowerCase();
    if (!q) return equipments;
    return equipments.filter((e) => e.name?.toLowerCase().includes(q));
  }, [equipments, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Máquinas"
        title="Máquinas del gimnasio"
        description="Equipamiento disponible para asignar a los ejercicios"
        cta={
          <Link href="/admin/equipments/add">
            <Button icon={<Plus size={15} color="#fff" />}>Agregar máquina</Button>
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Dumbbell} label="Total" value={stats.total} iconColor="#f43f5e" bubble="bg-rose-500/10" />
        <StatCard icon={ImageIcon} label="Con imagen" value={stats.withImage} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={ImagePlus} label="Sin imagen" value={stats.withoutImage} iconColor="#d97706" bubble="bg-amber-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nombre..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando máquinas...
          </p>
        </div>
      ) : pageRows.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-rose-500/10">
            <Dumbbell size={20} color="#f43f5e" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {search ? "Sin resultados" : "Aún no hay máquinas"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {search ? "Probá con otro nombre." : "Agregá la primera máquina al inventario."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((eq) => (
            <EquipmentCard key={eq.id} equipment={eq} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
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
    <div className="flex flex-1 items-center gap-3.5 rounded-card border border-ui-input-border bg-white p-4 shadow-card-brand">
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

function EquipmentCard({ equipment }: { equipment: Equipment }) {
  const imageUrl = mediaUrl(equipment.image_uri);

  return (
    <Link
      href={`/admin/equipments/edit/${equipment.id}`}
      className="overflow-hidden rounded-card-sm border border-ui-input-border bg-white shadow-card-brand transition-lift hover:border-brandPrimary-600/30 active:scale-[0.99]"
    >
      <div className="w-full overflow-hidden bg-ui-background-light" style={{ aspectRatio: "16 / 10" }}>
        <MediaImage
          src={imageUrl}
          fallback={
            <div className="flex h-full items-center justify-center bg-rose-500/5">
              <Dumbbell size={32} color="#f43f5e" />
            </div>
          }
        />
      </div>

      <div className="p-3.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="flex-1 truncate font-jakarta text-[14px] font-bold tracking-tight text-ui-text-main">
            {equipment.name}
          </span>
          <ChevronRight size={14} color={ui.text.muted} />
        </div>

        <span className="font-manrope text-[10px] text-ui-text-muted">
          Agregada {formatDate(equipment.created_at)}
        </span>
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
