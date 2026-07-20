"use client";

// Helpers de formulario compartidos por crear/editar gimnasio. Portados de
// apps/mobile platform/gyms/_form.jsx a HTML/Tailwind (sin react-native ni
// @tanstack/react-form): inputs controlados clásicos + preview del header en vivo.

// React
import { type ReactNode } from "react";

// Iconos
import { Camera, ImageIcon } from "lucide-react";

// Helpers
import { HEX_RE, DEFAULT_PRIMARY } from "@/lib/gyms";
import { MediaImage } from "@/components/ui/media-image";

// Tokens de tamaño del logo del header → px (espeja HEADER_LOGO_PX de Expo).
const HEADER_LOGO_PX: Record<string, number> = { sm: 30, md: 40, lg: 48 };

// ── Campo etiquetado con error/hint ──
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-y-1.5">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-gray-400">
        {label}
      </span>
      {children}
      {error ? (
        <span className="font-manrope text-[11px] text-red-500">{error}</span>
      ) : hint ? (
        <span className="font-manrope text-[11px] text-gray-400">{hint}</span>
      ) : null}
    </div>
  );
}

// ── Input de texto con icono opcional ──
export function Input({
  icon,
  ...props
}: { icon?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
      {icon}
      <input
        {...props}
        className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

// ── Selector de color: swatch nativo + hex editable ──
export function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer border-none bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#4A44E4"
          autoCapitalize="none"
          className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>
    </Field>
  );
}

