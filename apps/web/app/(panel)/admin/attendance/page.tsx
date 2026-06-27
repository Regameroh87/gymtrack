"use client";

// Asistencias del gimnasio (admin). Clon de apps/mobile admin/attendance/index.web.jsx:
// registro de entradas (QR / manual) del rango elegido, stats, búsqueda, tabla
// paginada, y modal de check-in manual.

// React / Next
import { useMemo, useState } from "react";
import Link from "next/link";

// Librerías
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QrCode,
  Search,
  Clock,
  Calendar,
  Mail,
  UserPlus,
  Users,
  Loader2,
  type LucideIcon,
} from "lucide-react";

// Supabase, contextos y helpers
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";

const PAGE_SIZE = 14;
const RANGE_FILTERS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "7 días" },
  { key: "month", label: "30 días" },
  { key: "all", label: "Todo" },
];

type Person = {
  id: string;
  name: string | null;
  last_name: string | null;
  email?: string | null;
  image_profile?: string | null;
};
type AttendanceRowT = {
  id: string;
  checked_in_at: string;
  method: string | null;
  profile: Person | null;
  staff: Person | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function rangeStart(key: string) {
  if (key === "today") return startOfDay(new Date()).toISOString();
  if (key === "week") return daysAgo(7).toISOString();
  if (key === "month") return daysAgo(30).toISOString();
  return null;
}
const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AttendanceListPage() {
  const qc = useQueryClient();
  const { userId: staffProfileId } = useAuth();
  const { brandPrimary } = useGymTheme();
  const { gymId } = useActiveGym();

  const [search, setSearch] = useState("");
  const [range, setRange] = useState("today");
  const [page, setPage] = useState(0);
  const [showManual, setShowManual] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin_attendance", gymId, range],
    enabled: !!gymId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      let q = supabase
        .from("attendances")
        .select(
          "id, checked_in_at, method, profile:profiles!profile_id(id,name,last_name,email,image_profile), staff:profiles!checked_in_by(id,name,last_name)"
        )
        .eq("gym_id", gymId)
        .order("checked_in_at", { ascending: false });
      const since = rangeStart(range);
      if (since) q = q.gte("checked_in_at", since);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceRowT[];
    },
  });

  const { data: statsRows } = useQuery({
    queryKey: ["admin_attendance_stats", gymId],
    enabled: !!gymId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from("attendances")
        .select("checked_in_at")
        .eq("gym_id", gymId)
        .gte("checked_in_at", daysAgo(30).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    if (!statsRows) return { today: 0, week: 0, month: 0 };
    const today = startOfDay(new Date()).getTime();
    const w = daysAgo(7).getTime();
    const m = daysAgo(30).getTime();
    let t = 0, ww = 0, mm = 0;
    for (const r of statsRows) {
      const ts = new Date(r.checked_in_at).getTime();
      if (ts >= today) t++;
      if (ts >= w) ww++;
      if (ts >= m) mm++;
    }
    return { today: t, week: ww, month: mm };
  }, [statsRows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const p = r.profile;
      if (!p) return false;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

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
              Asistencias
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
            Asistencias del gimnasio
          </h1>
          <p className="mt-1 font-manrope text-xs text-ui-text-muted">
            Registro de entradas vía QR y check-in manual
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 rounded-[11px] border border-ui-input-border bg-white px-3.5 py-2.5 hover:bg-brandPrimary-50/60"
          >
            <UserPlus size={14} color={ui.text.main} />
            <span className="font-manrope text-[13px] font-bold text-ui-text-main">
              Check-in manual
            </span>
          </button>

          <Link
            href="/admin/attendance/kiosk"
            className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700"
          >
            <QrCode size={15} color="#fff" />
            <span className="font-manrope text-[13px] font-bold text-white">
              Abrir kiosko
            </span>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex flex-col gap-3.5 md:flex-row">
        <StatCard icon={Clock} label="Hoy" value={stats.today} iconColor="#10b981" bubble="bg-emerald-50" />
        <StatCard icon={Calendar} label="Últimos 7 días" value={stats.week} iconColor={brandPrimary[600]} bubble="bg-brandPrimary-50" />
        <StatCard icon={Calendar} label="Últimos 30 días" value={stats.month} iconColor="#7c3aed" bubble="bg-violet-50" />
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
            placeholder="Buscar socio por nombre o email..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
          />
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-ui-input-border bg-white p-1">
          {RANGE_FILTERS.map((f) => {
            const active = range === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setRange(f.key);
                  setPage(0);
                }}
                className={`rounded-[9px] px-3.5 py-1.5 ${active ? "bg-brandPrimary-600" : "hover:bg-brandPrimary-50/60"}`}
              >
                <span className={`text-xs ${active ? "font-manrope font-bold text-white" : "font-manrope font-semibold text-ui-text-muted"}`}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[18px] border border-ui-input-border bg-white">
        <div className="flex border-b border-ui-input-border bg-ui-background-light px-5 py-3.5">
          <HeaderCell label="Socio" flex={3} />
          <HeaderCell label="Email" flex={3} />
          <HeaderCell label="Método" flex={1.2} />
          <HeaderCell label="Hora" flex={1.6} />
          <HeaderCell label="Registró" flex={1.6} />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 size={20} color={brandPrimary[600]} className="animate-spin" />
            <p className="mt-3 font-manrope text-xs text-ui-text-muted">
              Cargando asistencias...
            </p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-emerald-50">
              <QrCode size={20} color="#10b981" />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
              {search ? "Sin resultados" : "Aún no hay asistencias"}
            </p>
            <p className="font-manrope text-xs text-ui-text-muted">
              {search ? "Probá con otro nombre o email." : "Abrí el kiosko o registrá un check-in manual."}
            </p>
          </div>
        ) : (
          pageRows.map((r, i) => (
            <AttendanceRow key={r.id} row={r} isLast={i === pageRows.length - 1} />
          ))
        )}
      </div>

      {/* Paginación */}
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

      {showManual && (
        <ManualCheckInModal
          gymId={gymId}
          staffProfileId={staffProfileId}
          onClose={() => setShowManual(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin_attendance"] });
            qc.invalidateQueries({ queryKey: ["admin_attendance_stats"] });
            setShowManual(false);
          }}
        />
      )}
    </div>
  );
}

