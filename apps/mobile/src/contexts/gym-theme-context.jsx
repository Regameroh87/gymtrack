// React
import { createContext, useContext, useEffect, useMemo, useState } from "react";

// React Native / NativeWind
import { View } from "react-native";
import { vars, useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Theme
import {
  brandPrimary as defaultPrimary,
  brandSecondary as defaultSecondary,
  gradient as defaultGradient,
  buildGradients,
} from "@gymtrack/core/colors";
import { generateRamp, rampToChannels, SHADES } from "@gymtrack/core/generate-ramp";

// Datos del gym (branding)
import { useGym } from "@gymtrack/core/hooks/gyms/use-gym";
import { useActiveGym } from "./active-gym-context";

// ─── Theme multitenant en runtime ───
// Resuelve la paleta de marca del gym activo (rampas generadas del seed o las
// default), la expone como objeto JS (useGymTheme) para usos inline/degradados,
// y la inyecta como CSS variables (vars()) para que las clases Tailwind de
// marca (bg/text-brandPrimary-*, -brandSecondary-*) cambien sin tocar archivos.

const GymThemeContext = createContext(null);

const STORAGE_PREFIX = "gym-theme:";
const LAST_KEY = `${STORAGE_PREFIX}last`;

// Default = rampas hand-tuned + objeto gradient original (cero regresión).
const DEFAULT_THEME = {
  brandPrimary: defaultPrimary,
  brandSecondary: defaultSecondary,
  gradient: defaultGradient,
  source: "default",
};

// Construye el theme a partir de los seeds del gym. Sin seeds → default.
function resolveTheme(themePrimary, themeAccent) {
  if (!themePrimary || !themeAccent) return DEFAULT_THEME;
  const brandPrimary = generateRamp(themePrimary);
  const brandSecondary = generateRamp(themeAccent);
  return {
    brandPrimary,
    brandSecondary,
    gradient: buildGradients(brandPrimary, brandSecondary),
    source: "custom",
  };
}

// Mapea las rampas a CSS variables con canales "R G B" (para <alpha-value>).
function buildCssVars({ brandPrimary, brandSecondary }) {
  const primaryCh = rampToChannels(brandPrimary);
  const secondaryCh = rampToChannels(brandSecondary);
  const out = {};
  for (const step of SHADES) {
    out[`--brand-primary-${step}`] = primaryCh[step];
    out[`--brand-secondary-${step}`] = secondaryCh[step];
  }
  return out;
}

export function GymThemeProvider({ children }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { gymId } = useActiveGym();
  const { data: gym } = useGym(gymId);
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // 1) Hidratación temprana: theme del gym ACTIVO persistido (multi-gym),
  // con fallback al último theme conocido — antes de que resuelva auth.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const activeGymId = await AsyncStorage.getItem("active-gym:id");
        // Sin gym activo (modo plataforma del super_admin): queda DEFAULT_THEME.
        // No se cae a LAST_KEY para no arrastrar el tema del último gym.
        if (!activeGymId) return;
        let raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${activeGymId}`);
        if (!raw) raw = await AsyncStorage.getItem(LAST_KEY);
        if (!mounted || !raw) return;
        const { theme_primary, theme_accent } = JSON.parse(raw);
        const resolved = resolveTheme(theme_primary, theme_accent);
        if (resolved.source === "custom") setTheme(resolved);
      } catch {
        // sin cache: queda el default
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Fuente de verdad: el gym activo. Resuelve, aplica y persiste.
  useEffect(() => {
    // Sin gym activo (super_admin en modo plataforma, o logout): volver a la
    // marca GymTrack default. DEFAULT_THEME es constante de módulo (referencia
    // estable), así que no dispara renders en loop.
    if (!gymId) {
      setTheme(DEFAULT_THEME);
      return;
    }
    // Gym seleccionado pero su branding aún no resolvió: mantener el theme
    // actual (hidratado) para no parpadear a default mientras carga la query.
    if (!gym) return;
    const resolved = resolveTheme(gym.theme_primary, gym.theme_accent);
    setTheme(resolved);
    const payload = JSON.stringify({
      theme_primary: gym.theme_primary ?? null,
      theme_accent: gym.theme_accent ?? null,
    });
    AsyncStorage.multiSet([
      [`${STORAGE_PREFIX}${gym.id}`, payload],
      [LAST_KEY, payload],
    ]).catch(() => {});
  }, [gymId, gym]);

  const cssVars = useMemo(() => buildCssVars(theme), [theme]);

  const value = useMemo(
    () => ({
      brandPrimary: theme.brandPrimary,
      brandSecondary: theme.brandSecondary,
      gradient: theme.gradient,
      logoUrl: gym?.logo_url ?? null,
      logoUrlDark: gym?.logo_url_dark ?? null,
      gymName: gym?.name ?? null,
      // Config del header del home, editable por el superAdmin. Defaults
      // seguros mientras el gym resuelve (= comportamiento actual).
      headerConfig: {
        logoSize: gym?.header_logo_size ?? "md",
        logoPosition: gym?.header_logo_position ?? "left",
        content: gym?.header_content ?? "logo",
      },
      source: theme.source,
      isDark,
    }),
    [theme, gym, isDark]
  );

  return (
    <GymThemeContext.Provider value={value}>
      <View style={vars(cssVars)} className="flex-1">
        {children}
      </View>
    </GymThemeContext.Provider>
  );
}

export function useGymTheme() {
  const ctx = useContext(GymThemeContext);
  if (!ctx) {
    throw new Error("useGymTheme debe usarse dentro de <GymThemeProvider>");
  }
  return ctx;
}
