// Fila "Esta semana" de la card de asistencia: 7 chips Lun→Dom. Un día entrenado
// se rellena con el acento y un check; un día pasado sin entrenar muestra el
// número del día apagado; los días futuros van casi invisibles. "Hoy" lleva el
// dot mint con glow debajo (firma editorial) y su inicial en color.
// Props:
//   days: [{ date: "YYYY-MM-DD", count }] — 7 días, Lun→Dom
//   color: color de acento (mint del gym)
//   ink: color del check sobre `color`, ya resuelto por contraste (el theme es
//        custom por gym, así que no se puede asumir tinta clara ni oscura)

// React Native
import { Text, View } from "react-native";

// Utilidades
import { startOfDay } from "@gymtrack/core/format-date";

// Tema / assets
import { Check } from "../../../assets/icons";

// Iniciales Lun→Dom (X = miércoles para no repetir la M de martes).
const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const CHIP = 36;

export default function WeekStrip({ days = [], color, ink }) {
  // Misma convención de clave local que el hook de asistencia.
  const todayKey = startOfDay(new Date()).toISOString().slice(0, 10);

  return (
    <View className="flex-row justify-between">
      {days.map((d, i) => {
        const trained = d.count > 0;
        const isToday = d.date === todayKey;
        const isFuture = d.date > todayKey;

        return (
          <View
            key={d.date}
            className="items-center"
            style={{ gap: 6, opacity: isFuture ? 0.35 : 1 }}
          >
            <Text
              className={
                isToday
                  ? "font-manrope-bold uppercase"
                  : "font-manrope-bold uppercase text-ui-text-muted dark:text-ui-text-mutedDark"
              }
              style={{
                fontSize: 9,
                letterSpacing: 1,
                ...(isToday && { color }),
              }}
            >
              {DAY_LETTERS[i]}
            </Text>

            <View
              className={
                trained
                  ? "items-center justify-center"
                  : "items-center justify-center bg-ui-input-border"
              }
              style={{
                width: CHIP,
                height: CHIP,
                borderRadius: 999,
                ...(trained && { backgroundColor: color }),
              }}
            >
              {trained ? (
                <Check size={17} color={ink} strokeWidth={2.75} />
              ) : (
                <Text
                  className="font-manrope-semi text-ui-text-muted dark:text-ui-text-mutedDark"
                  style={{ fontSize: 12 }}
                >
                  {Number(d.date.slice(8, 10))}
                </Text>
              )}
            </View>

            {/* Dot mint con glow como ancla de "hoy"; transparente en el resto
                para que los chips no salten de altura. */}
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                backgroundColor: isToday ? color : "transparent",
                shadowColor: color,
                shadowOpacity: isToday ? 1 : 0,
                shadowRadius: 5,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
