"use client";

// Registrar socio (admin). Clon de apps/mobile admin/users/register.web.jsx:
// form (react-form + zod) con foto opcional (upload directo a Cloudinary) y alta
// vía edge function crear-socio. Roles asignables según el rol del caller.

// React / Next
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Librerías
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
  Camera,
  Mail,
  Phone,
  IdCard,
  MapPin,
  UserPlus,
  ArrowLeft,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";

// Supabase, tema, helpers y constantes
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { CLOUD_NAME } from "@/lib/cloudinary";
import { ui } from "@gymtrack/core/colors";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import { useGymTheme } from "@/components/auth/use-gym-theme";
import { ASSIGNABLE_ROLES, ROLE_LABELS, DEFAULT_ROLE } from "@/lib/auth/roles";
import { PROFILE_GENDERS } from "@/lib/gender-options";

// Sube una imagen directo a Cloudinary (unsigned preset). Devuelve el public_id.
const uploadImageWeb = async (file: File): Promise<string> => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "gymtrack_images");
  data.append("tags", "pending_approval");
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: data }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Error al subir imagen");
  return json.public_id as string;
};

type Notification = { type: "success" | "error"; message: string } | null;

function FieldWrap({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-y-1.5">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
        {label}
      </span>
      {children}
      {error && <span className="font-manrope text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

function Input({
  icon,
  ...props
}: { icon?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-white px-3.5 py-2.5">
      {icon}
      <input
        {...props}
        className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
      />
    </div>
  );
}

export default function RegisterUserPage() {
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { role: currentRole } = useUserRole();
  const { brandPrimary } = useGymTheme();

  // Roles que el caller puede asignar (estrictamente por debajo del suyo).
  const assignableRoles = ASSIGNABLE_ROLES[currentRole ?? ""] ?? [DEFAULT_ROLE];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<Notification>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      last_name: "",
      phone: "",
      document_number: "",
      address: "",
      gender: "",
      role: DEFAULT_ROLE as string,
    },
    onSubmit: async ({ value }) => {
      try {
        let image_profile: string | null = null;
        if (selectedFile) {
          try {
            image_profile = await uploadImageWeb(selectedFile);
          } catch {
            image_profile = null;
          }
        }

        const supabase = getBrowserSupabase();
        const response = await supabase.functions.invoke("crear-socio", {
          // gym_id: el gym activo del caller (multi-gym); el backend valida que
          // realmente sea staff de ese gym.
          body: {
            ...value,
            image_profile,
            gender: value.gender || null,
            gym_id: gymId,
          },
        });

        if (response.error) {
          let msg = "Ha ocurrido un error inesperado.";
          const ctx = (response.error as { context?: { json: () => Promise<{ error?: string }> } }).context;
          if (ctx) {
            try {
              const body = await ctx.json();
              if (body?.error) msg = body.error;
            } catch {}
          }
          throw new Error(msg);
        }

        notify(
          "success",
          response.data?.linked_existing
            ? "Esta persona ya tenía cuenta: se la vinculó a tu gimnasio con sus datos existentes."
            : "Socio registrado exitosamente."
        );
        form.reset();
        setPreviewUrl(null);
        setSelectedFile(null);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Error inesperado");
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="p-4 pb-14 md:p-9">
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
          <span className={`flex-1 font-manrope text-sm font-semibold ${notification.type === "success" ? "text-brandSecondary-700" : "text-red-600"}`}>
            {notification.message}
          </span>
          <button type="button" onClick={() => setNotification(null)}>
            <X size={14} color={notification.type === "success" ? "#059669" : "#dc2626"} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-1 hover:opacity-70"
          >
            <ArrowLeft size={11} color={ui.text.muted} />
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Usuarios
            </span>
          </button>
          <span className="text-[11px] text-ui-text-muted">·</span>
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-600">
            Nuevo socio
          </span>
        </div>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          Registrar socio
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Completá los datos para dar de alta un nuevo miembro
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="mx-auto w-full self-center rounded-[20px] border border-ui-input-border bg-white p-8"
        style={{ maxWidth: 680 }}
      >
        {/* Photo picker */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div className="mb-8 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 hover:opacity-80"
          >
            <div className="relative">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-[88px] w-[88px] rounded-full object-cover" />
              ) : (
                <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50">
                  <Camera size={30} color={brandPrimary[500]} />
                </div>
              )}
              <div className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-brandPrimary-600 p-2 shadow-sm">
                <UserPlus size={13} color="white" />
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-manrope text-[13px] font-bold text-ui-text-main">
                Foto de perfil
              </span>
              <span className="font-manrope text-[11px] text-ui-text-muted">
                Hacé clic para elegir una imagen
              </span>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="mb-7 h-px w-full bg-ui-input-light" />

        {/* Fields */}
        <div className="flex flex-col gap-y-5">
          {/* Row: Nombre + Apellido */}
          <div className="flex gap-4">
            <div className="flex-1">
              <form.Field name="name" validators={{ onChange: z.string().min(3, "Mínimo 3 caracteres") }}>
                {(field) => (
                  <FieldWrap label="NOMBRE(S)" error={field.state.meta.errors[0]?.message}>
                    <Input placeholder="Ej: Juan Pablo" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                  </FieldWrap>
                )}
              </form.Field>
            </div>
            <div className="flex-1">
              <form.Field name="last_name" validators={{ onChange: z.string().min(2, "Mínimo 2 caracteres") }}>
                {(field) => (
                  <FieldWrap label="APELLIDO(S)" error={field.state.meta.errors[0]?.message}>
                    <Input placeholder="Ej: Pérez García" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                  </FieldWrap>
                )}
              </form.Field>
            </div>
          </div>

          {/* Email */}
          <form.Field name="email" validators={{ onChange: z.string().email("Correo electrónico inválido") }}>
            {(field) => (
              <FieldWrap label="CORREO ELECTRÓNICO" error={field.state.meta.errors[0]?.message}>
                <Input
                  placeholder="juan.perez@ejemplo.com"
                  icon={<Mail size={15} color={ui.text.muted} />}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="email"
                  autoCapitalize="none"
                />
              </FieldWrap>
            )}
          </form.Field>

          {/* Row: Teléfono + Documento */}
          <div className="flex gap-4">
            <div className="flex-1">
              <form.Field name="phone" validators={{ onChange: z.string().min(8, "Mínimo 8 dígitos") }}>
                {(field) => (
                  <FieldWrap label="TELÉFONO" error={field.state.meta.errors[0]?.message}>
                    <Input placeholder="123456789" icon={<Phone size={15} color={ui.text.muted} />} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} inputMode="numeric" />
                  </FieldWrap>
                )}
              </form.Field>
            </div>
            <div className="flex-1">
              <form.Field name="document_number" validators={{ onChange: z.string().min(5, "N° de documento inválido") }}>
                {(field) => (
                  <FieldWrap label="N° DE DOCUMENTO" error={field.state.meta.errors[0]?.message}>
                    <Input placeholder="12345678" icon={<IdCard size={15} color={ui.text.muted} />} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} inputMode="numeric" />
                  </FieldWrap>
                )}
              </form.Field>
            </div>
          </div>

          {/* Dirección */}
          <form.Field name="address">
            {(field) => (
              <FieldWrap label="DIRECCIÓN (OPCIONAL)">
                <Input placeholder="Ej: Av. Corrientes 1234, Buenos Aires" icon={<MapPin size={15} color={ui.text.muted} />} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </FieldWrap>
            )}
          </form.Field>

          {/* Género */}
          <form.Field name="gender">
            {(field) => (
              <FieldWrap label="GÉNERO (OPCIONAL)">
                <div className="flex flex-wrap gap-2">
                  {PROFILE_GENDERS.map((g) => {
                    const active = field.state.value === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => field.handleChange(active ? "" : g.value)}
                        className={`rounded-xl border px-4 py-2 ${active ? "border-brandPrimary-600 bg-brandPrimary-600" : "border-ui-input-border bg-white hover:bg-brandPrimary-50/60"}`}
                      >
                        <span className={`font-manrope text-[13px] font-semibold ${active ? "text-white" : "text-ui-text-muted"}`}>
                          {g.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FieldWrap>
            )}
          </form.Field>

          {/* Rol */}
          {assignableRoles.length > 1 && (
            <form.Field name="role">
              {(field) => (
                <FieldWrap label="ROL">
                  <div className="flex flex-wrap gap-2">
                    {assignableRoles.map((r) => {
                      const active = field.state.value === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => field.handleChange(r)}
                          className={`rounded-xl border px-4 py-2 ${active ? "border-brandPrimary-600 bg-brandPrimary-600" : "border-ui-input-border bg-white hover:bg-brandPrimary-50/60"}`}
                        >
                          <span className={`font-manrope text-[13px] font-semibold ${active ? "text-white" : "text-ui-text-muted"}`}>
                            {ROLE_LABELS[r] ?? r}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FieldWrap>
              )}
            </form.Field>
          )}
        </div>

        {/* Submit */}
        <div className="mt-8">
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex w-full items-center justify-center gap-2 rounded-[13px] py-3 ${
                  isSubmitting ? "bg-brandPrimary-400" : "bg-brandPrimary-600 shadow-md shadow-brandPrimary-600/30 hover:bg-brandPrimary-700"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 size={15} color="#fff" className="animate-spin" />
                ) : (
                  <UserPlus size={15} color="#fff" />
                )}
                <span className="font-manrope text-sm font-bold text-white">
                  {isSubmitting ? "Registrando..." : "Registrar Socio"}
                </span>
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
