"use client";

// Alta de staff de plataforma (superadmin_admin / superadmin_coach). Clon
// simplificado de admin/users/register/page.tsx: sin foto/teléfono/documento/
// dirección/género (no aplican a una cuenta sin gym), rol asignable según
// PLATFORM_ASSIGNABLE_ROLES del caller, alta vía edge function
// crear-staff-plataforma.

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Mail, UserPlus, ArrowLeft, CheckCircle, X, Loader2 } from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import { ui } from "@gymtrack/core/colors";
import { useAuth } from "@/components/auth/auth-provider";
import {
  PLATFORM_ASSIGNABLE_ROLES,
  ROLE_LABELS,
  resolvePlatformRole,
} from "@/lib/auth/roles";

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

export default function RegisterPlatformStaffPage() {
  const router = useRouter();
  const { user } = useAuth();
  const currentPlatformRole = resolvePlatformRole(user);

  // Roles de plataforma que el caller puede asignar (estrictamente por debajo del suyo).
  const assignableRoles = PLATFORM_ASSIGNABLE_ROLES[currentPlatformRole ?? ""] ?? [];
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
      role: assignableRoles[assignableRoles.length - 1] ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        // El rol que espera la edge function es 'admin' | 'coach' (sin el
        // prefijo superadmin_), a diferencia del Role de la app.
        const role = value.role.replace("superadmin_", "");

        const supabase = getBrowserSupabase();
        const response = await supabase.functions.invoke("crear-staff-plataforma", {
          body: { ...value, role },
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

        notify("success", "Staff de plataforma registrado exitosamente.");
        form.reset();
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Error inesperado");
      }
    },
  });

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
            onClick={() => router.push("/platform/users")}
            className="flex items-center gap-1 hover:opacity-70"
          >
            <ArrowLeft size={11} color={ui.text.muted} />
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
              Usuarios globales
            </span>
          </button>
          <span className="text-[11px] text-ui-text-muted">·</span>
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandPrimary-600">
            Nuevo staff
          </span>
        </div>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          Crear staff de plataforma
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Da de alta un admin o coach con alcance de toda la plataforma
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
                  placeholder="staff@ejemplo.com"
                  icon={<Mail size={15} color={ui.text.muted} />}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="email"
                  autoCapitalize="none"
                />
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
                disabled={isSubmitting || assignableRoles.length === 0}
                className={`flex w-full items-center justify-center gap-2 rounded-[13px] py-3 ${
                  isSubmitting || assignableRoles.length === 0
                    ? "bg-brandPrimary-400"
                    : "bg-brandPrimary-600 shadow-md shadow-brandPrimary-600/30 hover:bg-brandPrimary-700"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 size={15} color="#fff" className="animate-spin" />
                ) : (
                  <UserPlus size={15} color="#fff" />
                )}
                <span className="font-manrope text-sm font-bold text-white">
                  {isSubmitting ? "Registrando..." : "Registrar staff"}
                </span>
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
