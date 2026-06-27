import { Dumbbell } from "lucide-react";

const BG_IMAGE_URI = "/bg-auth.webp";

const OVERLAY =
  "linear-gradient(to bottom, rgba(74, 68, 228, 0.55), rgba(12, 0, 106, 0.92))";

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
    <div className="relative flex min-h-screen flex-row">
      {/* ── Fondo completo (visible en mobile, oculto en lg donde el panel izq lo tapa) ── */}
      <div className="absolute inset-0 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG_IMAGE_URI}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: OVERLAY }} />
      </div>

      {/* ── PANEL IZQUIERDO — imagen + overlay + frase (solo desktop) ── */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG_IMAGE_URI}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: OVERLAY }} />

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

      {/* ── PANEL DERECHO — form ── */}
      {/* Mobile: transparente sobre la imagen. Desktop: superficie oscura sólida */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 lg:bg-[#1c1c24]">
        <div className="w-full max-w-[440px]">
          <div className="auth-card-mobile">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthCompactBrand() {
  return (
    <div className="mb-8 flex flex-col items-center lg:hidden">
      <div className="mb-4 rounded-full border border-white/20 bg-white/15 p-3">
        <Dumbbell color="#ffffff" size={32} />
      </div>
      <span className="font-jakarta text-3xl font-extrabold tracking-tight text-white">
        GymTrack
      </span>
    </div>
  );
}
