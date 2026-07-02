// Texto guía dentro de una sección de Progreso cuando todavía no hay datos.
import { Text } from "react-native";

export default function SectionEmpty({ children }) {
  return (
    <Text
      className="font-manrope text-ui-text-muted dark:text-ui-text-mutedDark"
      style={{ fontSize: 13, lineHeight: 19 }}
    >
      {children}
    </Text>
  );
}
