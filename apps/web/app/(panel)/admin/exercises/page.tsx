"use client";

// Catálogo de ejercicios (admin). Clon de apps/mobile admin/exercises/index.web.jsx:
// lee exercises_base del gym activo (react-query + Supabase directo), stats,
// búsqueda + filtro por categoría, grid paginado de cards.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Search,
  ChevronRight,
  ListFilter,
  SlidersHorizontal,
  Plus,
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
import { useDeleteAdminExercise } from "@/lib/hooks/use-admin-exercises";
import { CardActionsMenu } from "@/components/admin/card-actions-menu";
import { DeleteConfirmModal } from "@/components/platform/catalog/catalog-ui";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 18;

type Exercise = {
  id: string;
  name: string | null;
  category: string | null;
  muscle_group: string | null;
  image_uri: string | null;
  is_unilateral: boolean | null;
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

export default function ExercisesListPage() {
  const { gymId } = useActiveGym();
  const { brandPrimary, brandSecondary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteExercise = useDeleteAdminExercise();

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    try {
      await deleteExercise.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      // 23503 = foreign_key_violation: el ejercicio está en uso en sesiones.
      const e = err as { code?: string; message?: string };
      setDeleteError(
        e?.code === "23503"
          ? "No se puede eliminar: el ejercicio está en uso en una o más sesiones. Quitalo de esas sesiones primero."
          : e?.message || "No se pudo eliminar el ejercicio."
      );
    }
  };

  // Multi-gym: la RLS devuelve los gyms del usuario; el filtro por gym activo es del cliente.
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["admin_exercises_web", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("exercises_base")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const stats = useMemo(() => {
    if (!exercises) return { total: 0, categories: 0, muscles: 0 };
    const categories = new Set(exercises.map((e) => e.category).filter(Boolean));
    const muscles = new Set(exercises.map((e) => e.muscle_group).filter(Boolean));
    return { total: exercises.length, categories: categories.size, muscles: muscles.size };
  }, [exercises]);

  const categories = useMemo(() => {
    if (!exercises) return [];
    const set = new Set(exercises.map((e) => e.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matches =
        !q ||
        e.name?.toLowerCase().includes(q) ||
        e.muscle_group?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);
      if (!matches) return false;
      if (category !== "all" && e.category !== category) return false;
      return true;
    });
  }, [exercises, search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <div className="p-4 pb-14 md:p-9">
      <PageHeader
        section="Ejercicios"
        title="Catálogo de ejercicios"
        description="Biblioteca maestra de movimientos disponibles para las sesiones"
        cta={
          <Link href="/admin/exercises/builder">
            <Button icon={<Plus size={15} color="#fff" />}>Crear ejercicio</Button>
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Dumbbell} label="Total" value={stats.total} iconColor={brandSecondary[500]} bubble="bg-brandSecondary-500/10" />
        <StatCard icon={ListFilter} label="Categorías" value={stats.categories} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={SlidersHorizontal} label="Grupos musculares" value={stats.muscles} iconColor="#0284c7" bubble="bg-sky-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        {/* Search */}
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nombre, grupo o categoría..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-start gap-1 rounded-xl border border-ui-input-border bg-white p-1 shadow-card-brand">
          <FilterChip label="Todas" active={category === "all"} onClick={() => { setCategory("all"); setPage(0); }} />
          {categories.slice(0, 5).map((cat) => (
            <FilterChip
              key={cat}
              label={cat}
              active={category === cat}
              onClick={() => { setCategory(cat); setPage(0); }}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando ejercicios...
          </p>
        </div>
      ) : pageRows.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-ui-input-border bg-white py-24 shadow-card-brand">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandSecondary-500/10">
            <Dumbbell size={20} color={brandSecondary[500]} />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {search || category !== "all" ? "Sin resultados" : "Aún no hay ejercicios"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {search || category !== "all"
              ? "Ajustá los filtros o probá con otra búsqueda."
              : "Creá el primer ejercicio para empezar el catálogo."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              brandSecondary={brandSecondary}
              onDelete={() => setPendingDelete(ex)}
            />
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

      <DeleteConfirmModal
        visible={!!pendingDelete}
        title="Eliminar ejercicio"
        message={`Vas a eliminar “${pendingDelete?.name ?? ""}”. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={deleteExercise.isPending}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />
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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[9px] px-3.5 py-1.5 transition ${
        active ? "btn-gradient shadow-btn-brand" : "hover:bg-brandPrimary-50/60"
      }`}
    >
      <span
        className={`whitespace-nowrap text-xs ${
          active ? "font-manrope font-bold text-white" : "font-manrope font-semibold text-ui-text-muted"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function ExerciseCard({
  exercise,
  brandSecondary,
  onDelete,
}: {
  exercise: Exercise;
  brandSecondary: Record<number, string>;
  onDelete: () => void;
}) {
  const imageUrl = mediaUrl(exercise.image_uri);

  return (
    <div className="relative overflow-hidden rounded-card-sm border border-ui-input-border bg-white shadow-card-brand transition-lift hover:border-brandPrimary-600/30">
      <Link
        href={`/admin/exercises/${exercise.id}`}
        aria-label={exercise.name ?? "Ejercicio"}
        className="absolute inset-0 z-0"
      />
      <div className="absolute right-2.5 top-2.5">
        <CardActionsMenu
          editHref={`/admin/exercises/${exercise.id}`}
          onDelete={onDelete}
        />
      </div>

      {/* Image */}
      <div className="w-full overflow-hidden bg-ui-background-light" style={{ aspectRatio: "16 / 10" }}>
        <MediaImage
          src={imageUrl}
          fallback={
            <div className="flex h-full items-center justify-center bg-brandSecondary-500/5">
              <Dumbbell size={32} color={brandSecondary[500]} />
            </div>
          }
        />
      </div>

      {/* Body */}
      <div className="p-3.5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="flex-1 truncate font-jakarta text-[14px] font-bold tracking-tight text-ui-text-main">
            {exercise.name}
          </span>
          <ChevronRight size={14} color={ui.text.muted} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {exercise.muscle_group && (
            <div className="flex items-center gap-1 rounded-md bg-brandSecondary-500/10 px-2 py-0.5">
              <span className="h-1 w-1 rounded-full bg-brandSecondary-500" />
              <span className="font-manrope text-[10px] font-bold uppercase tracking-wider text-brandSecondary-700">
                {exercise.muscle_group}
              </span>
            </div>
          )}
          {exercise.category && (
            <span className="font-manrope text-[10px] text-ui-text-muted">
              {exercise.category}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ui-input-border pt-3">
          <span className="font-manrope text-[10px] text-ui-text-muted">
            {formatDate(exercise.created_at)}
          </span>
          {exercise.is_unilateral && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5">
              <span className="font-manrope text-[9px] font-bold uppercase tracking-wider text-amber-700">
                Unilateral
              </span>
            </span>
          )}
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
