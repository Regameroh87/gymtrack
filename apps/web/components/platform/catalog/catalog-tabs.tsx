"use client";

// Shell del catálogo central (super_admin): tabs Ejercicios / Sesiones / Planes.
// Cada sección escribe directo a Supabase (is_catalog=true, gym_id=null); los gyms con
// default_catalog lo reciben read-only. Port de apps/mobile platform/catalog/index.web.jsx.
// Ver [[project_default_catalog]].

import { useState } from "react";
import { Dumbbell, ListChecks, Calendar, type LucideIcon } from "lucide-react";

import { CatalogExercisesSection } from "./exercises-section";
import { CatalogSessionsSection } from "./sessions-section";
import { CatalogPlansSection } from "./plans-section";

type TabKey = "exercises" | "sessions" | "plans";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "exercises", label: "Ejercicios", icon: Dumbbell },
  { key: "sessions", label: "Sesiones", icon: ListChecks },
  { key: "plans", label: "Planes", icon: Calendar },
];

export function CatalogTabs() {
  const [tab, setTab] = useState<TabKey>("exercises");

  return (
    <div className="p-9 pb-14">
      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-600">
          Plataforma
        </p>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          Catálogo por default
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Contenido central read-only que cada gimnasio activa cuando lo
          necesita.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-7 flex gap-2 border-b border-ui-input-light">
        {TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 ${
                active ? "border-brandPrimary-600" : "border-transparent"
              }`}
            >
              <Icon
                size={15}
                className={active ? "text-brandPrimary-600" : "text-ui-text-muted"}
              />
              <span
                className={`font-manrope text-[13px] font-bold ${
                  active ? "text-brandPrimary-600" : "text-ui-text-muted"
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "exercises" && <CatalogExercisesSection />}
      {tab === "sessions" && <CatalogSessionsSection />}
      {tab === "plans" && <CatalogPlansSection />}
    </div>
  );
}
