// Layout de las pantallas de autenticación (login / verify). Contenedor centrado
// con la firma de marca; sin sidebar ni sesión (estas rutas son públicas).

import { BRAND } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-brandPrimary-950">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="font-jakarta text-2xl font-extrabold tracking-tight text-white">
              {BRAND.name}
            </span>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-black/20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
