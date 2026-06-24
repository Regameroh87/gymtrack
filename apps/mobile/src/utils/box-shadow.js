import { Platform } from "react-native";

function hexToRgba(color, alpha) {
  if (!color || color === "transparent") return `rgba(0,0,0,0)`;
  if (color.startsWith("rgba("))
    return color.replace(/,\s*[\d.]+\)$/, `,${alpha})`);
  if (color.startsWith("rgb("))
    return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Web: returns boxShadow string (folds opacity into rgba).
 * Native: returns shadow* props unchanged.
 */
export function makeShadow({
  color,
  opacity,
  radius,
  offset = { width: 0, height: 0 },
}) {
  if (Platform.OS !== "web") {
    return {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: offset,
    };
  }
  if (!opacity || color === "transparent") return { boxShadow: "none" };
  const x = offset.width ?? 0;
  const y = offset.height ?? 0;
  return {
    boxShadow: `${x}px ${y}px ${radius}px 0px ${hexToRgba(color, opacity)}`,
  };
}
