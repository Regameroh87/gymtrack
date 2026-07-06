"use client";

// Helpers de UI compartidos por las secciones del catálogo (ejercicios, sesiones,
// planes). Port a DOM/Tailwind de los _form helpers de Expo (gyms/_form.jsx +
// catalog/_form-web.jsx). Mantienen el lenguaje visual del panel.

import type { ReactNode } from "react";
import { Loader2, Check, Trash2, X, Plus } from "lucide-react";

import type { Option } from "@/lib/catalog-options";

// ── Picker de portada cuadrada. `src` ya resuelto (preview local o URL de Storage). ──
export function CoverPicker({
  src,
  onPick,
  label = "Portada (opcional)",
}: {
  src: string | null;
  onPick: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={onPick}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="h-28 w-28 rounded-[20px] object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-[20px] border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50">
            <Plus size={24} className="text-brandPrimary-600" />
          </div>
        )}
      </button>
      <span className="mt-2 font-manrope text-[11px] text-ui-text-muted">
        {label}
      </span>
    </div>
  );
}

// ── Campo etiquetado ──
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
    <div className="flex flex-col gap-1.5">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
        {label}
      </span>
      {children}
      {error ? (
        <span className="font-manrope text-[11px] text-red-500">{error}</span>
      ) : hint ? (
        <span className="font-manrope text-[11px] text-ui-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

// ── Input de texto ──
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-[#eae8f4] px-3.5 py-2.5">
      <input
        {...props}
        className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
      />
    </div>
  );
}

// ── Textarea ──
export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className="min-h-24 rounded-xl border border-ui-input-border bg-[#eae8f4] p-3.5 font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
    />
  );
}

// ── Select nativo estilado ──
export function WebSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <div className="rounded-xl border border-ui-input-border bg-[#eae8f4] px-1">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer bg-transparent px-2 py-2.5 font-manrope text-[13px] text-ui-text-main outline-none"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Switch on/off ──
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
      className="flex items-center justify-between gap-3 rounded-xl border border-ui-input-border bg-white px-3.5 py-3 text-left transition hover:bg-ui-background-light"
    >
      <span className="flex-1">
        <span className="block font-manrope text-[13px] font-bold text-ui-text-main">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block font-manrope text-[11px] text-ui-text-muted">
            {hint}
          </span>
        ) : null}
      </span>
      <span
        className={`flex h-[24px] w-[42px] items-center rounded-full px-[3px] ${
          value ? "justify-end bg-brandPrimary-600" : "justify-start bg-ui-input-border"
        }`}
      >
        <span className="h-[18px] w-[18px] rounded-full bg-white" />
      </span>
    </button>
  );
}

// ── Banner de error inline ──
export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <X size={14} color="#dc2626" />
      <span className="flex-1 font-manrope text-xs font-semibold text-red-600">
        {message}
      </span>
    </div>
  );
}

// ── Cancelar / Guardar ──
export function FormActions({
  onCancel,
  onSubmit,
  isPending,
  submitLabel,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  isPending?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-[11px] border border-ui-input-border bg-white py-2.5 text-center font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isPending}
        className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 font-manrope text-[13px] font-bold text-white transition active:scale-[0.97] disabled:opacity-60 ${
          isPending ? "bg-brandPrimary-400" : "btn-gradient shadow-btn-brand hover:shadow-btn-hover"
        }`}
      >
        {isPending ? (
          <Loader2 size={15} color="#fff" className="animate-spin" />
        ) : (
          <Check size={15} color="#fff" />
        )}
        {isPending ? "Guardando..." : submitLabel ?? "Guardar"}
      </button>
    </div>
  );
}

// ── Overlay centrado para modales ──
export function ModalShell({
  children,
  maxWidth = 520,
  onClose,
}: {
  children: ReactNode;
  maxWidth?: number;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-[20px] border border-ui-input-border bg-white p-7 shadow-card-brand"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Confirmación de borrado ──
export function DeleteConfirmModal({
  visible,
  title,
  message,
  error,
  isPending,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  error?: string | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;
  return (
    <ModalShell maxWidth={420} onClose={onCancel}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
          <Trash2 size={18} color="#dc2626" />
        </div>
        <span className="font-jakarta text-[16px] font-bold tracking-tight text-ui-text-main">
          {title}
        </span>
      </div>
      <p className="mb-5 font-manrope text-[12px] leading-5 text-ui-text-muted">
        {message}
      </p>
      <ErrorBanner message={error} />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[11px] border border-ui-input-border bg-white py-2.5 text-center font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 font-manrope text-[13px] font-bold text-white ${
            isPending ? "bg-red-300" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isPending ? (
            <Loader2 size={14} color="#fff" className="animate-spin" />
          ) : (
            <Trash2 size={14} color="#fff" />
          )}
          Eliminar
        </button>
      </div>
    </ModalShell>
  );
}