// ── Título de sección con número editorial ──
export function SectionTitle({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-brandPrimary-700">
        <span className="font-jakarta text-[12px] font-bold text-white">
          {step}
        </span>
      </div>
      <div className="flex-1">
        <p className="font-jakarta text-[15px] font-bold tracking-tight text-gray-900">
          {title}
        </p>
        {subtitle ? (
          <p className="font-manrope text-[11px] text-gray-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Control segmentado ──
export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-lg py-2 font-manrope text-[12px] font-bold transition ${
                active
                  ? "bg-brandPrimary-700 text-white"
                  : "text-gray-400 hover:bg-white"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// ── Switch on/off con label + hint ──
export function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left transition hover:bg-gray-50"
    >
      <span className="flex-1">
        <span className="block font-manrope text-[13px] font-bold text-gray-900">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block font-manrope text-[11px] text-gray-400">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className={`flex h-[24px] w-[42px] items-center rounded-full px-[3px] ${
          value ? "bg-brandPrimary-700" : "bg-gray-200"
        }`}
      >
        <span
          className={`h-[18px] w-[18px] rounded-full bg-white ${
            value ? "ml-auto" : ""
          }`}
        />
      </span>
    </button>
  );
}

// ── Par de pickers de logo (claro principal + oscuro opcional) ──
export function LogoPickers({
  logoUri,
  logoUriDark,
  onPickLight,
  onPickDark,
}: {
  logoUri: string | null;
  logoUriDark: string | null;
  onPickLight: () => void;
  onPickDark: () => void;
}) {
  return (
    <div className="flex justify-center gap-8">
      {/* Logo principal (light) */}
      <button
        type="button"
        onClick={onPickLight}
        className="flex flex-col items-center gap-3 transition hover:opacity-80"
      >
        <div className="relative">
          <MediaImage
            src={logoUri}
            alt="Logo principal"
            wrapperClassName="h-[88px] w-[88px] rounded-[22px]"
            fallback={
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px] border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50">
                <ImageIcon size={30} className="text-brandPrimary-500" />
              </div>
            }
          />
          <span className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-brandPrimary-700 p-2 shadow-sm">
            <Camera size={13} color="#fff" />
          </span>
        </div>
        <span className="flex flex-col items-center">
          <span className="font-manrope text-[13px] font-bold text-gray-900">
            Logo principal
          </span>
          <span className="font-manrope text-[11px] text-gray-400">
            Se usa en modo claro
          </span>
        </span>
      </button>

      {/* Logo oscuro (opcional) */}
      <button
        type="button"
        onClick={onPickDark}
        className="flex flex-col items-center gap-3 transition hover:opacity-80"
      >
        <div className="relative">
          <MediaImage
            src={logoUriDark}
            alt="Logo modo oscuro"
            wrapperClassName="h-[88px] w-[88px] rounded-[22px] bg-[#0F0D20]"
            fallback={
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px] border-2 border-dashed border-white/20 bg-[#0F0D20]">
                <ImageIcon size={30} color="rgba(255,255,255,0.55)" />
              </div>
            }
          />
          <span className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-brandPrimary-700 p-2 shadow-sm">
            <Camera size={13} color="#fff" />
          </span>
        </div>
        <span className="flex flex-col items-center">
          <span className="font-manrope text-[13px] font-bold text-gray-900">
            Logo modo oscuro
          </span>
          <span className="font-manrope text-[11px] text-gray-400">
            Opcional · cae al principal
          </span>
        </span>
      </button>
    </div>
  );
}

// ── Una barra de header (claro u oscuro) del preview ──
function PreviewBar({
  label,
  dark,
  logoUri,
  name,
  px,
  logoWidth,
  centered,
  content,
}: {
  label: string;
  dark: boolean;
  logoUri: string | null;
  name: string;
  px: number;
  logoWidth: number;
  centered: boolean;
  content: string;
}) {
  const textColor = dark ? "rgba(255,255,255,0.92)" : "#1a1a1a";

  const titleText = (
    <span
      className="truncate font-jakarta font-bold"
      style={{ fontSize: px * 0.5, color: textColor, maxWidth: "100%" }}
    >
      {name || "GYMTRACK"}
    </span>
  );

  let logoNode: ReactNode;
  if (content === "title" || !logoUri) {
    logoNode = titleText;
  } else {
    const isLogoTitle = content === "logo_title";
    const logoBox = Math.min(Math.round(px * 1.2), 50);
    const imgHeight = isLogoTitle ? logoBox : px;
    const boxWidth = isLogoTitle ? logoBox : logoWidth;
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUri}
        alt=""
        style={{
          height: imgHeight,
          width: boxWidth,
          objectFit: "contain",
          objectPosition: isLogoTitle || centered ? "center" : "left",
        }}
      />
    );
    logoNode = isLogoTitle ? (
      <div className="flex items-center" style={{ gap: 10, maxWidth: "100%" }}>
        {image}
        {name ? (
          <span
            className="truncate font-jakarta font-bold capitalize"
            style={{ fontSize: px * 0.42, color: textColor }}
          >
            {name}
          </span>
        ) : null}
      </div>
    ) : (
      image
    );
  }

  return (
    <div className="flex flex-col gap-y-1" style={{ width: "100%", maxWidth: 380 }}>
      <span className="font-manrope text-[9px] font-bold uppercase tracking-[1.2px] text-gray-400">
        {label}
      </span>
      <div
        className="overflow-hidden rounded-2xl border border-gray-200"
        style={{ backgroundColor: dark ? "#0F0D20" : "#F7F7FB" }}
      >
        <div className="relative flex items-center px-4" style={{ height: 64 }}>
          {centered ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12">
              {logoNode}
            </div>
          ) : (
            <div className="flex flex-1 items-center">{logoNode}</div>
          )}
          {/* Toggle de tema simulado (headerRight) */}
          <div
            className="ml-auto flex items-center rounded-full"
            style={{
              width: 34,
              height: 20,
              paddingLeft: 2,
              paddingRight: 2,
              backgroundColor: dark
                ? "rgba(255,255,255,0.18)"
                : "rgba(0,0,0,0.08)",
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 16,
                height: 16,
                marginLeft: dark ? "auto" : 0,
                backgroundColor: dark ? "rgba(255,255,255,0.55)" : "#ffffff",
              }}
            />
          </div>
        </div>
        {/* Cuerpo simulado */}
        <div className="flex flex-col gap-y-2 px-4 py-3">
          <span
            className="h-2 w-1/3 rounded-full"
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.14)"
                : "rgba(0,0,0,0.10)",
            }}
          />
          <span
            className="h-2 w-2/3 rounded-full"
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Maqueta del header del celular (claro + oscuro) ──
export function HeaderPreview({
  logoUri,
  logoUriDark,
  name,
  size = "md",
  position = "left",
  content = "logo",
}: {
  logoUri: string | null;
  logoUriDark: string | null;
  name: string;
  size?: string;
  position?: string;
  content?: string;
}) {
  const px = HEADER_LOGO_PX[size] ?? HEADER_LOGO_PX.md;
  const logoWidth = Math.min(px * 4, 200);
  const centered = position === "center";
  const shared = { name, px, logoWidth, centered, content };

  return (
    <div className="flex flex-col gap-y-1.5">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-gray-400">
        Vista previa del header
      </span>
      <div className="flex flex-col items-start gap-y-3">
        <PreviewBar label="Claro" dark={false} logoUri={logoUri} {...shared} />
        <PreviewBar
          label="Oscuro"
          dark
          logoUri={logoUriDark || logoUri}
          {...shared}
        />
      </div>
    </div>
  );
}

// ── Bloque "Header del home": preview + controles de tamaño/posición/contenido ──
export function HeaderConfigFields({
  logoUri,
  logoUriDark,
  name,
  size,
  position,
  content,
  onSizeChange,
  onPositionChange,
  onContentChange,
}: {
  logoUri: string | null;
  logoUriDark: string | null;
  name: string;
  size: string;
  position: string;
  content: string;
  onSizeChange: (v: string) => void;
  onPositionChange: (v: string) => void;
  onContentChange: (v: string) => void;
}) {
  return (
    <>
      <div className="h-px w-full bg-gray-100" />
      <p className="font-jakarta text-[12px] font-bold tracking-tight text-gray-900">
        Header del home
      </p>
      <p className="-mt-3 font-manrope text-[11px] text-gray-400">
        Cómo se ve el logo en la barra superior de la app de los miembros.
      </p>

      <HeaderPreview
        logoUri={logoUri}
        logoUriDark={logoUriDark}
        name={name}
        size={size}
        position={position}
        content={content}
      />

      <div className="flex gap-4">
        <div className="flex-1">
          <Segmented
            label="Tamaño del logo"
            value={size}
            onChange={onSizeChange}
            options={[
              { value: "sm", label: "Chico" },
              { value: "md", label: "Medio" },
              { value: "lg", label: "Grande" },
            ]}
          />
        </div>
        <div className="flex-1">
          <Segmented
            label="Posición"
            value={position}
            onChange={onPositionChange}
            options={[
              { value: "left", label: "Izquierda" },
              { value: "center", label: "Centro" },
            ]}
          />
        </div>
      </div>

      <Segmented
        label="Contenido del header"
        value={content}
        onChange={onContentChange}
        options={[
          { value: "logo", label: "Solo logo" },
          { value: "logo_title", label: "Logo + nombre" },
          { value: "title", label: "Solo nombre" },
        ]}
      />
    </>
  );
}

export { DEFAULT_PRIMARY };
