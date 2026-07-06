import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Phone, Mail, Instagram, ArrowRight, Dumbbell } from "lucide-react";
import { getPublicGym, instagramUrl, type PublicGym } from "@/lib/gym";
import { mediaUrl } from "@/lib/media";
import {
  BRAND,
  SITE_URL,
  gymLoginHref,
  gymPublicUrl,
} from "@/lib/site";

// ISR: la página se renderiza on-demand y se cachea. Un gym nuevo aparece en su
// primera visita sin rebuild; el cache se refresca cada hora (o por revalidación
// on-demand desde la edge function al editar el gym).
export const revalidate = 3600;
export const dynamicParams = true;

const DEFAULT_PRIMARY = "#4A44E4";
const DEFAULT_ACCENT = "#2DD4BF";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gym = await getPublicGym(slug);
  if (!gym) return { title: "Gimnasio no encontrado", robots: { index: false } };

  const url = gymPublicUrl(slug);
  const title = gym.name;
  const description = `${gym.name} · Entrenamientos, planes y seguimiento con ${BRAND.name}. Ingresá a tu cuenta o pedí información.`;
  const logo = mediaUrl(gym.logo_url);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: logo ? [{ url: logo }] : undefined,
    },
  };
}

function JsonLd({ gym, url }: { gym: PublicGym; url: string }) {
  const logo = mediaUrl(gym.logo_url);
  const ig = instagramUrl(gym.instagram);
  const data = {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: gym.name,
    url,
    ...(logo ? { logo, image: logo } : {}),
    ...(gym.address ? { address: gym.address } : {}),
    ...(gym.phone ? { telephone: gym.phone } : {}),
    ...(gym.email ? { email: gym.email } : {}),
    ...(ig ? { sameAs: [ig] } : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function GymPage({ params }: Props) {
  const { slug } = await params;
  const gym = await getPublicGym(slug);
  if (!gym) notFound();

  const primary = gym.theme_primary || DEFAULT_PRIMARY;
  const accent = gym.theme_accent || DEFAULT_ACCENT;
  const logo = mediaUrl(gym.logo_url);
  const ig = instagramUrl(gym.instagram);
  const url = gymPublicUrl(slug);

  const contacts = [
    gym.address && { icon: MapPin, label: gym.address, href: undefined },
    gym.phone && {
      icon: Phone,
      label: gym.phone,
      href: `tel:${gym.phone.replace(/\s/g, "")}`,
    },
    gym.email && {
      icon: Mail,
      label: gym.email,
      href: `mailto:${gym.email}`,
    },
    ig && {
      icon: Instagram,
      label: gym.instagram?.startsWith("@") ? gym.instagram : `@${slug}`,
      href: ig,
    },
  ].filter(Boolean) as {
    icon: typeof MapPin;
    label: string;
    href?: string;
  }[];

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: `linear-gradient(160deg, ${primary} 0%, #0C0B14 65%)`,
      }}
    >
      <JsonLd gym={gym} url={url} />

      {/* Header con branding del gym */}
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          {logo ? (
            <Image
              src={logo}
              alt={`Logo de ${gym.name}`}
              width={44}
              height={44}
              className="rounded-xl bg-white/10 object-contain"
            />
          ) : (
            <span className="rounded-xl border border-white/20 bg-white/15 p-2.5">
              <Dumbbell size={22} aria-hidden="true" />
            </span>
          )}
          <span className="font-jakarta text-xl font-extrabold tracking-tight">
            {gym.name}
          </span>
        </div>
        <a
          href={gymLoginHref(slug)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-manrope text-sm font-bold transition hover:opacity-90"
          style={{ backgroundColor: accent, color: "#0C0B14" }}
        >
          Ingresar <ArrowRight size={16} aria-hidden="true" />
        </a>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-6">
        {/* Hero */}
        <section className="py-16 lg:py-24">
          <h1 className="max-w-[760px] font-jakarta text-4xl font-extrabold leading-tight tracking-tight lg:text-6xl">
            Entrená en{" "}
            <span style={{ color: accent }}>{gym.name}</span>
          </h1>
          <p className="mt-6 max-w-[560px] font-manrope text-lg leading-relaxed text-white/80">
            Tus planes, tus sesiones y tu progreso en un solo lugar. Accedé a tu
            cuenta para entrenar con el seguimiento de {gym.name}.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={gymLoginHref(slug)}
              className="flex items-center gap-2 rounded-2xl px-6 py-4 font-manrope text-base font-bold transition hover:opacity-90"
              style={{ backgroundColor: accent, color: "#0C0B14" }}
            >
              Ingresar a mi cuenta <ArrowRight size={18} aria-hidden="true" />
            </a>
            {gym.email && (
              <a
                href={`mailto:${gym.email}`}
                className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-manrope text-base font-bold transition hover:bg-white/10"
              >
                Quiero información
              </a>
            )}
          </div>
        </section>

        {/* Contacto */}
        {contacts.length > 0 && (
          <section className="pb-16">
            <h2 className="mb-5 font-jakarta text-sm font-bold uppercase tracking-widest text-white/60">
              Contacto
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {contacts.map((c) => {
                const Inner = (
                  <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <c.icon
                      size={20}
                      style={{ color: accent }}
                      aria-hidden="true"
                    />
                    <span className="font-manrope text-[15px] text-white/90">
                      {c.label}
                    </span>
                  </span>
                );
                return (
                  <li key={c.label}>
                    {c.href ? (
                      <a
                        href={c.href}
                        target={c.href.startsWith("http") ? "_blank" : undefined}
                        rel={
                          c.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        className="block transition hover:opacity-90"
                      >
                        {Inner}
                      </a>
                    ) : (
                      Inner
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
          <p className="font-manrope text-xs text-white/50">
            © {new Date().getFullYear()} {gym.name}
          </p>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-manrope text-xs text-white/50 transition hover:text-white/80"
          >
            Potenciado por {BRAND.name}
          </a>
        </div>
      </footer>
    </div>
  );
}
