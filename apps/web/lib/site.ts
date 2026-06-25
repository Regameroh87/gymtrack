// Configuración central del sitio público. Lee de env con defaults seguros para
// build/local. El dominio raíz se usa para resolver subdominios de gym.

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "gymtrack.ar";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gymtrack.ar"
).replace(/\/$/, "");

export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.gymtrack.ar"
).replace(/\/$/, "");

export const BRAND = {
  name: "GymTrack",
  description:
    "Gestioná tu gimnasio y tus entrenamientos en un solo lugar: planes personalizados, sesiones y seguimiento de socios, funcionando incluso sin internet y con la identidad visual de tu marca.",
};

// TODO: confirmar datos de contacto reales del negocio.
export const CONTACT = {
  email: "contacto@gymtrack.ar",
  whatsapp: "5492262573568", // formato internacional sin "+", para wa.me
  subject: "Quiero una demo de GymTrack",
  body: "Hola! Me interesa conocer GymTrack para mi gimnasio / mis clientes de entrenamiento personalizado.",
};

export const MAILTO_HREF = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
  CONTACT.subject
)}&body=${encodeURIComponent(CONTACT.body)}`;

export const WHATSAPP_HREF = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
  CONTACT.body
)}`;

// URL del login de la app autenticada (Expo) para un gym puntual.
export const gymLoginHref = (slug: string) =>
  `${APP_URL}/login?gym=${encodeURIComponent(slug)}`;

// URL pública (subdominio) de un gym.
export const gymPublicUrl = (slug: string) => {
  const proto = SITE_URL.startsWith("https") ? "https" : "http";
  return `${proto}://${slug}.${ROOT_DOMAIN}`;
};
