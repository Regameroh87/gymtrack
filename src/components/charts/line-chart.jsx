// Gráfico de línea minimalista con react-native-svg: línea + área degradada y un
// punto al final. Mide su ancho con onLayout para ser responsivo dentro de su
// contenedor. Pensado para tendencias (p. ej. volumen por semana).
// Props:
//   data: [{ value }]   — orden viejo → nuevo
//   color: color de la línea / degradado
//   height: alto del gráfico
import { useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Polyline,
  Stop,
} from "react-native-svg";

export default function LineChart({ data = [], color, height = 120 }) {
  const [width, setWidth] = useState(0);

  const values = data.map((d) => d.value ?? 0);
  const n = values.length;
  const max = Math.max(...values, 1);
  const padX = 6;
  const padY = 12;
  const innerW = Math.max(width - padX * 2, 1);
  const innerH = Math.max(height - padY * 2, 1);

  const points = values.map((v, i) => {
    const x = padX + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
    const y = padY + innerH - (innerH * v) / max;
    return [x, y];
  });

  const linePoints = points.map((p) => `${p[0]},${p[1]}`).join(" ");
  const areaPath = points.length
    ? `M${points[0][0]},${height - padY} ` +
      points.map((p) => `L${p[0]},${p[1]}`).join(" ") +
      ` L${points[points.length - 1][0]},${height - padY} Z`
    : "";
  const last = points[points.length - 1];

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && n > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </SvgGradient>
          </Defs>
          <Path d={areaPath} fill="url(#line-area)" />
          <Polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last && <Circle cx={last[0]} cy={last[1]} r={3.5} fill={color} />}
        </Svg>
      )}
    </View>
  );
}
