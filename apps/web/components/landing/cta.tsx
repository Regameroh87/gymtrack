import Link from "next/link";
import { Mail, Phone, ArrowRight } from "lucide-react";
import { CTA } from "@/lib/content";
import { CONTACT, MAILTO_HREF, WHATSAPP_HREF } from "@/lib/site";

export default function Cta({ signupEnabled = false }: { signupEnabled?: boolean }) {
  return (
    <section id="contact" className="w-full">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-16">
        <div
          className="overflow-hidden rounded-[32px] border border-brandPrimary-700/40 px-8 py-14"
          style={{
            background:
              "linear-gradient(135deg, #3023cd, #4a44e4)",
          }}
        >
          <div className="flex flex-col items-center">
            <h2 className="max-w-[640px] text-center font-jakarta text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
              {CTA.title}
            </h2>
            <p className="mt-4 max-w-[560px] text-center font-manrope text-lg leading-relaxed text-brandPrimary-100">
              {CTA.subtitle}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {signupEnabled && (
                <Link
                  href="/registro"
                  className="flex items-center rounded-2xl bg-white px-6 py-4 font-manrope text-base font-bold text-brandPrimary-600 transition hover:scale-[1.02]"
                >
                  <span className="mr-2">Creá tu gimnasio gratis</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              )}
              <a
                href={MAILTO_HREF}
                className={
                  signupEnabled
                    ? "flex items-center rounded-2xl border border-white/30 bg-white/10 px-6 py-4 font-manrope text-base font-bold text-white transition hover:bg-white/20"
                    : "flex items-center rounded-2xl bg-white px-6 py-4 font-manrope text-base font-bold text-brandPrimary-600 transition hover:scale-[1.02]"
                }
              >
                <Mail size={18} aria-hidden="true" />
                <span className="mx-2">{CTA.primary}</span>
                {!signupEnabled && <ArrowRight size={18} aria-hidden="true" />}
              </a>
              <a
                href={WHATSAPP_HREF}
                className="flex items-center rounded-2xl border border-white/30 bg-white/10 px-6 py-4 font-manrope text-base font-bold text-white transition hover:bg-white/20"
              >
                <Phone size={18} aria-hidden="true" />
                <span className="ml-2">WhatsApp</span>
              </a>
            </div>

            <a
              href={MAILTO_HREF}
              className="mt-6 font-manrope text-sm text-brandPrimary-100 underline"
            >
              {CONTACT.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
