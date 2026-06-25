import Link from "next/link";
import { Dumbbell, ArrowRight } from "lucide-react";
import { NAV_LINKS } from "@/lib/content";
import { BRAND, MAILTO_HREF } from "@/lib/site";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-brandPrimary-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center" aria-label={BRAND.name}>
          <span className="mr-2.5 rounded-xl border border-white/20 bg-white/15 p-2">
            <Dumbbell size={20} className="text-white" aria-hidden="true" />
          </span>
          <span className="font-jakarta text-lg font-extrabold tracking-tight text-white">
            {BRAND.name}
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-manrope text-base text-brandPrimary-200 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 font-manrope text-sm font-bold text-white transition hover:bg-white/10 md:px-4 md:py-2.5"
          >
            Iniciar sesión
          </Link>
          <a
            href={MAILTO_HREF}
            className="flex items-center rounded-xl border border-white/20 bg-brandPrimary-700 px-3 py-2 font-manrope text-sm font-bold text-white transition hover:bg-brandPrimary-600 md:px-4 md:py-2.5"
          >
            <span className="mr-1.5">Solicitar demo</span>
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}
