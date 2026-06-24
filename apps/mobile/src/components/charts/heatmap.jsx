// Heatmap de asistencia estilo "contribuciones": una columna por semana, 7 celdas
// Lun→Dom. La opacidad de cada celda escala con la cantidad de check-ins del día.
// Basado en Views (sin SVG) para mantenerlo liviano.
// Props:
//   weeks: [{ key, days: [{ date, count }] }]  — 7 días por semana, Lun→Dom
//   color: color de las celdas con actividad
import { View } from "react-native";

const CELL = 13;
const GAP = 3;

export default function Heatmap({ weeks = [], color }) {
  const max = Math.max(1, ...weeks.flatMap((w) => w.days.map((d) => d.count)));

  return (
    <View className="flex-row" style={{ gap: GAP }}>
      {weeks.map((w) => (
        <View key={w.key} style={{ gap: GAP }}>
          {w.days.map((d) => {
            const active = d.count > 0;
            const intensity = active ? 0.3 + 0.7 * (d.count / max) : 1;
            return (
              <View
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
        </View>
      ))}
    </View>
  );
}