// ── Modal: check-in manual ──

function ManualCheckInModal({
  gymId,
  staffProfileId,
  onClose,
  onDone,
}: {
  gymId: string | null;
  staffProfileId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { brandPrimary } = useGymTheme();
  const [q, setQ] = useState("");

  const { data: members } = useQuery({
    queryKey: ["gym_members", gymId],
    enabled: !!gymId,
    queryFn: async () => {
      const supabase = getBrowserSupabase();
      const { data: rows, error } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("gym_id", gymId)
        .eq("role", "member")
        .eq("status", "active");
      if (error) throw error;
      if (!rows?.length) return [] as Person[];
      const { data, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, last_name, email, image_profile")
        .in("user_id", rows.map((r) => r.user_id))
        .order("name");
      if (pErr) throw pErr;
      return (data ?? []) as Person[];
    },
  });

  const insert = useMutation({
    mutationFn: async (profileId: string) => {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.from("attendances").insert({
        gym_id: gymId,
        profile_id: profileId,
        method: "manual",
        checked_in_by: staffProfileId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in registrado");
      onDone();
    },
    onError: (err) => {
      console.error("Error al registrar asistencia:", err);
      toast.error("No se pudo registrar el check-in. Verificá tu conexión o permisos.");
    },
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    const s = q.trim().toLowerCase();
    if (!s) return members.slice(0, 20);
    return members
      .filter(
        (m) =>
          m.name?.toLowerCase().includes(s) ||
          m.last_name?.toLowerCase().includes(s) ||
          m.email?.toLowerCase().includes(s)
      )
      .slice(0, 20);
  }, [members, q]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ backgroundColor: "rgba(15,13,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-[440px] overflow-hidden rounded-2xl border border-ui-input-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ui-input-border px-5 py-4">
          <span className="font-jakarta text-base font-bold text-ui-text-main">
            Check-in manual
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2.5 py-1 hover:bg-ui-background-light"
          >
            <span className="font-manrope text-xs font-semibold text-ui-text-muted">
              Cerrar
            </span>
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-2.5">
            <Search size={14} color={ui.text.muted} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar socio..."
              autoFocus
              className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto px-2.5 py-2.5">
          {filtered.length === 0 ? (
            <p className="py-6 text-center font-manrope text-xs text-ui-text-muted">
              Sin coincidencias
            </p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={insert.isPending}
                onClick={() => insert.mutate(m.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-brandPrimary-50/50 disabled:opacity-60"
              >
                {m.image_profile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image_profile} alt="" className="h-[30px] w-[30px] rounded-lg object-cover" />
                ) : (
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brandPrimary-50">
                    <Users size={14} color={brandPrimary[600]} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-manrope text-[13px] font-bold text-ui-text-main">
                    {m.name} {m.last_name}
                  </p>
                  <p className="truncate font-manrope text-[11px] text-ui-text-muted">
                    {m.email}
                  </p>
                </div>
                <span className="font-manrope text-[11px] font-semibold text-brandPrimary-600">
                  Registrar
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes ──

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

function HeaderCell({ label, flex }: { label: string; flex: number }) {
  return (
    <div style={{ flex }} className="flex flex-col items-start">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
        {label}
      </span>
    </div>
  );
}

function AttendanceRow({ row, isLast }: { row: AttendanceRowT; isLast: boolean }) {
  const p = row.profile;
  const initials =
    `${p?.name?.[0] || ""}${p?.last_name?.[0] || ""}`.toUpperCase() || "U";
  const isQr = row.method === "qr";

  return (
    <div className={`flex items-center px-5 py-3 ${isLast ? "" : "border-b border-ui-input-border"}`}>
      <div className="flex items-center gap-3" style={{ flex: 3 }}>
        {p?.image_profile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_profile} alt="" className="h-8 w-8 rounded-[9px] object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-brandPrimary-50">
            <span className="font-jakarta text-[11px] font-bold text-brandPrimary-600">
              {initials}
            </span>
          </div>
        )}
        <span className="truncate font-manrope text-[13px] font-bold text-ui-text-main">
          {p?.name} {p?.last_name}
        </span>
      </div>

      <div className="flex items-center gap-1.5" style={{ flex: 3 }}>
        <Mail size={12} color={ui.text.muted} />
        <span className="truncate font-manrope text-xs text-ui-text-muted">
          {p?.email}
        </span>
      </div>

      <div style={{ flex: 1.2 }}>
        <div className={`flex w-fit items-center gap-1 rounded-md px-2 py-0.5 ${isQr ? "bg-emerald-50" : "bg-amber-50"}`}>
          <span className={`h-1 w-1 rounded-full ${isQr ? "bg-emerald-600" : "bg-amber-600"}`} />
          <span className={`font-manrope text-[10px] font-bold uppercase tracking-wider ${isQr ? "text-emerald-600" : "text-amber-600"}`}>
            {isQr ? "QR" : "Manual"}
          </span>
        </div>
      </div>

      <div style={{ flex: 1.6 }}>
        <span className="font-manrope text-xs text-ui-text-muted">
          {formatTime(row.checked_in_at)}
        </span>
      </div>

      <div style={{ flex: 1.6 }}>
        <span className="truncate font-manrope text-xs text-ui-text-muted">
          {row.staff ? `${row.staff.name ?? ""} ${row.staff.last_name ?? ""}`.trim() : "—"}
        </span>
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
