"use client";

// Form de alta/edición de EJERCICIO del gym (página completa). Port a Next de
// apps/mobile FormExercise + admin/exercises/builder.jsx/[id].jsx. Reusa las
// primitivas del catálogo (catalog-ui) y la lógica de upload. Escribe gym-scoped
// vía useSaveAdminExercise. Ver [[project_default_catalog]].

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Film,
  Upload,
  Trash2,
  Check,
} from "lucide-react";

import {
  Field,
  Input,
  Textarea,
  Toggle,
  WebSelect,
  ErrorBanner,
  DeleteConfirmModal,
} from "@/components/platform/catalog/catalog-ui";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/catalog-options";
import { uploadImageWeb, uploadVideoWeb } from "@/lib/gyms";
import { mediaUrl } from "@/lib/media";
import {
  useGymEquipment,
  useSaveAdminExercise,
  useDeleteAdminExercise,
  type AdminExercise,
  type AdminExerciseEquipment,
  type AdminExerciseValues,
} from "@/lib/hooks/use-admin-exercises";

const MAX_VIDEO_MB = 50;
const VIDEO_ACCEPT = "video/mp4";

const fromExercise = (ex: AdminExercise | null): AdminExerciseValues =>
  ex
    ? {
        name: ex.name ?? "",
        category: ex.category ?? "fuerza",
        muscle_group: ex.muscle_group ?? "pecho",
        instructions: ex.instructions ?? "",
        youtube_video_url: ex.youtube_video_url ?? "",
        image_uri: ex.image_uri ?? null,
        video_uri: ex.video_uri ?? null,
        is_unilateral: !!ex.is_unilateral,
        equipments: ex.equipments ?? [],
      }
    : {
        name: "",
        category: "fuerza",
        muscle_group: "pecho",
        instructions: "",
        youtube_video_url: "",
        image_uri: null,
        video_uri: null,
        is_unilateral: false,
        equipments: [],
      };

