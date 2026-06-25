// Placeholder reutilizable para secciones de plataforma aún no construidas
// (Usuarios globales, Facturación/suscripciones, Ajustes). Port a Next del
// PlatformPlaceholder de Expo: hero con gradiente del brand default + grilla de
// features "próximamente". Sin theming por gym: plataforma usa el brand default.

import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  sub: string;
  color: string;
  bubble: string;
};

type PlatformPlaceholderProps = {
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  features?: Feature[];
};

export function PlatformPlaceholder({
  kicker,
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  features = [],
}: PlatformPlaceholderProps) {
  return (
    <div className="p-9 pb-14">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
              Plataforma
            </span>
            <span className="text-[11px] text-gray-400">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandSecondary-500">
              {kicker}
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-1 font-manrope text-xs text-gray-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2">
          <Lock size={12} className="text-gray-400" />
          <span className="font-manrope text-xs font-semibold uppercase tracking-wider text-gray-400">
            Próximamente
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-[22px] bg-gradient-to-br from-brandPrimary-800 via-brandPrimary-600 to-brandPrimary-400 p-9">
        <div className="absolute -right-16 -top-16 h-[220px] w-[220px] rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-[60px] right-[120px] h-[160px] w-[160px] rounded-full bg-white/[0.04]" />

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brandSecondary-400" />
              <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-white/65">
                Módulo en construcción
              </span>
            </div>
            <p className="mb-2.5 font-jakarta text-[30px] font-bold tracking-tight text-white">
              {title}
            </p>
            <p className="max-w-[440px] font-manrope text-[13px] leading-5 text-white/55">
              {description}
            </p>
          </div>

          <div className="ml-8 flex flex-col items-center justify-center rounded-[22px] border border-white/10 bg-white/10 p-7">
            <Icon size={40} color="rgba(255,255,255,0.9)" />
            <span className="mt-2 font-manrope text-[9px] font-semibold uppercase tracking-widest text-white/55">
              {badge}
            </span>
          </div>
        </div>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <>
          <p className="mb-3 font-manrope text-[10px] font-semibold uppercase tracking-[1.5px] text-gray-400">
            Qué traerá esta sección
          </p>
          <div className="grid grid-cols-2 gap-3.5">
            {features.map((f) => {
              const FIcon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-[16px] border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl ${f.bubble}`}
                    >
                      <FIcon size={18} color={f.color} />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-jakarta text-[14px] font-bold tracking-tight text-gray-900">
                          {f.title}
                        </span>
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-manrope text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          Soon
                        </span>
                      </div>
                      <p className="font-manrope text-[11px] leading-4 text-gray-400">
                        {f.sub}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
