"use client";

// Historial de envíos de cobranza, dentro de /admin/cobranza/seguimiento.
//
// Es la mitad "hacia atrás" del seguimiento: la tarjeta de arriba dice a quién
// le llegaría hoy, ésta dice qué pasó realmente. gym_dunning_log guarda cada
// envío con su estado y su motivo desde el primer día, pero hasta ahora no se
// mostraba en ningún lado: para saber por qué un socio no había recibido el
// recordatorio había que entrar a la base a mano.
//
// El error y el loading se manejan acá adentro y no en los guards de la página
// a propósito: si el log falla, "hoy le llegaría a" tiene que seguir viéndose.

import { useMemo, useState } from "react";
import { History, Search, RotateCcw, Loader2, CheckCircle2, SkipForward, AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { useDunningLog, PAGE_SIZE, type DunningLogStatus } from "@/lib/hooks/use-dunning-log";
import { daysLabel, fmtDateAR, fmtDateTimeAR, errorMessage } from "@/lib/cobranza/format";

const STATUS_FILTERS: { key: DunningLogStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: "Enviados" },
  { key: "skipped", label: "Salteados" },
  { key: "failed", label: "Fallidos" },
];

const STATUS_STYLE: Record<DunningLogStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  sent: { label: "Enviado", className: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  skipped: { label: "Salteado", className: "bg-amber-50 text-amber-700", Icon: SkipForward },
  failed: { label: "Falló", className: "bg-red-50 text-red-700", Icon: AlertTriangle },
};

function StatusBadge({ status }: { status: DunningLogStatus }) {
  const { label, className, Icon } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-manrope text-[11px] font-bold ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

export function CobranzaHistorial({ gymId }: { gymId: string | null | undefined }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [status, setStatus] = useState<DunningLogStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useDunningLog(gymId, cursor.year, cursor.month);

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);

  // Los contadores van sobre el mes entero, no sobre lo filtrado: son la foto
  // del mes, y cambiarían al tocar un filtro si se calcularan después.
  const counts = useMemo(() => {
    const acc = { sent: 0, skipped: 0, failed: 0 };
    for (const e of entries) acc[e.status]++;
    return acc;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return [e.name, e.lastName, e.email].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [entries, status, search]);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <History size={16} color="#6b7280" />
          <h2 className="font-jakarta text-[15px] font-bold text-ui-text-main">Historial de envíos</h2>
        </div>
        <MonthPicker cursor={cursor} onChange={setCursor} />
      </div>

      {isError ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-ui-input-border py-10">
          <p className="mb-1 font-manrope text-xs font-bold text-ui-text-main">
            No se pudo cargar el historial
          </p>
          <p className="mb-4 max-w-prose px-6 text-center font-manrope text-xs text-ui-text-muted">
            {errorMessage(error)}
          </p>
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center py-10">
          <Loader2 size={18} className="animate-spin text-brandPrimary-600" />
          <p className="mt-3 font-manrope text-xs text-ui-text-muted">Cargando historial...</p>
        </div>
      ) : data && data.everTotal === 0 ? (
        // El estado real hoy: el job todavía no mandó nada. Decir "no hay
        // envíos" a secas haría pensar que algo falló.
        <p className="rounded-xl border border-dashed border-ui-input-border px-6 py-8 text-center font-manrope text-xs text-ui-text-muted">
          Todavía no se envió ningún recordatorio. Cuando la cobranza esté prendida y haya cuotas
          vencidas, cada envío queda registrado acá — incluidos los que se saltean y los que fallan,
          con el motivo.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
              <Search size={15} color="#6b7280" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar socio..."
                className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {STATUS_FILTERS.map((f) => {
                const active = status === f.key;
                const n = f.key === "all" ? entries.length : counts[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatus(f.key)}
                    className={`whitespace-nowrap rounded-xl border px-3.5 py-2.5 transition ${
                      active
                        ? "btn-gradient border-transparent shadow-btn-brand"
                        : "border-ui-input-border bg-white shadow-card-brand hover:bg-brandPrimary-50/60"
                    }`}
                  >
                    <span
                      className={`font-manrope text-xs font-semibold ${active ? "text-white" : "text-ui-text-muted"}`}
                    >
                      {f.label} ({n})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ui-input-border py-8 text-center font-manrope text-xs text-ui-text-muted">
              {entries.length === 0
                ? "No hubo envíos en este mes."
                : "Ningún envío coincide con el filtro."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ui-input-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-ui-input-border bg-gray-50">
                    {["Fecha", "Socio", "Recordatorio", "Vencimiento", "Estado", "Detalle"].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3.5 py-2 font-manrope text-[10px] font-bold uppercase tracking-wide text-ui-text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b border-ui-input-border last:border-0 align-top">
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-muted">
                        {fmtDateTimeAR(e.sentAt)}
                      </td>
                      <td className="px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-main">
                        {[e.name, e.lastName].filter(Boolean).join(" ") || e.email || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-muted">
                        {daysLabel(e.daysAfterDue)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-manrope text-[13px] text-ui-text-muted">
                        {fmtDateAR(e.referenceDueDate)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="max-w-xs px-3.5 py-2.5 font-manrope text-[12px] text-ui-text-muted">
                        {e.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > PAGE_SIZE && (
            <p className="mt-3 text-center font-manrope text-[11px] text-ui-text-muted">
              Mostrando los {PAGE_SIZE} envíos más recientes de {data.total} de este mes.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
