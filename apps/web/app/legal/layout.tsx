// Layout de las páginas legales: prosa sobria, pública (sin auth), legible.
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-2xl px-6 py-14">
        <Link
          href="/"
          className="font-jakarta text-sm font-bold tracking-tight text-brandPrimary-600"
        >
          GymTrack
        </Link>
        <article className="prose-sm mt-8 font-manrope text-[14px] leading-relaxed text-ui-text-main [&_h1]:font-jakarta [&_h1]:text-[26px] [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:font-jakarta [&_h2]:text-[17px] [&_h2]:font-bold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </article>
      </main>
    </div>
  );
}
