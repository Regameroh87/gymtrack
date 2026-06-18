// Mapea los nombres de íconos usados en landing-content.js a sus componentes.
import {
  CloudUpload,
  Settings,
  ShieldHalf,
  ClipboardList,
  ChartBar,
  SwitchHorizontal,
  Users,
  Barbell,
} from "../../../assets/icons";

const ICONS = {
  CloudUpload,
  Settings,
  ShieldHalf,
  ClipboardList,
  ChartBar,
  SwitchHorizontal,
  Users,
  Barbell,
};

export default function LandingIcon({ name, size = 24, color = "#ffffff" }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}
