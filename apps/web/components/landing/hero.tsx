import Image from "next/image";
import { Flame, ArrowRight } from "lucide-react";
import { HERO } from "@/lib/content";
import { MAILTO_HREF } from "@/lib/site";

export default function Hero() {
  return (
    <section id="top" className="w-full overflow-hidden">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16 lg:py-24">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:justify-between">
          <div className="w-full max-w-[560px] text-center lg:flex-1 lg:text-left">
            <span className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5">
              <Flame size={16} className="text-brandSecondary-300" aria-hidden="true" />
              <span className="ml-2 font-manrope text-xs font-bold tracking-wide text-brandPrimary-200">
                {HERO.eyebrow}
              </span>
            </span>

            <h1 className="font-jakarta text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-6xl">
              {HERO.titleLead}{" "}
              <span className="text-brandSecondary-300">{HERO.titleHighlight}</span>{" "}
              {HERO.titleTail}
            </h1>

            <p className="mt-6 font-manrope text-lg leading-relaxed text-brandPrimary-100">
              {HERO.subtitle}
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href={MAILTO_HREF}
                className="flex items-center rounded-2xl border border-white/20 bg-brandPrimary-700 px-6 py-4 font-manrope text-base font-bold text-white transition hover:bg-brandPrimary-600"
              >
                <span className="mr-2">{HERO.primaryCta}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a
                href="/login"
                className="rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-manrope text-base font-bold text-white transition hover:bg-white/10"
              >
                {HERO.secondaryCta}
              </a>
            </div>
          </div>

          <div className="w-full max-w-[480px] lg:max-w-[520px] lg:flex-1">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={HERO.imageUri}
                  alt="Vista de la app GymTrack en uso durante un entrenamiento"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(74,68,228,0.15), rgba(30,27,75,0.55))",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
