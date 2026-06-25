"use client";

// Form de alta/edición de EQUIPO (máquina) del gym. Página completa. Port a Next
// de apps/mobile FormEquipment + admin/equipments/add/[edit]. Nombre + imagen.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check } from "lucide-react";

import { Field, Input, ErrorBanner } from "@/components/platform/catalog/catalog-ui";
import { uploadImageWeb } from "@/lib/gyms";
import { cloudinaryUrl } from "@/lib/cloudinary";
import {
  useSaveAdminEquipment,
  type AdminEquipment,
} from "@/lib/hooks/use-admin-equipment";

export function AdminEquipmentForm({
  gymId,
  initial,
}: {
  gymId: string | null;
  initial: AdminEquipment | null;
}) {
  const router = useRouter();
  const saveEquipment = useSaveAdminEquipment(gymId);

  const [name, setName] = useState(initial?.name ?? "");
  const [imageUri, setImageUri] = useState<string | null>(initial?.image_uri ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!gymId) {
      setError("No hay un gimnasio activo.");
      return;
    }
    setIsSaving(true);
    try {
      let finalImage = imageUri;
      if (selectedFile) finalImage = await uploadImageWeb(selectedFile);
      await saveEquipment.mutateAsync({
        id: initial?.id,
        values: { name, image_uri: finalImage },
      });
      router.push("/admin/equipments");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el equipo.");
      setIsSaving(false);
    }
  };

  const imgToShow = useMemo(() => {
    if (previewUrl) return previewUrl;
    return cloudinaryUrl(imageUri, "w_160,h_160,c_fill,f_auto,q_auto");
  }, [previewUrl, imageUri]);

  const pending = saveEquipment.isPending || isSaving;

  return (
    <div className="p-4 pb-14 md:p-9">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/equipments")}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Máquinas
          </span>
        </button>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          {initial ? "Editar máquina" : "Agregar máquina"}
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Registrá un elemento del inventario del gimnasio
        </p>
      </div>

      <div className="mx-auto w-full max-w-[520px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={handleFile}
          />
          <div className="flex flex-col items-center">
            <button type="button" onClick={() => fileRef.current?.click()}>
              {imgToShow ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgToShow}
                  alt=""
                  className="h-24 w-24 rounded-[18px] object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[18px] border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50">
                  <Plus size={22} className="text-brandPrimary-600" />
                </div>
              )}
            </button>
            <span className="mt-2 font-manrope text-[11px] text-ui-text-muted">
              Imagen (opcional)
            </span>
          </div>

          <Field label="NOMBRE">
            <Input
              placeholder="Ej: Prensa de piernas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/equipments")}
            className="flex-1 rounded-[11px] border border-ui-input-border bg-white py-2.5 text-center font-manrope text-[13px] font-semibold text-ui-text-main transition hover:bg-ui-background-light"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[11px] py-2.5 font-manrope text-[13px] font-bold text-white ${
              pending
                ? "bg-brandPrimary-400"
                : "bg-brandPrimary-600 hover:bg-brandPrimary-700"
            }`}
          >
            <Check size={15} color="#fff" />
            {pending ? "Guardando..." : initial ? "Guardar cambios" : "Agregar máquina"}
          </button>
        </div>
      </div>
    </div>
  );
}
