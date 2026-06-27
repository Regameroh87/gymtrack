"use client";

// Form de creación de gimnasio (panel de plataforma). Réplica de
// apps/mobile platform/gyms/new.web.jsx: datos del gym, dueño (existente o nuevo),
// theme (logos + colores + config del header) y submit vía edge function crear-gym.
// Sin TanStack Form: estado controlado clásico + validación inline.

// React / Next
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Iconos
import {
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  ArrowLeft,
  CheckCircle,
  Search,
  ShieldHalf,
  X,
} from "lucide-react";

// Supabase, helpers y campos
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  slugify,
  uploadImageWeb,
  readFunctionError,
  HEX_RE,
  DEFAULT_PRIMARY,
  DEFAULT_ACCENT,
  type OwnerCandidate,
} from "@/lib/gyms";
import {
  Field,
  Input,
  ColorField,
  SectionTitle,
  LogoPickers,
  HeaderConfigFields,
} from "@/components/platform/gym-form-fields";

const OWNER_MODES = [
  { value: "existing", label: "Usuario existente" },
  { value: "new", label: "Crear nuevo" },
] as const;

type Notification = { type: "success" | "error"; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewGymForm({ owners }: { owners: OwnerCandidate[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputDarkRef = useRef<HTMLInputElement>(null);

  // Archivos / previews
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrlDark, setPreviewUrlDark] = useState<string | null>(null);
  const [selectedFileDark, setSelectedFileDark] = useState<File | null>(null);

  const [notification, setNotification] = useState<Notification>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Selector de dueño
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">("existing");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerCandidate | null>(null);

  // Campos del form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [themePrimary, setThemePrimary] = useState(DEFAULT_PRIMARY);
  const [themeAccent, setThemeAccent] = useState(DEFAULT_ACCENT);
  const [headerSize, setHeaderSize] = useState("md");
  const [headerPosition, setHeaderPosition] = useState("left");
  const [headerContent, setHeaderContent] = useState("logo");
  const [ownerName, setOwnerName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const ownerOptions = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    const rows = !q
      ? owners
      : owners.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.last_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q)
        );
    return rows.slice(0, 6);
  }, [owners, ownerSearch]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "Mínimo 3 caracteres";
    if (slug.trim().length < 3) next.slug = "Mínimo 3 caracteres";
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.trim()))
      next.slug = "Solo minúsculas, números y guiones";
    if (email.trim() && !EMAIL_RE.test(email.trim()))
      next.email = "Correo electrónico inválido";
    if (!HEX_RE.test(themePrimary)) next.theme_primary = "Hex inválido (#RRGGBB)";
    if (!HEX_RE.test(themeAccent)) next.theme_accent = "Hex inválido (#RRGGBB)";
    if (ownerMode === "new" && ownerEmail.trim() && !EMAIL_RE.test(ownerEmail.trim()))
      next.owner_email = "Correo electrónico inválido";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    dark: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (dark) {
      setSelectedFileDark(file);
      setPreviewUrlDark(URL.createObjectURL(file));
    } else {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    if (ownerMode === "existing" && !selectedOwner) {
      notify("error", "Seleccioná el dueño del gimnasio.");
      return;
    }
    if (ownerMode === "new" && (!ownerName.trim() || !ownerEmail.trim())) {
      notify("error", "Completá nombre y email del nuevo dueño.");
      return;
    }

    setSubmitting(true);
    try {
      let logo_url: string | null = null;
      if (selectedFile) {
        try {
          logo_url = await uploadImageWeb(selectedFile);
        } catch {
          logo_url = null;
        }
      }
      let logo_url_dark: string | null = null;
      if (selectedFileDark) {
        try {
          logo_url_dark = await uploadImageWeb(selectedFileDark);
        } catch {
          logo_url_dark = null;
        }
      }

      const finalOwnerEmail =
        ownerMode === "new" ? ownerEmail.trim() : selectedOwner!.email;

      const supabase = getBrowserSupabase();
      const { error } = await supabase.functions.invoke("crear-gym", {
        body: {
          gym_name: name.trim(),
          gym_slug: slug.trim(),
          logo_url,
          logo_url_dark,
          theme_primary: themePrimary,
          theme_accent: themeAccent,
          header_logo_size: headerSize,
          header_logo_position: headerPosition,
          header_content: headerContent,
          gym_address: address.trim() || null,
          gym_phone: phone.trim() || null,
          gym_email: email.trim() || null,
          gym_instagram: instagram.trim() || null,
          email: finalOwnerEmail,
          name: ownerName.trim() || null,
          last_name: ownerLastName.trim() || null,
          phone: ownerPhone.trim() || null,
        },
      });

      if (error) {
        throw new Error(
          await readFunctionError(error, "Ha ocurrido un error inesperado.")
        );
      }

      notify(
        "success",
        ownerMode === "new"
          ? "Gimnasio y cuenta del dueño creados exitosamente."
          : "Gimnasio creado exitosamente."
      );
      router.push("/platform/gyms");
      router.refresh();
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : "No se pudo crear el gimnasio."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-10 md:p-9 md:pb-14">
      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-xl border p-3.5 ${
            notification.type === "success"
              ? "border-brandSecondary-200 bg-brandSecondary-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={16} color="#059669" />
          ) : (
            <X size={16} color="#dc2626" />
          )}
          <span
            className={`flex-1 font-manrope text-sm font-semibold ${
              notification.type === "success"
                ? "text-brandSecondary-700"
                : "text-red-600"
            }`}
          >
            {notification.message}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/platform/gyms")}
            className="flex items-center gap-1 transition hover:opacity-70"
          >
            <ArrowLeft size={11} className="text-gray-400" />
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
              Gimnasios
            </span>
          </button>
          <span className="text-[11px] text-gray-400">·</span>
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-700">
            Nuevo gimnasio
          </span>
        </div>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
          Crear gimnasio
        </h1>
        <p className="mt-1 font-manrope text-xs text-gray-400">
          Alta de un nuevo gimnasio en la plataforma con su identidad y dueño
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto w-full max-w-[680px] rounded-[20px] border border-gray-200 bg-white p-5 md:p-8">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, false)}
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputDarkRef}
          className="hidden"
          onChange={(e) => handleFileChange(e, true)}
        />

        {/* ── Sección 1 · Datos del gimnasio ── */}
        <SectionTitle
          step="1"
          title="Datos del gimnasio"
          subtitle="Identidad y contacto del establecimiento"
        />
        <div className="flex flex-col gap-y-5">
          <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Field label="Nombre" error={errors.name}>
                <Input
                  placeholder="Ej: Energym Centro"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field
                label="Slug"
                error={errors.slug}
                hint="Identificador único en URLs y QR"
              >
                <Input
                  placeholder="energym-centro"
                  value={slug}
                  autoCapitalize="none"
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </Field>
            </div>
          </div>

          <Field label="Dirección (opcional)">
            <Input
              placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
              icon={<MapPin size={15} className="text-gray-400" />}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <Field label="Teléfono (opcional)">
                <Input
                  placeholder="123456789"
                  icon={<Phone size={15} className="text-gray-400" />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Email (opcional)" error={errors.email}>
                <Input
                  placeholder="contacto@energym.com"
                  icon={<Mail size={15} className="text-gray-400" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoCapitalize="none"
                />
              </Field>
            </div>
          </div>

          <Field label="Instagram (opcional)">
            <Input
              placeholder="@energym"
              icon={<LinkIcon size={15} className="text-gray-400" />}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              autoCapitalize="none"
            />
          </Field>
        </div>

        <div className="my-7 h-px w-full bg-gray-100" />

        {/* ── Sección 2 · Dueño ── */}
        <SectionTitle step="2" title="Dueño" subtitle="Quién administra este gimnasio" />
        <div className="flex flex-col gap-y-5">
          {/* Toggle existente / nuevo */}
          <div className="flex self-start rounded-xl bg-gray-50 p-1">
            {OWNER_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setOwnerMode(m.value)}
                className={`rounded-lg px-4 py-1.5 font-manrope text-[12px] ${
                  ownerMode === m.value
                    ? "bg-white font-bold text-brandPrimary-700 shadow-sm"
                    : "font-semibold text-gray-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {ownerMode === "existing" ? (
            <Field
              label="Dueño"
              hint="Recibe la membresía de Dueño del gimnasio nuevo; si ya pertenece a otros gyms, conserva esas membresías."
            >
              {selectedOwner ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-brandPrimary-300 bg-brandPrimary-50 px-3.5 py-2.5">
                  <ShieldHalf size={15} className="text-brandPrimary-700" />
                  <span className="flex-1 font-manrope text-[13px] font-semibold text-gray-900">
                    {`${selectedOwner.name ?? ""} ${selectedOwner.last_name ?? ""}`.trim() ||
                      selectedOwner.email}
                    <span className="font-normal text-gray-400">
                      {"  ·  "}
                      {selectedOwner.email}
                    </span>
                  </span>
                  <button type="button" onClick={() => setSelectedOwner(null)}>
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
                    <Search size={15} className="text-gray-400" />
                    <input
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      onFocus={() => setOwnerOpen(true)}
                      placeholder="Buscar usuario por nombre o email..."
                      className="flex-1 bg-transparent font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {ownerOpen && ownerOptions.length > 0 && (
                    <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {ownerOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwner(p);
                            setOwnerOpen(false);
                          }}
                          className="flex w-full items-center gap-2.5 border-b border-gray-100 px-3.5 py-2.5 text-left transition last:border-b-0 hover:bg-brandPrimary-50"
                        >
                          <div className="flex-1">
                            <p className="font-manrope text-[13px] font-semibold text-gray-900">
                              {`${p.name ?? ""} ${p.last_name ?? ""}`.trim() ||
                                p.email}
                            </p>
                            <p className="font-manrope text-[11px] text-gray-400">
                              {p.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          ) : (
            <div className="flex flex-col gap-y-5">
              <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
                <div className="flex-1">
                  <Field label="Nombre">
                    <Input
                      placeholder="Ej: Juan"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Apellido (opcional)">
                    <Input
                      placeholder="Ej: Pérez"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
                <div className="flex-1">
                  <Field label="Email" error={errors.owner_email}>
                    <Input
                      placeholder="dueno@energym.com"
                      icon={<Mail size={15} className="text-gray-400" />}
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      inputMode="email"
                      autoCapitalize="none"
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Teléfono (opcional)">
                    <Input
                      placeholder="123456789"
                      icon={<Phone size={15} className="text-gray-400" />}
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-brandPrimary-200 bg-brandPrimary-50 px-3.5 py-2.5">
                <ShieldHalf size={14} className="text-brandPrimary-700" />
                <span className="flex-1 font-manrope text-[11px] text-gray-400">
                  Se crea su cuenta con rol Dueño y contraseña temporal{" "}
                  <span className="font-bold text-gray-900">tugimnasio123</span>.
                  El email queda confirmado automáticamente.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="my-7 h-px w-full bg-gray-100" />

        {/* ── Sección 3 · Theme ── */}
        <SectionTitle
          step="3"
          title="Theme"
          subtitle="Logo y colores que ven los miembros del gym"
        />
        <div className="flex flex-col gap-y-5">
          <LogoPickers
            logoUri={previewUrl}
            logoUriDark={previewUrlDark}
            onPickLight={() => fileInputRef.current?.click()}
            onPickDark={() => fileInputDarkRef.current?.click()}
          />

          <div className="flex flex-col gap-y-5 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <ColorField
                label="Color primario"
                value={themePrimary}
                onChange={setThemePrimary}
                error={errors.theme_primary}
              />
            </div>
            <div className="flex-1">
              <ColorField
                label="Color de acento"
                value={themeAccent}
                onChange={setThemeAccent}
                error={errors.theme_accent}
              />
            </div>
          </div>

          <HeaderConfigFields
            logoUri={previewUrl}
            logoUriDark={previewUrlDark}
            name={name}
            size={headerSize}
            position={headerPosition}
            content={headerContent}
            onSizeChange={setHeaderSize}
            onPositionChange={setHeaderPosition}
            onContentChange={setHeaderContent}
          />
        </div>

        {/* Submit */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex w-full items-center justify-center gap-2 rounded-[13px] py-3 ${
              submitting
                ? "bg-brandPrimary-400"
                : "bg-brandPrimary-700 shadow-md shadow-brandPrimary-700/30 hover:bg-brandPrimary-600"
            }`}
          >
            <ShieldHalf size={15} color="#fff" />
            <span className="font-manrope text-sm font-bold text-white">
              {submitting ? "Creando…" : "Crear gimnasio"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
