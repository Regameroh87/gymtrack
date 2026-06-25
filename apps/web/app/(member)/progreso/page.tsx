"use client";

// Progreso del socio (web). Clon de apps/mobile progreso/index.web.jsx: muestra la
// consistencia de asistencia (racha + heatmap) leída de Supabase. El detalle de
// entrenamiento/récords vive en la app móvil.

// Librerías
import { ChartBar, Flame, type LucideIcon } from "lucide-react";

// Hook de datos, contexto y componente
import { useAttendanceStreak } from "@gymtrack/core/hooks/progress/use-attendance-streak";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { Heatmap } from "@/components/charts/heatmap";

export default function ProgresoPage() {
  const { brandPrimary, brandSecondary } = useGymTheme();
  const { gymId } = useActiveGym();
  const { userId } = useAuth();
  const MINT = brandSecondary[400];
  const { data, isLoading } = useAttendanceStreak(gymId, userId);
  const streak = data?.weekStreak ?? 0;
  const hasData = (data?.totalCheckins ?? 0) > 0;

  return (
    <div className="flex flex-col items-center px-6 py-9">
      <div className="w-full" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div className="mb-7">
          <p className="mb-1 font-manrope text-[10px] font-bold uppercase tracking-[2.4px] text-brandPrimary-600">
            Mi Progreso
          </p>
          <h1
            className="font-jakarta font-bold text-ui-text-main"
            style={{ fontSize: 38, lineHeight: "42px", letterSpacing: -1.4 }}
          >
            Progreso
          </h1>
        </div>

        {/* Consistencia */}
        <div className="mb-5 rounded-[22px] border border-ui-input-border bg-ui-surface-light p-6">
          <p className="mb-4 font-manrope text-[10px] font-bold uppercase tracking-[1.6px] text-brandSecondary-700">
            Consistencia
          </p>

          <div className="mb-6 flex gap-4">
            <Stat
              value={`${streak}${streak >= 12 ? "+" : ""}`}
              label={streak === 1 ? "semana en racha" : "semanas en racha"}
              color={MINT}
              Icon={Flame}
            />
            <Stat value={data?.thisWeek ?? 0} label="esta semana" color={brandPrimary[600]} />
          </div>

          {isLoading ? (
            <p className="font-manrope text-xs text-ui-text-muted">
              Cargando asistencia…
            </p>
          ) : hasData ? (
            <div className="overflow-x-auto">
              <Heatmap weeks={data?.weeks} color={MINT} />
            </div>
          ) : (
            <p className="font-manrope text-[13px] leading-5 text-ui-text-muted">
              Hacé check-in con el QR del gimnasio y acá vas a ver tu racha y los
              días que entrenaste.
            </p>
          )}
        </div>

        {/* Nota: detalle en la app */}
        <div className="flex items-center gap-4 rounded-[22px] border border-ui-input-border bg-ui-surface-light p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ backgroundColor: "rgba(48,35,205,0.1)" }}>
            <ChartBar size={22} color={brandPrimary[600]} />
          </div>
          <div className="flex-1">
            <p className="mb-1 font-jakarta text-sm font-bold tracking-tight text-ui-text-main">
              Volumen, récords y adherencia
            </p>
            <p className="font-manrope text-[13px] leading-5 text-ui-text-muted">
              El detalle de tu entrenamiento y tus récords personales está en la
              app móvil de GymTrack.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  color,
  Icon,
}: {
  value: string | number;
  label: string;
  color: string;
  Icon?: LucideIcon;
}) {
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-ui-input-border bg-ui-background-light px-4 py-3.5">
      {Icon && <Icon size={16} color={color} />}
      <p className="mt-1 font-jakarta text-[26px] font-bold leading-[30px]" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 font-manrope text-[11px] text-ui-text-muted">{label}</p>
    </div>
  );
}
