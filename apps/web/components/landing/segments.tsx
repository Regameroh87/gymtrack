import { CheckCircle2 } from "lucide-react";
import FeatureIcon from "./feature-icon";
import { SEGMENTS } from "@/lib/content";

export default function Segments() {
  return (
    <section id="segments" className="w-full">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20">
        <div className="mb-14 flex flex-col items-center">
          <p className="mb-3 font-manrope text-sm font-bold uppercase tracking-widest text-brandSecondary-300">
            Para quién
          </p>
          <h2 className="max-w-[640px] text-center font-jakarta text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Pensado para gimnasios y entrenadores
          </h2>
        </div>

        <div className="flex w-full flex-col gap-6 lg:flex-row">
          {SEGMENTS.map((segment) => (
            <article
              key={segment.title}
              className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className="mb-5 flex items-center">
                <span className="mr-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brandSecondary-400/30 bg-brandSecondary-400/15">
                  <FeatureIcon
                    name={segment.icon}
                    size={24}
                    className="text-brandSecondary-300"
                  />
                </span>
                <h3 className="font-jakarta text-2xl font-extrabold tracking-tight text-white">
                  {segment.title}
                </h3>
              </div>

              <p className="mb-6 font-manrope text-base leading-relaxed text-brandPrimary-200">
                {segment.description}
              </p>

              <ul className="flex flex-col gap-3">
                {segment.points.map((point) => (
                  <li key={point} className="flex items-center">
                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-brandSecondary-300"
                      aria-hidden="true"
                    />
                    <span className="ml-3 font-manrope text-[15px] text-white">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
