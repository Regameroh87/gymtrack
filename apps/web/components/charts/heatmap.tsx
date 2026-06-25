// Heatmap de asistencia estilo "contribuciones": una columna por semana, 7 celdas
// Lun→Dom. La opacidad de cada celda escala con la cantidad de check-ins del día.
// Clon de apps/mobile/src/components/charts/heatmap.jsx.

import { type HeatmapWeek } from "@gymtrack/core/hooks/progress/use-attendance-streak";

const CELL = 13;
const GAP = 3;

export function Heatmap({ weeks = [], color }: { weeks?: HeatmapWeek[]; color: string }) {
  const max = Math.max(1, ...weeks.flatMap((w) => w.days.map((d) => d.count)));

  return (
    <div className="flex" style={{ gap: GAP }}>
      {weeks.map((w) => (
        <div key={w.key} className="flex flex-col" style={{ gap: GAP }}>
          {w.days.map((d) => {
            const active = d.count > 0;
            const intensity = active ? 0.3 + 0.7 * (d.count / max) : 1;
            return (
              <div
                key={d.date}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: active ? color : "rgba(127,127,127,0.12)",
                  opacity: intensity,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
