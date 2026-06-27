"use client";

// Form de edición de gimnasio + zona de suspensión + danger zone (borrado).
// Réplica de apps/mobile platform/gyms/[id].web.jsx. Mutaciones:
//  - Guardar: update directo a gyms (RLS gyms_update, gated a super_admin).
//  - Suspender/reactivar: update de is_active (mismo policy).
//  - Eliminar: edge function eliminar-gym (borrado atómico en cascada + cuentas).
// El dueño es solo lectura (no se reasigna desde acá).

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
  ShieldHalf,
  Lock,
  Trash2,
  X,
} from "lucide-react";

// Supabase, helpers y campos
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { cloudinaryUrl } from "@/lib/cloudinary";
import {
  slugify,
  uploadImageWeb,
  ownerLabel,
  readFunctionError,
  HEX_RE,
  DEFAULT_PRIMARY,
  DEFAULT_ACCENT,
  type Gym,
  type GymOwner,
} from "@/lib/gyms";
import {
  Field,
  Input,
  ColorField,
  SectionTitle,
  LogoPickers,
  HeaderConfigFields,
  Toggle,
} from "@/components/platform/gym-form-fields";

type Notification = { type: "success" | "error"; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditGymForm({
  gym,
  owner,
}: {
  gym: Gym;
  owner: GymOwner | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputDarkRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrlDark, setPreviewUrlDark] = useState<string | null>(null);
  const [selectedFileDark, setSelectedFileDark] = useState<File | null>(null);

  const [notification, setNotification] = useState<Notification>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);

  // Estado del gym (is_active puede cambiar sin recargar la página).
  const [isActive, setIsActive] = useState(gym.is_active !== false);

  // Campos del form
  const [name, setName] = useState(gym.name ?? "");
  const [slug, setSlug] = useState(gym.slug ?? "");
  const [address, setAddress] = useState(gym.address ?? "");
  const [phone, setPhone] = useState(gym.phone ?? "");
  const [email, setEmail] = useState(gym.email ?? "");
  const [instagram, setInstagram] = useState(gym.instagram ?? "");
  const [themePrimary, setThemePrimary] = useState(
    gym.theme_primary || DEFAULT_PRIMARY
  );
  const [themeAccent, setThemeAccent] = useState(
    gym.theme_accent || DEFAULT_ACCENT
  );
  const [headerSize, setHeaderSize] = useState(gym.header_logo_size ?? "md");
  const [headerPosition, setHeaderPosition] = useState(
    gym.header_logo_position ?? "left"
  );
  const [headerContent, setHeaderContent] = useState(gym.header_content ?? "logo");
  const [defaultCatalog, setDefaultCatalog] = useState(
    gym.default_catalog ?? false
  );

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const currentLogoUrl = useMemo(() => cloudinaryUrl(gym.logo_url), [gym.logo_url]);
  const currentLogoUrlDark = useMemo(
    () => cloudinaryUrl(gym.logo_url_dark),
    [gym.logo_url_dark]
  );
  const logoToShow = previewUrl || currentLogoUrl;
  const logoToShowDark = previewUrlDark || currentLogoUrlDark;

  const canConfirmDelete =
    confirmSlug.trim().toLowerCase() === (gym.slug ?? "").trim().toLowerCase();

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

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) return;
    setSaving(true);
    try {
      let logoUrl = gym.logo_url ?? null;
      if (selectedFile) {
        try {
          logoUrl = await uploadImageWeb(selectedFile);
        } catch {
          logoUrl = gym.logo_url ?? null;
        }
      }
      let logoUrlDark = gym.logo_url_dark ?? null;
      if (selectedFileDark) {
        try {
          logoUrlDark = await uploadImageWeb(selectedFileDark);
        } catch {
          logoUrlDark = gym.logo_url_dark ?? null;
        }
      }

      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("gyms")
        .update({
          name: name.trim(),
          slug: slug.trim(),
          logo_url: logoUrl,
          logo_url_dark: logoUrlDark,
          theme_primary: themePrimary,
          theme_accent: themeAccent,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          instagram: instagram.trim() || null,
          header_logo_size: headerSize,
          header_logo_position: headerPosition,
          header_content: headerContent,
          default_catalog: defaultCatalog,
        })
        .eq("id", gym.id);

      if (error) {
        throw error;
      }

      notify("success", "Gimnasio actualizado correctamente.");
      router.push("/platform/gyms");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const msg =
        code === "23505"
          ? "Ese slug ya está en uso por otro gimnasio."
          : err instanceof Error
            ? err.message
            : "No se pudo guardar el gimnasio.";
      notify("error", msg);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.functions.invoke("eliminar-gym", {
        body: { gym_id: gym.id },
      });
      if (error) {
        throw new Error(
          await readFunctionError(error, "Error al eliminar el gimnasio.")
        );
      }
      router.replace("/platform/gyms");
      router.refresh();
    } catch (err) {
      setConfirmOpen(false);
      setDeleting(false);
      notify(
        "error",
        err instanceof Error ? err.message : "Error al eliminar el gimnasio."
      );
    }
  };

  // Suspender es reversible: reactivar va directo, suspender pide confirmación.
  const handleToggleActive = async () => {
    if (toggling) return;
    const next = !isActive;
    setToggling(true);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from("gyms")
        .update({ is_active: next })
        .eq("id", gym.id);
      if (error) throw error;
      setIsActive(next);
      setSuspendOpen(false);
      notify("success", next ? "Gimnasio reactivado." : "Gimnasio suspendido.");
      router.refresh();
    } catch (err) {
      setSuspendOpen(false);
      notify(
        "error",
        err instanceof Error ? err.message : "No se pudo actualizar el estado."
      );
    } finally {
      setToggling(false);
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
            Editar
          </span>
        </div>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
          {gym.name}
        </h1>
        <p className="mt-1 font-manrope text-xs text-gray-400">
          Editá la identidad, contacto y tema del gimnasio
        </p>
      </div>

      {/* Aviso de suspensión */}
      {!isActive && (
        <div className="mx-auto mb-6 flex w-full max-w-[680px] items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <Lock size={16} color="#b45309" />
          <span className="flex-1 font-manrope text-sm font-semibold text-amber-700">
            Gimnasio suspendido. Sus miembros —incluido el dueño— no pueden
            acceder a la app hasta reactivarlo.
          </span>
        </div>
      )}

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

        {/* ── Sección 2 · Dueño (solo lectura) ── */}
        <SectionTitle step="2" title="Dueño" subtitle="Quién administra este gimnasio" />
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
          <ShieldHalf size={15} className="text-brandPrimary-700" />
          <span className="flex-1 font-manrope text-[13px] font-semibold text-gray-900">
            {ownerLabel(owner)}
            {owner?.email ? (
              <span className="font-normal text-gray-400">
                {"  ·  "}
                {owner.email}
              </span>
            ) : null}
          </span>
        </div>
        <p className="mt-1.5 font-manrope text-[11px] text-gray-400">
          El dueño no se modifica desde esta pantalla.
        </p>

        <div className="my-7 h-px w-full bg-gray-100" />

        {/* ── Sección 3 · Theme ── */}
        <SectionTitle
          step="3"
          title="Theme"
          subtitle="Logo y colores que ven los miembros del gym"
        />
        <div className="flex flex-col gap-y-5">
          <LogoPickers
            logoUri={logoToShow}
            logoUriDark={logoToShowDark}
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
            logoUri={logoToShow}
            logoUriDark={logoToShowDark}
            name={name}
            size={headerSize}
            position={headerPosition}
            content={headerContent}
            onSizeChange={setHeaderSize}
            onPositionChange={setHeaderPosition}
            onContentChange={setHeaderContent}
          />
        </div>

        <div className="my-7 h-px w-full bg-gray-100" />

        {/* ── Sección 4 · Catálogo ── */}
        <SectionTitle
          step="4"
          title="Catálogo por default"
          subtitle="Biblioteca central de ejercicios, sesiones y planes"
        />
        <Toggle
          label="Activar catálogo de ejercicios"
          hint="Cuando está activo, el gym ve el catálogo central (read-only) en su biblioteca y pickers. Para editar un ítem, sus coaches lo guardan en custom."
          value={defaultCatalog}
          onChange={setDefaultCatalog}
        />

        {/* Submit */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-[13px] py-3 ${
              saving
                ? "bg-brandPrimary-400"
                : "bg-brandPrimary-700 shadow-md shadow-brandPrimary-700/30 hover:bg-brandPrimary-600"
            }`}
          >
            <CheckCircle size={15} color="#fff" />
            <span className="font-manrope text-sm font-bold text-white">
              {saving ? "Guardando…" : "Guardar cambios"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Suspensión (reversible) ── */}
      <div className="mx-auto mt-6 w-full max-w-[680px] rounded-[20px] border border-amber-200 bg-amber-50/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="font-jakarta text-[14px] font-bold tracking-tight text-amber-700">
              {isActive ? "Suspender gimnasio" : "Reactivar gimnasio"}
            </p>
            <p className="mt-1 font-manrope text-[11px] text-amber-700/80">
              {isActive
                ? "Corta el acceso de todos los miembros (incluido el dueño) sin borrar nada. Los datos se conservan y se restablecen al reactivar."
                : "Restablece el acceso de todos los miembros. Los datos siguen intactos."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isActive) setSuspendOpen(true);
              else handleToggleActive();
            }}
            disabled={toggling}
            className={`flex items-center gap-2 rounded-[11px] px-4 py-2.5 shadow-md disabled:opacity-70 ${
              isActive
                ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600"
                : "bg-brandSecondary-600 shadow-brandSecondary-600/30 hover:bg-brandSecondary-700"
            }`}
          >
            {isActive ? (
              <Lock size={15} color="#fff" />
            ) : (
              <CheckCircle size={15} color="#fff" />
            )}
            <span className="font-manrope text-[13px] font-bold text-white">
              {isActive ? "Suspender" : "Reactivar"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div className="mx-auto mt-6 w-full max-w-[680px] rounded-[20px] border border-red-200 bg-red-50/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="font-jakarta text-[14px] font-bold tracking-tight text-red-700">
              Eliminar gimnasio
            </p>
            <p className="mt-1 font-manrope text-[11px] text-red-600/80">
              Borra el gimnasio y todos sus datos (socios, planes, sesiones,
              asistencias e historial). Las cuentas que solo pertenezcan a este
              gym se eliminan. Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmSlug("");
              setConfirmOpen(true);
            }}
            className="flex items-center gap-2 rounded-[11px] bg-red-600 px-4 py-2.5 shadow-md shadow-red-600/30 transition hover:bg-red-700"
          >
            <Trash2 size={15} color="#fff" />
            <span className="font-manrope text-[13px] font-bold text-white">
              Eliminar
            </span>
          </button>
        </div>
      </div>

      {/* Modal de confirmación de borrado */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-[460px] rounded-[20px] border border-gray-200 bg-white p-7">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Trash2 size={18} color="#dc2626" />
              </div>
              <p className="font-jakarta text-[17px] font-bold tracking-tight text-gray-900">
                Eliminar &ldquo;{gym.name}&rdquo;
              </p>
            </div>

            <p className="mb-4 font-manrope text-[12px] leading-5 text-gray-400">
              Vas a borrar de forma permanente el gimnasio y todos sus datos.
              Para confirmar, escribí el slug del gimnasio (no el nombre):{" "}
              <span className="font-bold text-gray-900">{gym.slug}</span>.
            </p>

            <input
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              placeholder={gym.slug ?? ""}
              autoCapitalize="none"
              className="mb-5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 font-manrope text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-[11px] border border-gray-200 bg-white py-2.5 font-manrope text-[13px] font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirmDelete || deleting}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 ${
                  !canConfirmDelete || deleting
                    ? "bg-red-300"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <Trash2 size={14} color="#fff" />
                <span className="font-manrope text-[13px] font-bold text-white">
                  {deleting ? "Eliminando…" : "Eliminar"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de suspensión */}
      {suspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6">
          <div className="w-full max-w-[460px] rounded-[20px] border border-gray-200 bg-white p-7">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Lock size={18} color="#b45309" />
              </div>
              <p className="font-jakarta text-[17px] font-bold tracking-tight text-gray-900">
                Suspender &ldquo;{gym.name}&rdquo;
              </p>
            </div>

            <p className="mb-5 font-manrope text-[12px] leading-5 text-gray-400">
              Todos los miembros del gimnasio —incluido el dueño— quedarán sin
              acceso a la app y se cerrará su sesión. No se borra ningún dato:
              podés reactivarlo cuando quieras y todo vuelve a estar disponible.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSuspendOpen(false)}
                disabled={toggling}
                className="flex-1 rounded-[11px] border border-gray-200 bg-white py-2.5 font-manrope text-[13px] font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={toggling}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 ${
                  toggling ? "bg-amber-300" : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                <Lock size={14} color="#fff" />
                <span className="font-manrope text-[13px] font-bold text-white">
                  {toggling ? "Suspendiendo…" : "Suspender"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
