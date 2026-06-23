import FeatureIcon from "./feature-icon";
import { FEATURES } from "@/lib/content";

export default function Features() {
  return (
    <section id="features" className="w-full">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20">
        <div className="mb-14 flex flex-col items-center">
          <p className="mb-3 font-manrope text-sm font-bold uppercase tracking-widest text-brandSecondary-300">
            Beneficios
          </p>
          <h2 className="max-w-[640px] text-center font-jakarta text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Todo lo que tu gimnasio necesita, sin fricciones
          </h2>
          <p className="mt-4 max-w-[560px] text-center font-manrope text-base leading-relaxed text-brandPrimary-200">
            Una plataforma pensada para que entrenadores y socios trabajen en
            sintonía, sesión tras sesión.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="h-full rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:border-brandPrimary-700/40 hover:bg-white/[0.08]"
            >
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brandPrimary-700/30 bg-brandPrimary-700/20">
                <FeatureIcon
                  name={feature.icon}
                  size={24}
                  className="text-brandSecondary-300"
                />
              </span>
              <h3 className="mb-2.5 font-jakarta text-xl font-bold text-white">
                {feature.title}
              </h3>
              <p className="font-manrope text-[15px] leading-relaxed text-brandPrimary-200">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
