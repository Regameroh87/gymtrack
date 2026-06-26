"use client";

// Sesiones de entrenamiento (admin). Clon de apps/mobile admin/sessions/index.web.jsx:
// lee la tabla sessions del gym activo, stats, búsqueda + filtro por nivel, grid paginado.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Image as ImageIcon,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Supabase, tema y helpers
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { useDeleteAdminSession } from "@/lib/hooks/use-admin-sessions";
import { CardActionsMenu } from "@/components/admin/card-actions-menu";
import { DeleteConfirmModal } from "@/components/platform/catalog/catalog-ui";

const PAGE_SIZE = 18;

const LEVEL_META: Record<string, { label: string; color: string; bubble: string; text: string }> = {
  principiante: { label: "Principiante", color: "#10b981", bubble: "bg-emerald-50", text: "text-emerald-700" },
  intermedio: { label: "Intermedio", color: "#f59e0b", bubble: "bg-amber-50", text: "text-amber-700" },
  avanzado: { label: "Avanzado", color: "#ef4444", bubble: "bg-red-50", text: "text-red-700" },
};

type Session = {
  id: string;
  name: string | null;
  description: string | null;
  level: string | null;
  cover_image_uri: string | null;
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

export default function SessionsListPage() {
  const { gymId } = useActiveGym();
  const { brandPrimary } = useGymTheme();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteSession = useDeleteAdminSession();

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    try {
      await deleteSession.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(
        (err as Error)?.message || "No se pudo eliminar la sesión."
      );
    }
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin_sessions_web", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Session[];
    },
  });

  const stats = useMemo(() => {
    if (!sessions) return { total: 0, levels: 0, withCover: 0 };
    const levels = new Set(sessions.map((s) => s.level).filter(Boolean));
    const withCover = sessions.filter((s) => !!s.cover_image_uri).length;
    return { total: sessions.length, levels: levels.size, withCover };
  }, [sessions]);

  const levels = useMemo(() => {
    if (!sessions) return [];
    const set = new Set(sessions.map((s) => s.level).filter(Boolean) as string[]);
    return Array.from(set);
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      const matches =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q);
      if (!matches) return false;
      if (level !== "all" && s.level !== level) return false;
      return true;
    });
  }, [sessions, search, level]);

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
              Armador
            </span>
            <span className="text-[11px] text-ui-text-muted">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-violet-600">
              Sesiones
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Sesiones de entrenamiento
          </h1>
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">
            Plantillas técnicas reutilizables para armar planes semanales
          </p>
        </div>

        <Link
          href="/admin/sessions/builder"
          className="flex items-center justify-center gap-2 self-start rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700 md:self-auto"
        >
          <Plus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Armar sesión
          </span>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={ClipboardList} label="Total" value={stats.total} iconColor="#7c3aed" bubble="bg-violet-50" />
        <StatCard icon={SlidersHorizontal} label="Niveles únicos" value={stats.levels} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={ImageIcon} label="Con portada" value={stats.withCover} iconColor="#0284c7" bubble="bg-sky-50" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5">
          <Search size={15} color={ui.text.muted} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por nombre o descripción..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>

        {levels.length > 0 && (
          <div className="flex flex-wrap gap-1 rounded-xl border border-ui-input-border bg-white p-1">
            <FilterChip label="Todos" active={level === "all"} onClick={() => { setLevel("all"); setPage(0); }} />
            {levels.map((lvl) => (
              <FilterChip
                key={lvl}
                label={LEVEL_META[lvl]?.label || lvl}
                active={level === lvl}
                onClick={() => { setLevel(lvl); setPage(0); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">
            Cargando sesiones...
          </p>
        </div>
      ) : pageRows.length === 0 ? (
        <div className="flex flex-col items-center rounded-[18px] border border-ui-input-border bg-white py-24">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-violet-50">
            <ClipboardList size={20} color="#7c3aed" />
          </div>
          <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
            {search || level !== "all" ? "Sin resultados" : "Aún no hay sesiones"}
          </p>
          <p className="font-manrope text-xs text-ui-text-muted">
            {search || level !== "all"
              ? "Ajustá los filtros o probá con otra búsqueda."
              : "Armá la primera sesión para empezar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((s) => (
            <SessionCard key={s.id} session={s} onDelete={() => setPendingDelete(s)} />
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
        title="Eliminar sesión"
        message={`Vas a eliminar “${pendingDelete?.name ?? ""}”. Los días de planes que la usaban quedarán sin sesión. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={deleteSession.isPending}
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
      className={`rounded-[9px] px-3.5 py-1.5 ${active ? "bg-brandPrimary-600" : "hover:bg-brandPrimary-50/60"}`}
    >
      <span className={`whitespace-nowrap text-xs ${active ? "font-manrope font-bold text-white" : "font-manrope font-semibold text-ui-text-muted"}`}>
        {label}
      </span>
    </button>
  );
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const imageUrl = cloudinaryUrl(session.cover_image_uri);
  const lvl = session.level ? LEVEL_META[session.level] : undefined;

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-ui-input-border bg-white transition hover:border-brandPrimary-600/30">
      <Link
        href={`/admin/sessions/${session.id}`}
        aria-label={session.name ?? "Sesión"}
        className="absolute inset-0 z-0"
      />
      <div className="absolute right-2.5 top-2.5">
        <CardActionsMenu
          editHref={`/admin/sessions/${session.id}`}
          onDelete={onDelete}
        />
      </div>

      <div className="relative w-full overflow-hidden bg-ui-background-light" style={{ aspectRatio: "16 / 10" }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-violet-500/5">
            <ClipboardList size={32} color="#7c3aed" />
          </div>
        )}
        {lvl && (
          <div className={`absolute left-2.5 top-2.5 flex items-center gap-1 rounded-md px-2 py-0.5 ${lvl.bubble}`}>
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: lvl.color }} />
            <span className={`font-manrope text-[10px] font-bold uppercase tracking-wider ${lvl.text}`}>
              {lvl.label}
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <span className="flex-1 truncate font-jakarta text-[14px] font-bold tracking-tight text-ui-text-main">
            {session.name}
          </span>
          <ChevronRight size={14} color={ui.text.muted} />
        </div>

        {session.description ? (
          <p className="line-clamp-2 font-manrope text-[11px] leading-4 text-ui-text-muted">
            {session.description}
          </p>
        ) : (
          <p className="font-manrope text-[11px] italic text-ui-text-muted/70">
            Sin descripción
          </p>
        )}

        <div className="mt-3 border-t border-ui-input-border pt-3">
          <span className="font-manrope text-[10px] text-ui-text-muted">
            Creada {formatDate(session.created_at)}
          </span>
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
      className={`rounded-[9px] border border-ui-input-border px-3.5 py-2 ${disabled ? "bg-ui-background-light opacity-50" : "bg-white hover:bg-brandPrimary-50/60"}`}
    >
      <span className={`font-manrope text-xs font-semibold ${disabled ? "text-ui-text-muted" : "text-ui-text-main"}`}>
        {label}
      </span>
    </button>
  );
}
