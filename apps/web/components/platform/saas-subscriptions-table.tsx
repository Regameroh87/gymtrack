"use client";

// Tabla de suscripciones SaaS por gym (panel de plataforma). Recibe la data
// resuelta del servidor; buscador y filtro por status client-side, siguiendo
// el patrón de gyms-list.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { formatGymDate } from "@/lib/gyms";

export interface SaasSubscriptionRow {
  id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  payer_email: string | null;
  created_at: string | null;
  gym: {
    name: string | null;
    created_via: string | null;
  } | null;
  plan: {
    name: string | null;
    price: number | null;
    currency: string | null;
  } | null;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-gray-100 text-gray-600" },
  trialing: { label: "En prueba", className: "bg-sky-50 text-sky-700" },
  active: { label: "Activa", className: "bg-emerald-50 text-emerald-700" },
  past_due: { label: "Pago fallido", className: "bg-amber-50 text-amber-700" },
  canceled: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
  expired: { label: "Vencida", className: "bg-red-50 text-red-700" },
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "trialing", label: "En prueba" },
  { value: "active", label: "Activas" },
  { value: "past_due", label: "Pago fallido" },
  { value: "pending", label: "Pendientes" },
  { value: "expired", label: "Vencidas" },
  { value: "canceled", label: "Canceladas" },
];

export function SaasSubscriptionsTable({
  rows,
}: {
  rows: SaasSubscriptionRow[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.gym?.name?.toLowerCase().includes(q) ||
        r.payer_email?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  return (
    <>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
          <Search size={15} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por gimnasio o email..."
            className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-manrope text-[13px] text-gray-700 outline-none"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center font-manrope text-sm text-gray-400">
          No hay suscripciones que coincidan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-gray-100">
                {["Gimnasio", "Origen", "Estado", "Plan", "Trial vence", "Período hasta", "Email de pago"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-manrope text-[11px] font-semibold uppercase tracking-[1.2px] text-gray-400"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const badge =
                  STATUS_BADGES[r.status] ?? {
                    label: r.status,
                    className: "bg-gray-100 text-gray-600",
                  };
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-manrope text-[13px] font-semibold text-gray-900">
                      {r.gym?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 font-manrope text-[11px] font-bold ${
                          r.gym?.created_via === "self_service"
                            ? "bg-brandPrimary-50 text-brandPrimary-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.gym?.created_via === "self_service"
                          ? "Self-service"
                          : "Plataforma"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 font-manrope text-[11px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-manrope text-[13px] text-gray-600">
                      {r.plan?.name ?? "—"}
                      {r.plan?.price != null && (
                        <span className="text-gray-400">
                          {" "}
                          · ${r.plan.price} {r.plan.currency ?? "ARS"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-manrope text-[13px] text-gray-600">
                      {formatGymDate(r.trial_ends_at)}
                    </td>
                    <td className="px-4 py-3 font-manrope text-[13px] text-gray-600">
                      {formatGymDate(r.current_period_end)}
                    </td>
                    <td className="px-4 py-3 font-manrope text-[13px] text-gray-600">
                      {r.payer_email ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