export function AdminExerciseForm({
  gymId,
  initial,
}: {
  gymId: string | null;
  initial: AdminExercise | null;
}) {
  const router = useRouter();
  const saveExercise = useSaveAdminExercise(gymId);
  const deleteExercise = useDeleteAdminExercise();
  const { data: gymEquipment = [] } = useGymEquipment(gymId);

  const [values, setValues] = useState<AdminExerciseValues>(() =>
    fromExercise(initial)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const set =
    <K extends keyof AdminExerciseValues>(key: K) =>
    (v: AdminExerciseValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: v }));

  const toggleEquipment = (eq: AdminExerciseEquipment) => {
    setValues((prev) => {
      const has = prev.equipments.some((e) => e.id === eq.id);
      return {
        ...prev,
        equipments: has
          ? prev.equipments.filter((e) => e.id !== eq.id)
          : [...prev.equipments, eq],
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isMp4 =
      file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
    if (!isMp4) {
      setError("El video debe ser MP4 (H.264) para ser compatible con la app.");
      if (videoRef.current) videoRef.current.value = "";
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`El video supera el límite de ${MAX_VIDEO_MB} MB.`);
      if (videoRef.current) videoRef.current.value = "";
      return;
    }
    setError(null);
    setSelectedVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    setValues((prev) => ({ ...prev, video_uri: null }));
    if (videoRef.current) videoRef.current.value = "";
  };

  const handleSubmit = async () => {
    setError(null);
    if (values.name.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (!values.instructions.trim()) {
      setError("Las instrucciones son requeridas.");
      return;
    }
    if (!gymId) {
      setError("No hay un gimnasio activo.");
      return;
    }
    setIsSaving(true);
    try {
      let imageUri = values.image_uri;
      if (selectedFile) imageUri = await uploadImageWeb(selectedFile);
      let videoUri = values.video_uri;
      if (selectedVideo) videoUri = await uploadVideoWeb(selectedVideo);
      await saveExercise.mutateAsync({
        id: initial?.id,
        values: { ...values, image_uri: imageUri, video_uri: videoUri },
      });
      router.push("/admin/exercises");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el ejercicio.");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setDeleteError(null);
    try {
      await deleteExercise.mutateAsync(initial.id);
      router.push("/admin/exercises");
      router.refresh();
    } catch (err) {
      // 23503 = foreign_key_violation: el ejercicio está referenciado por sesiones.
      const e = err as { code?: string; message?: string };
      setDeleteError(
        e?.code === "23503"
          ? "No se puede eliminar: el ejercicio está en uso en una o más sesiones. Quitalo de esas sesiones primero."
          : e?.message || "No se pudo eliminar el ejercicio."
      );
    }
  };

  const imgToShow = useMemo(() => {
    if (previewUrl) return previewUrl;
    return mediaUrl(values.image_uri);
  }, [previewUrl, values.image_uri]);

  const videoToShow = useMemo(() => {
    if (videoPreviewUrl) return videoPreviewUrl;
    return mediaUrl(values.video_uri);
  }, [videoPreviewUrl, values.video_uri]);

  const pending = saveExercise.isPending || isSaving;

  return (
    <div className="p-4 pb-14 md:p-9">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/exercises")}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Ejercicios
          </span>
        </button>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          {initial ? "Editar ejercicio" : "Nuevo ejercicio"}
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          {initial
            ? "Modificá los datos del ejercicio del gimnasio"
            : "Agregá un ejercicio propio del gimnasio"}
        </p>
      </div>

      <div className="mx-auto w-full max-w-[680px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          {/* Imagen */}
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
              placeholder="Ej: Press de banca"
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
            />
          </Field>

          <div className="flex gap-4">
            <div className="flex-1">
              <Field label="CATEGORÍA">
                <WebSelect
                  value={values.category}
                  onChange={set("category")}
                  options={EXERCISE_CATEGORIES}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="GRUPO MUSCULAR">
                <WebSelect
                  value={values.muscle_group}
                  onChange={set("muscle_group")}
                  options={MUSCLE_GROUPS}
                />
              </Field>
            </div>
          </div>

          {/* Equipos */}
          <Field
            label="EQUIPOS"
            hint={
              gymEquipment.length === 0
                ? "Este gimnasio aún no tiene equipos cargados."
                : "Tocá para asociar los equipos que usa el ejercicio."
            }
          >
            <div className="flex flex-wrap gap-2">
              {gymEquipment.map((eq) => {
                const active = values.equipments.some((e) => e.id === eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition ${
                      active
                        ? "border-brandPrimary-600 bg-brandPrimary-50"
                        : "border-ui-input-border bg-white hover:bg-ui-background-light"
                    }`}
                  >
                    {active ? (
                      <Check size={12} className="text-brandPrimary-600" />
                    ) : (
                      <Dumbbell size={12} className="text-ui-text-muted" />
                    )}
                    <span
                      className={`font-manrope text-[12px] ${
                        active
                          ? "font-bold text-brandPrimary-700"
                          : "text-ui-text-main"
                      }`}
                    >
                      {eq.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="VIDEO YOUTUBE (OPCIONAL)">
            <Input
              placeholder="https://youtube.com/..."
              value={values.youtube_video_url}
              onChange={(e) => set("youtube_video_url")(e.target.value)}
              autoCapitalize="none"
            />
          </Field>

          <Field label="VIDEO PROPIO (OPCIONAL)">
            <input
              type="file"
              accept={VIDEO_ACCEPT}
              ref={videoRef}
              className="hidden"
              onChange={handleVideoFile}
            />
            {videoToShow ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={videoToShow}
                  controls
                  className="max-h-[200px] w-full rounded-xl bg-black"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => videoRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border border-ui-input-border bg-white py-2.5 transition hover:bg-ui-background-light"
                  >
                    <Upload size={14} className="text-ui-text-main" />
                    <span className="font-manrope text-[12px] font-semibold text-ui-text-main">
                      Reemplazar
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="flex items-center justify-center gap-2 rounded-[11px] bg-red-50 px-4 py-2.5 transition hover:bg-red-100"
                  >
                    <Trash2 size={14} color="#dc2626" />
                    <span className="font-manrope text-[12px] font-semibold text-red-600">
                      Quitar
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50 py-3 transition hover:bg-brandPrimary-100"
              >
                <Film size={16} className="text-brandPrimary-600" />
                <span className="font-manrope text-[12px] font-bold text-brandPrimary-600">
                  Subir video MP4 (máx {MAX_VIDEO_MB} MB)
                </span>
              </button>
            )}
          </Field>

          <Field label="INSTRUCCIONES">
            <Textarea
              value={values.instructions}
              onChange={(e) => set("instructions")(e.target.value)}
              placeholder="Describí la ejecución..."
              rows={4}
            />
          </Field>

          <Toggle
            label="Ejercicio unilateral"
            hint="Se ejecuta un lado a la vez (ej. mancuerna a una mano)."
            value={values.is_unilateral}
            onChange={set("is_unilateral")}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/exercises")}
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
            {pending ? "Guardando..." : initial ? "Guardar cambios" : "Crear ejercicio"}
          </button>
        </div>

        {initial && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] border border-red-200 bg-white py-2.5 font-manrope text-[13px] font-bold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} color="#dc2626" />
            Eliminar ejercicio
          </button>
        )}
      </div>

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar ejercicio"
        message={`Vas a eliminar “${values.name}”. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={deleteExercise.isPending}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
