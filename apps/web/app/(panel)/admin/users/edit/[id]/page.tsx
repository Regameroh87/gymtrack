"use client";

// Edición de datos de un socio (admin+). Port a Next de apps/mobile
// admin/users/edit/[id].jsx. Campos: name, last_name, phone, document_number,
// address, gender. Escribe a profiles vía use-admin-member (supabase directo).

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useMemberDetail } from "@gymtrack/core/hooks/users/use-member-detail";
import { useActiveGym } from "@/components/auth/active-gym-provider";
import { useUserRole } from "@/components/auth/use-user-role";
import {
  useUpdateMember,
  normLower,
  type MemberProfileUpdate,
} from "@/lib/hooks/use-admin-member";
import { PROFILE_GENDERS } from "@/lib/gender-options";
import {
  Field,
  Input,
  ErrorBanner,
  FormActions,
} from "@/components/platform/catalog/catalog-ui";

/* eslint-disable @typescript-eslint/no-explicit-any */

type FormState = {
  name: string;
  last_name: string;
  phone: string;
  document_number: string;
  address: string;
  gender: string;
};

const EMPTY: FormState = {
  name: "",
  last_name: "",
  phone: "",
  document_number: "",
  address: "",
  gender: "",
};

export default function EditMemberPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { gymId } = useActiveGym();
  const { isAdmin } = useUserRole();

  const { data, isLoading } = useMemberDetail(id, gymId);
  const updateMember = useUpdateMember(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = (data as any)?.profile;
    if (!p) return;
    setForm({
      name: p.name ?? "",
      last_name: p.last_name ?? "",
      phone: p.phone ?? "",
      document_number: p.document_number ?? "",
      address: p.address ?? "",
      gender: p.gender ?? "",
    });
  }, [data]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (val: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setError(null);
    if (form.name.trim().length < 2) {
      setError("El nombre es obligatorio.");
      return;
    }
    const payload: MemberProfileUpdate = {
      name: normLower(form.name),
      last_name: normLower(form.last_name),
      phone: form.phone?.trim() || null,
      document_number: form.document_number?.trim() || null,
      address: normLower(form.address),
      gender: form.gender || null,
    };
    try {
      await updateMember.mutateAsync(payload);
      router.push(`/admin/users/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={22} className="animate-spin text-brandPrimary-600" />
      </div>
    );
  }

  // Editar datos es administrativo (admin+).
  if (!isAdmin) {
    return (
      <div className="p-9">
        <p className="font-manrope text-sm text-ui-text-muted">
          No tenés permisos para editar este socio.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-14 md:p-9">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push(`/admin/users/${id}`)}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Ficha
          </span>
        </button>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          Editar datos
        </h1>
      </div>

      <div className="mx-auto w-full max-w-[520px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          <Field label="NOMBRE(S)">
            <Input
              placeholder="Ej: Juan Pablo"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
            />
          </Field>
          <Field label="APELLIDO(S)">
            <Input
              placeholder="Ej: Pérez García"
              value={form.last_name}
              onChange={(e) => set("last_name")(e.target.value)}
            />
          </Field>
          <Field label="TELÉFONO">
            <Input
              placeholder="123456789"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="N° DE DOCUMENTO">
            <Input
              placeholder="12345678"
              value={form.document_number}
              onChange={(e) => set("document_number")(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="DIRECCIÓN">
            <Input
              placeholder="Ej: Calle 123"
              value={form.address}
              onChange={(e) => set("address")(e.target.value)}
            />
          </Field>
          <Field label="GÉNERO (OPCIONAL)">
            <div className="flex flex-wrap gap-2">
              {PROFILE_GENDERS.map((g) => {
                const active = form.gender === g.value;
                return (
                  <button
                    type="button"
                    key={g.value}
                    onClick={() => set("gender")(active ? "" : g.value)}
                    className={`rounded-xl border px-4 py-2 font-manrope text-[13px] font-semibold transition ${
                      active
                        ? "border-brandPrimary-600 bg-brandPrimary-600 text-white"
                        : "border-ui-input-border bg-white text-ui-text-muted hover:bg-ui-background-light"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <FormActions
          onCancel={() => router.push(`/admin/users/${id}`)}
          onSubmit={handleSubmit}
          isPending={updateMember.isPending}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
