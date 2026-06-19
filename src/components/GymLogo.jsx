// ── React Native ──
import { View, Text, useWindowDimensions } from "react-native";

// ── Expo ──
import { Image } from "expo-image";

// ── Contexts / Theme ──
import { useGymTheme } from "../contexts/gym-theme-context";

// ── Utils ──
import { getCloudinaryUrl } from "../utils/cloudinary";

/**
 * Logo del gym activo, con fallback a iniciales sobre fondo branded.
 * Replica el patrón del selector de gyms (select-gym.jsx) para que la
 * identidad del gimnasio sea visible una vez logueado, compensando que
 * el ícono nativo de la app es genérico (build-time, no runtime).
 */
export default function GymLogo({
  size = 32,
  showName = false,
  variant = "icon",
  content = "logo",
  align = "left",
}) {
  const { logoUrl, logoUrlDark, gymName, isDark } = useGymTheme();
  // En dark mode usa el logo dark si el gym lo cargó; si no, cae al principal.
  const activeLogo = isDark && logoUrlDark ? logoUrlDark : logoUrl;
  const resolvedLogo = getCloudinaryUrl(activeLogo);

  // Ancho máximo del wordmark = ancho de pantalla menos el espacio reservado
  // para márgenes y el toggle de tema (headerRight). Acota el título para que
  // recorte con elipsis limpia y nunca se meta por debajo del toggle, tanto
  // centrado como a la izquierda.
  const { width: screenWidth } = useWindowDimensions();
  const maxWordmarkWidth = Math.max(120, screenWidth - 160);

  // Si el gym no tiene nombre, la app se presenta como "GymTrack".
  const name = gymName ?? "GymTrack";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ── Variante wordmark: el logo funciona como título vectorizado ──
  // El superAdmin elige el contenido por gym: "logo" (solo imagen),
  // "logo_title" (imagen + nombre) o "title" (solo nombre). La cascada de
  // fallback es red de seguridad: si falta el logo se cae al nombre; si falta
  // el nombre, "GYMTRACK".
  if (variant === "wordmark") {
    const titleText = (
      <Text
        className="font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark"
        style={{ fontSize: size * 0.5, maxWidth: maxWordmarkWidth }}
        numberOfLines={1}
      >
        {gymName ?? "GYMTRACK"}
      </Text>
    );

    // Modo "title": solo el nombre, ignora la imagen aunque exista.
    if (content === "title") return titleText;

    // Sin logo cargado: cualquier modo cae al nombre.
    if (!resolvedLogo) return titleText;

    // En "logo_title" el logo acompaña al nombre: caja cuadrada (ancho = alto)
    // con el logo centrado, así queda como un marquito prolijo pegado al texto,
    // sin huecos ni quedar flotando. En "logo" solo, la caja es ancha (acotada
    // para no chocar con el headerRight) y el contentPosition sigue a la
    // alineación (centro real o izquierda) dentro de esa caja.
    const isLogoTitle = content === "logo_title";
    const logoWidth = isLogoTitle ? size : Math.min(size * 4, 200);
    const contentPosition = isLogoTitle
      ? "center"
      : align === "center"
        ? "center"
        : "left";
    const image = (
      <Image
        source={{ uri: resolvedLogo }}
        style={{ height: size, width: logoWidth }}
        contentFit="contain"
        contentPosition={contentPosition}
        transition={150}
      />
    );

    if (content === "logo") return image;

    // "logo_title": imagen + nombre al lado. El row se acota a maxWordmarkWidth;
    // el logo conserva su caja (flexShrink 0) y el nombre toma el resto y
    // recorta con elipsis (flexShrink 1) en vez de empujar y cortarse feo.
    return (
      <View
        className="flex-row items-center gap-2.5"
        style={{ maxWidth: maxWordmarkWidth }}
      >
        {image}
        <Text
          className="font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark capitalize"
          style={{ fontSize: size * 0.45, flexShrink: 1 }}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
    );
  }

  const logo = (
    <View
      className="rounded-2xl items-center justify-center overflow-hidden bg-brandPrimary-50 dark:bg-brandPrimary-950"
      style={{ width: size, height: size }}
    >
      {resolvedLogo ? (
        <Image
          source={{ uri: resolvedLogo }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text
          className="font-jakarta-bold text-brandPrimary-600 dark:text-brandPrimary-400"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );

  if (!showName) return logo;

  return (
    <View className="flex-row items-center gap-2.5">
      {logo}
      <Text
        className="font-jakarta-bold tracking-tight text-ui-text-main dark:text-ui-text-mainDark capitalize"
        style={{ fontSize: 17 }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}
