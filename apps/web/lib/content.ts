// Copy de la landing de marca. Portado de
// apps/mobile src/components/landing/landing-content.js.

export const HERO = {
  eyebrow: "Plataforma de gestión para gimnasios y entrenadores",
  titleLead: "Gestioná tu gimnasio y tus",
  titleHighlight: "entrenamientos",
  titleTail: "en un solo lugar.",
  subtitle:
    "Planes personalizados, sesiones y seguimiento de tus socios — funcionando incluso sin internet y con la identidad visual de tu marca.",
  primaryCta: "Solicitar demo",
  secondaryCta: "Iniciar sesión",
  imageUri:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
};

export const NAV_LINKS = [
  { label: "Beneficios", href: "#features" },
  { label: "Para quién", href: "#segments" },
  { label: "Contacto", href: "#contact" },
];

export type FeatureIcon =
  | "CloudUpload"
  | "Settings"
  | "ShieldHalf"
  | "ClipboardList"
  | "ChartBar"
  | "SwitchHorizontal";

export const FEATURES: {
  icon: FeatureIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: "CloudUpload",
    title: "Funciona sin internet",
    description:
      "Offline-first: registrá sesiones y planes incluso sin señal. Todo se sincroniza solo cuando vuelve la conexión.",
  },
  {
    icon: "Settings",
    title: "Tu marca, tu identidad",
    description:
      "White-label: logo y colores propios de cada gimnasio. La app se adapta a tu marca, no al revés.",
  },
  {
    icon: "ShieldHalf",
    title: "Roles y permisos",
    description:
      "Dueño, administrador, coach y socio. Cada persona ve y hace exactamente lo que le corresponde.",
  },
  {
    icon: "ClipboardList",
    title: "Planes y sesiones completos",
    description:
      "Armá planes por semana, día, ejercicio y serie. Catálogo de ejercicios con fotos y videos por gimnasio.",
  },
  {
    icon: "ChartBar",
    title: "Seguimiento de progreso",
    description:
      "Historial de sesiones completadas y métricas para que cada socio vea su evolución entrenamiento a entrenamiento.",
  },
  {
    icon: "SwitchHorizontal",
    title: "Varios gimnasios, una cuenta",
    description:
      "Una sola cuenta puede pertenecer a múltiples gimnasios y cambiar entre ellos al instante.",
  },
];

export type SegmentIcon = "Users" | "Barbell";

export const SEGMENTS: {
  icon: SegmentIcon;
  title: string;
  description: string;
  points: string[];
}[] = [
  {
    icon: "Users",
    title: "Para gimnasios",
    description:
      "Centralizá socios, staff y entrenamientos en una sola plataforma con tu marca.",
    points: [
      "Gestión de socios y staff con roles",
      "Catálogo de ejercicios y equipamiento propio",
      "Branding del gimnasio en toda la app",
    ],
  },
  {
    icon: "Barbell",
    title: "Para profes y personal trainers",
    description:
      "Creá planes a medida para cada cliente y registrá sus sesiones, estés donde estés.",
    points: [
      "Planes 100% personalizados por cliente",
      "Registro de sesiones incluso sin WiFi",
      "Seguimiento del progreso de cada persona",
    ],
  },
];

export const CTA = {
  title: "¿Listo para profesionalizar tu gestión?",
  subtitle:
    "Te acompañamos en la puesta en marcha. Escribinos y coordinamos una demo sin compromiso.",
  primary: "Solicitar demo",
};
