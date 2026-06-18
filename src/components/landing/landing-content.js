// Contenido / copy de la landing pública (solo web).
// Centralizado acá para mantener el JSX de las secciones limpio.

// --- Marca ---
export const BRAND_NAME = "GymTrack";

// --- Contacto / CTA ---
// TODO: reemplazar por los datos reales de contacto del negocio.
export const CONTACT_EMAIL = "contacto@gymtrack.ar";
export const CONTACT_WHATSAPP = "5492262573568"; // formato internacional sin "+", para wa.me

export const CONTACT_SUBJECT = "Quiero una demo de GymTrack";
export const CONTACT_BODY =
  "Hola! Me interesa conocer GymTrack para mi gimnasio / mis clientes de entrenamiento personalizado.";

export const MAILTO_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  CONTACT_SUBJECT
)}&body=${encodeURIComponent(CONTACT_BODY)}`;

export const WHATSAPP_HREF = `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(
  CONTACT_BODY
)}`;

// Imagen del hero (placeholder; reemplazable por un mockup real de la app).
export const HERO_IMAGE_URI =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80";

// --- Navbar: anclas de navegación ---
export const NAV_LINKS = [
  { label: "Beneficios", target: "features" },
  { label: "Para quién", target: "segments" },
  { label: "Contacto", target: "contact" },
];

// --- Hero ---
export const HERO = {
  eyebrow: "Plataforma de gestión para gimnasios y entrenadores",
  titleLead: "Gestioná tu gimnasio y tus",
  titleHighlight: "entrenamientos",
  titleTail: "en un solo lugar.",
  subtitle:
    "Planes personalizados, sesiones y seguimiento de tus socios — funcionando incluso sin internet y con la identidad visual de tu marca.",
  primaryCta: "Solicitar demo",
  secondaryCta: "Iniciar sesión",
};

// --- Features / beneficios (Parte 2) ---
export const FEATURES = [
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

// --- Segmentos (Parte 3) ---
export const SEGMENTS = [
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

// --- CTA final ---
export const CTA = {
  title: "¿Listo para profesionalizar tu gestión?",
  subtitle:
    "Te acompañamos en la puesta en marcha. Escribinos y coordinamos una demo sin compromiso.",
  primary: "Solicitar demo",
};
