// Gráfico de barras minimalista basado en Views (sin SVG): cada barra es un
// rectángulo redondeado cuya altura es proporcional al valor máximo. La última
// barra se resalta (semana actual); el resto va atenuado.
// Props:
//   data: [{ label, value }]  — el caller decide qué labels mostrar (puede ir "")
//   color: color de acento
//   height: alto del área de barras
import { Text, View } from "react-native";

export default function BarChart({ data = [], color, height = 120 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barArea = height - 18; // deja lugar para la etiqueta inferior

  return (
    <View className="flex-row items-end justify-between" style={{ height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h =
          d.value > 0 ? Math.max((d.value / max) * barArea, 4) : 2;
        return (
          <View
            key={d.key ?? i}
            className="flex-1 items-center justify-end"
            style={{ height }}
          >
            <View
              style={{
                width: "58%",
                height: h,
                borderRadius: 5,
                backgroundColor: color,
                opacity: d.value === 0 ? 0.18 : isLast ? 1 : 0.45,
              }}
            />
            <Text
              numberOfLines={1}
              className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-1.5"
              style={{ fontSize: 8 }}
            >
              {d.label ?? ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
