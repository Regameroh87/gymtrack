import { Dumbbell } from "lucide-react";
import { NAV_LINKS } from "@/lib/content";
import { BRAND, MAILTO_HREF, APP_URL } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/10 bg-brandPrimary-950">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-[320px]">
            <div className="mb-3 flex items-center">
              <span className="mr-2.5 rounded-xl border border-white/20 bg-white/15 p-2">
                <Dumbbell size={18} className="text-white" aria-hidden="true" />
              </span>
              <span className="font-jakarta text-lg font-extrabold tracking-tight text-white">
                {BRAND.name}
              </span>
            </div>
            <p className="font-manrope text-sm leading-relaxed text-brandPrimary-200">
              Gestión de gimnasios y entrenamientos personalizados. Offline-first
              y con la identidad de tu marca.
            </p>
          </div>

          <nav className="flex flex-col gap-3" aria-label="Navegación del pie">
            <p className="mb-1 font-manrope text-sm font-bold text-white">
              Navegación
            </p>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-manrope text-sm text-brandPrimary-200 transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            <p className="mb-1 font-manrope text-sm font-bold text-white">
              Empezá
            </p>
            <a
              href={MAILTO_HREF}
              className="font-manrope text-sm text-brandPrimary-200 transition hover:text-white"
            >
              Solicitar demo
            </a>
            <a
              href={`${APP_URL}/login`}
              className="font-manrope text-sm text-brandPrimary-200 transition hover:text-white"
            >
              Iniciar sesión
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center font-manrope text-xs text-brandPrimary-200/60">
            © {year} {BRAND.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
