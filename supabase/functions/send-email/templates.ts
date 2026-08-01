// Templates de mail transaccional, branded por gym. El render vive acá (no en los
// callers) para tener una sola fuente de verdad de branding + copy. send-email
// resuelve los colores/logo del gym y se los pasa a renderEmail().

// `data` es abierto por template: cada uno declara acá los campos que espera
// (ver dunning_reminder más abajo). No hay un tipo genérico Record<string,
// unknown> a propósito — eso perdería el chequeo de qué campo usa cada uno.
export type EmailContext = {
  gymName: string;
  primary: string; // hex; default plataforma #4A44E4
  accent: string; // hex; default plataforma #2DD4BF
  logoUrl: string | null; // URL pública del logo (Supabase Storage), o null
  appUrl: string;
  data?: {
    name?: string | null;
    // dunning_reminder: copy YA RESUELTO por el caller (variables del owner
    // sustituidas). heading y body llegan en texto plano — acá se escapan y
    // los \n se convierten en <br>, así el owner nunca inyecta HTML crudo en
    // un mail que sale a nombre del gym.
    heading?: string;
    body?: string;
    ctaLabel?: string;
    /** Sin este campo no hay botón, aunque el owner lo haya pedido: es lo que
     *  hace condicional el link de pago (sin cuenta de MP conectada, o con el
     *  toggle apagado, el mail sale igual pero sin botón). */
    payUrl?: string | null;
    items?: { label: string; amount: string }[];
    total?: string;
    dueDate?: string;
  };
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
//
// ctaLabel es OPCIONAL: sin él no se renderiza ningún botón. Es lo que permite
// el mail de cobranza sin link de pago (el owner apagó el botón, o el gym no
// tiene MercadoPago conectado) sin que el layout deje un botón roto o vacío.
// ctaHref default a appUrl para no tocar los templates existentes, que siempre
// apuntan ahí.
function baseLayout(
  ctx: EmailContext,
  opts: { heading: string; bodyHtml: string; ctaLabel?: string; ctaHref?: string; extraHtml?: string },
): string {
  const { gymName, primary, accent, logoUrl, appUrl } = ctx;
  const safeName = escapeHtml(gymName);

  const brandMark = logoUrl
    ? `<div style="display:inline-block;background:#ffffff;border-radius:12px;padding:8px 14px;">
         <img src="${logoUrl}" alt="${safeName}" height="32" style="height:32px;display:block;border:0;" />
       </div>`
    : `<span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">${safeName}</span>`;

  const ctaHtml = opts.ctaLabel
    ? `<a href="${opts.ctaHref ?? appUrl}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:700;font-size:15px;">
         ${opts.ctaLabel}
       </a>`
    : "";

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
          ${opts.extraHtml ?? ""}
          ${ctaHtml}
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

  // Recordatorio de cuota vencida. heading/body los escribe el owner desde el
  // canvas de /admin/cobranza como TEXTO PLANO (nunca HTML): acá es donde se
  // escapan y se convierten los \n a <br>, así esta es la ÚNICA puerta por la
  // que sale el mail y el owner no puede colar HTML crudo sin importar qué
  // caller lo invoque (el job diario o el botón "Enviar prueba" del panel).
  //
  // El botón es condicional a `payUrl`: sin ese campo no hay CTA, aunque el
  // owner haya prendido "incluir botón de pago" en el step — es lo que decide
  // si en verdad hay una preferencia de MP creada (gym con cuenta conectada y
  // cobros habilitados) o no.
  dunning_reminder: (ctx) => {
    const d = ctx.data ?? {};
    const heading = d.heading ? escapeHtml(d.heading) : `Tu cuota de ${escapeHtml(ctx.gymName)} está vencida`;
    const bodyText = escapeHtml(d.body ?? "").replace(/\n/g, "<br>");

    const items = d.items ?? [];
    const detailHtml = items.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #ececf2;border-radius:10px;overflow:hidden;">
          ${items.map((it, i) => `
            <tr style="${i % 2 ? "background:#fafafb;" : ""}">
              <td style="padding:9px 12px;font-size:13px;color:#44444f;">${escapeHtml(it.label)}</td>
              <td style="padding:9px 12px;font-size:13px;color:#1c1c24;font-weight:700;text-align:right;">${escapeHtml(it.amount)}</td>
            </tr>`).join("")}
          <tr style="background:#f4f4f7;">
            <td style="padding:10px 12px;font-size:13px;color:#1c1c24;font-weight:800;">Total</td>
            <td style="padding:10px 12px;font-size:13px;color:#1c1c24;font-weight:800;text-align:right;">${escapeHtml(d.total ?? "")}</td>
          </tr>
        </table>`
      : "";

    return {
      subject: `Tu cuota de ${ctx.gymName} está vencida`,
      html: baseLayout(ctx, {
        heading,
        bodyHtml: `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#44444f;">${bodyText}</p>`,
        extraHtml: detailHtml,
        ctaLabel: d.payUrl ? (d.ctaLabel || "Pagar mi cuota") : undefined,
        ctaHref: d.payUrl ?? undefined,
      }),
    };
  },
};

export function renderEmail(type: string, ctx: EmailContext): RenderedEmail | null {
  const tpl = TEMPLATES[type];
  return tpl ? tpl(ctx) : null;
}
