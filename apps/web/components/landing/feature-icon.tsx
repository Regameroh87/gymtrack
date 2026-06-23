import {
  CloudUpload,
  Settings,
  ShieldHalf,
  ClipboardList,
  BarChart3,
  ArrowLeftRight,
  Users,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";

// Mapea los nombres de ícono del contenido (heredados de la app móvil) a íconos
// de lucide-react.
const ICONS: Record<string, LucideIcon> = {
  CloudUpload,
  Settings,
  ShieldHalf,
  ClipboardList,
  ChartBar: BarChart3,
  SwitchHorizontal: ArrowLeftRight,
  Users,
  Barbell: Dumbbell,
};

export default function FeatureIcon({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Settings;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
