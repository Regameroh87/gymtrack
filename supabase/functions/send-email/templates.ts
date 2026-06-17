// Templates de mail transaccional, branded por gym. El render vive acá (no en los
// callers) para tener una sola fuente de verdad de branding + copy. send-email
// resuelve los colores/logo del gym y se los pasa a renderEmail().

export type EmailContext = {
  gymName: string;
  primary: string; // hex; default plataforma #4A44E4
  accent: string; // hex; default plataforma #2DD4BF
  logoUrl: string | null; // URL Cloudinary ya construida, o null
  appUrl: string;
  data?: { name?: string | null };
};

export type RenderedEmail = { subject: string; html: string };

// Iniciales del gym para el fallback sin logo (igual criterio que GymLogo).
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Wrapper común: header con band en primary (logo en chip blanco si hay, si no
// wordmark con el nombre), borde superior accent, cuerpo blanco y CTA en primary.
function baseLayout(
  ctx: EmailContext,
  opts: { heading: string; bodyHtml: string; ctaLabel: string },
): string {
  const { gymName, primary, accent, logoUrl, appUrl } = ctx;
  const safeName = escapeHtml(gymName);

  const brandMark = logoUrl
    ? `<div style="display:inline-block;background:#ffffff;border-radius:12px;padding:8px 14px;">
         <img src="${logoUrl}" alt="${safeName}" height="32" style="height:32px;display:block;border:0;" />
       </div>`
    : `<span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">${safeName}</span>`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1c24;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border-top:4px solid ${accent};">
        <tr><td style="background:${primary};padding:24px 32px;">
          ${brandMark}
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#1c1c24;">${opts.heading}</h1>
          ${opts.bodyHtml}
          <a href="${appUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700;font-size:15px;">
            ${opts.ctaLabel}
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#9a9aa5;">
            Si no esperabas este mail, podés ignorarlo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function greeting(name?: string | null): string {
  const first = name?.trim().split(" ")[0];
  return first ? `¡Hola ${escapeHtml(first)}! ` : "";
}

// Registry de templates por tipo. Agregar tipos nuevos acá.
const TEMPLATES: Record<string, (ctx: EmailContext) => RenderedEmail> = {
  welcome_member: (ctx) => ({
    subject: `Te sumaron a ${ctx.gymName}`,
    html: baseLayout(ctx, {
      heading: `¡Te sumaron a ${escapeHtml(ctx.gymName)}!`,
      bodyHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44444f;">
        ${greeting(ctx.data?.name)}Ya formás parte de <strong>${escapeHtml(ctx.gymName)}</strong> en GymTrack.
        Para ingresar, entrá con tu email y te enviaremos un código de acceso (no necesitás contraseña).
      </p>`,
      ctaLabel: "Ingresar a GymTrack",
    }),
  }),

  welcome_owner: (ctx) => ({
    subject: `Tu gimnasio ${ctx.gymName} está listo`,
    html: baseLayout(ctx, {
      heading: `¡${escapeHtml(ctx.gymName)} ya está en GymTrack!`,
      bodyHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44444f;">
        ${greeting(ctx.data?.name)}Creamos tu gimnasio <strong>${escapeHtml(ctx.gymName)}</strong> y te dejamos como dueño.
        Para empezar a gestionarlo, entrá con tu email y te enviaremos un código de acceso (no necesitás contraseña).
      </p>`,
      ctaLabel: "Ingresar a GymTrack",
    }),
  }),
};

export function renderEmail(type: string, ctx: EmailContext): RenderedEmail | null {
  const tpl = TEMPLATES[type];
  return tpl ? tpl(ctx) : null;
}
