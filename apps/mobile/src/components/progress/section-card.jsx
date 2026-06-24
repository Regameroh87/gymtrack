// Contenedor de sección para la pestaña Progreso. Replica el lenguaje visual de
// las cards de Registros (superficie ui-surface, borde ui-input-border, kicker en
// mint + título jakarta) para mantener coherencia con el resto de la app.
import { Text, View } from "react-native";

import { useGymTheme } from "../../contexts/gym-theme-context";

export default function SectionCard({ kicker, title, right, children }) {
  const { brandSecondary } = useGymTheme();
  const BRAND_MINT = brandSecondary[400];

  return (
    <View className="rounded-2xl bg-ui-surface-light dark:bg-ui-surface-dark border border-ui-input-border overflow-hidden mb-4">
      <View style={{ padding: 18 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View style={{ gap: 4 }}>
            {!!kicker && (
              <Text
                className="font-manrope-bold uppercase"
                style={{ fontSize: 9, letterSpacing: 1.4, color: BRAND_MINT }}
              >
                {kicker}
              </Text>
            )}
            <Text
              className="font-jakarta-bold text-ui-text-main dark:text-ui-text-mainDark"
              style={{ fontSize: 17, letterSpacing: -0.4 }}
            >
              {title}
            </Text>
          </View>
          {right}
        </View>
        {children}
      </View>
    </View>
  );
}
