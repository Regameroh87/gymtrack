// Shell de dos paneles de las pantallas de auth (login / verify). Clon del layout
// de apps/mobile/app/(auth)/login.web.jsx y verify.web.jsx: panel izquierdo con imagen
// + gradiente + branding + titular + frase (solo en desktop), panel derecho con el form.

// Librerías
import { Dumbbell } from "lucide-react";

// Imagen de fondo del panel izquierdo (misma que usa Expo).
const BG_IMAGE_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDoyQqhQRW3b2Vbr6hJyuoRkX5vGZxxyBkrnNT_8WqhkfME9l9LkLhUA_C3_k6XtyLFePmcWfsBWScKNkQmyFoSMiuWg66Dt48saP_-i2wjNYcKhOaQbBimLgaEdmin3fHsBW_-jYlb8LWwiu0WzBxde3FVh2kpvj-60rFmKDkx_4ZV6E9X1Dccci4F6HNjQKYp2TGbf-EHgPMdHlEmF7F1sujc9BfVeJY119gwEa-sQ7imnUfz3ziFPUO-LIL9C-WMtmaeGFAr9gfD";

export function AuthSplit({
  heading,
  subtitle,
  children,
}: {
  heading: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-row bg-[#0c006a]">
      {/* PANEL IZQUIERDO — imagen + overlay + frase (solo desktop) */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG_IMAGE_URI}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(74, 68, 228, 0.55), rgba(12, 0, 106, 0.92))",
          }}
        />

        <div className="relative flex flex-1 flex-col justify-between p-16">
          <div className="flex flex-row items-center">
            <div className="mr-3 rounded-2xl border border-white/20 bg-white/15 p-3">
              <Dumbbell color="#ffffff" size={24} />
            </div>
            <span className="font-jakarta text-xl font-extrabold tracking-tight text-white">
              GymTrack
            </span>
          </div>

          <div className="max-w-[520px]">
            <h2 className="whitespace-pre-line font-jakarta text-5xl font-extrabold leading-tight tracking-tight text-white">
              {heading}
            </h2>
            <p className="mt-6 font-manrope text-lg leading-relaxed text-[#e2dfff]">
              {subtitle}
            </p>
          </div>

          <div className="max-w-[520px] border-l-2 border-[#2DD4BF] pl-4">
            <p className="font-manrope text-base italic leading-relaxed text-white">
              &quot;La disciplina es el puente entre las metas y los logros.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO — form */}
      <div className="flex flex-1 items-center justify-center bg-[#1c1c24] px-6 py-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}

// Branding compacto que se muestra arriba del form cuando no hay panel izquierdo
// (mobile). Clon del bloque !isWide de Expo.
export function AuthCompactBrand() {
  return (
    <div className="mb-10 flex flex-col items-center lg:hidden">
      <div className="mb-4 rounded-full border border-[#4a44e4]/30 bg-[#4a44e4]/20 p-3">
        <Dumbbell color="#ffffff" size={32} />
      </div>
      <span className="font-jakarta text-3xl font-extrabold tracking-tight text-white">
        GymTrack
      </span>
    </div>
  );
}
