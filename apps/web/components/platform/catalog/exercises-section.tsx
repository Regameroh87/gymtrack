"use client";

// Sección EJERCICIOS del catálogo (super_admin). Port a Next de apps/mobile
// platform/catalog/_exercises-section-web.jsx: lista read-only de la biblioteca
// central + alta/edición (con upload de imagen y video) + drawer de detalle.
// Escribe directo a Supabase (is_catalog=true, gym_id=null). Ver
// [[project_default_catalog]].

import { useMemo, useRef, useState } from "react";
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  X,
  Film,
  Upload,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";

import {
  useCatalogExercisesAdmin,
  useSaveCatalogExercise,
  useDeleteCatalogExercise,
  type CatalogExercise,
  type CatalogExerciseValues,
} from "@/lib/hooks/use-catalog-admin";
import { uploadImageWeb, uploadVideoWeb } from "@/lib/gyms";
import { mediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/media-image";
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  labelOf,
} from "@/lib/catalog-options";
import {
  Field,
  Input,
  Textarea,
  Toggle,
  WebSelect,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
  ModalShell,
} from "./catalog-ui";

// Límite alineado con el picker mobile (use-media-picker 50MB).
const MAX_VIDEO_MB = 50;
const VIDEO_ACCEPT = "video/mp4";

const EMPTY_FORM: CatalogExerciseValues = {
  name: "",
  category: "fuerza",
  muscle_group: "pecho",
  instructions: "",
  youtube_video_url: "",
  image_uri: null,
  video_uri: null,
  is_unilateral: false,
};

export function CatalogExercisesSection() {
  const { data: exercises = [], isLoading } = useCatalogExercisesAdmin();
  const deleteExercise = useDeleteCatalogExercise();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogExercise | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogExercise | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogExercise | null>(null);

  const askDelete = (ex: CatalogExercise) => {
    setDeleteError(null);
    setConfirmDelete(ex);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ex: CatalogExercise) => {
    setEditing(ex);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteError(null);
    try {
      await deleteExercise.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      // 23503 = foreign_key_violation: el ejercicio está referenciado por sesiones o
      // registros del catálogo (FKs ON DELETE NO ACTION).
      const e = err as { code?: string; message?: string };
      const inUse = e?.code === "23503";
      setDeleteError(
        inUse
          ? "No se puede eliminar: el ejercicio está en uso en sesiones o registros del catálogo. Quitalo de esas sesiones primero."
          : e?.message || "No se pudo eliminar."
      );
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <p className="flex-1 font-manrope text-xs text-ui-text-muted">
          Biblioteca central read-only. Los gimnasios con el catálogo activado la
          ven en sus pickers; para editar, sus coaches la guardan en custom.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700"
        >
          <Plus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Nuevo ejercicio
          </span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-[880px] overflow-hidden rounded-[20px] border border-ui-input-border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-brandPrimary-600" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandPrimary-50">
              <Dumbbell size={20} className="text-brandPrimary-600" />
            </div>
            <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
              El catálogo está vacío
            </p>
            <p className="font-manrope text-xs text-ui-text-muted">
              Agregá el primer ejercicio con “Nuevo ejercicio”.
            </p>
          </div>
        ) : (
          exercises.map((ex, i) => {
            const thumb = mediaUrl(ex.image_uri);
            return (
              <div
                key={ex.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${
                  i > 0 ? "border-t border-ui-input-light" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setDetail(ex)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <MediaImage
                    src={thumb}
                    wrapperClassName="h-11 w-11 rounded-[10px]"
                    fallback={
                      <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-brandPrimary-50">
                        <Dumbbell size={16} className="text-brandPrimary-600" />
                      </div>
                    }
                  />
                  <div className="flex-1">
                    <p className="font-manrope text-[14px] font-bold text-ui-text-main">
                      {ex.name}
                    </p>
                    <p className="mt-0.5 font-manrope text-[11px] capitalize text-ui-text-muted">
                      {ex.category} · {ex.muscle_group}
                      {ex.is_unilateral ? " · unilateral" : ""}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(ex)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ui-background-light transition hover:bg-ui-input-light"
                >
                  <Pencil size={14} className="text-ui-text-main" />
                </button>
                <button
                  type="button"
                  onClick={() => askDelete(ex)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
                >
                  <Trash2 size={14} color="#dc2626" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Form alta/edición — montado condicionalmente para resetear estado al cerrar */}
      {formOpen && (
        <ExerciseFormModal
          exercise={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      {detail && (
        <ExerciseDetailDrawer
          exercise={detail}
          onClose={() => setDetail(null)}
          onEdit={(ex) => {
            setDetail(null);
            openEdit(ex);
          }}
          onDelete={(ex) => {
            setDetail(null);
            askDelete(ex);
          }}
        />
      )}

      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Eliminar del catálogo"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los gimnasios dejarán de verlo. Los forks a custom que ya lo referencian podrían quedar sin resolver.`}
        error={deleteError}
        isPending={deleteExercise.isPending}
        onCancel={() => {
          setConfirmDelete(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Modal de alta/edición ──
function ExerciseFormModal({
  exercise,
  onClose,
}: {
  exercise: CatalogExercise | null;
  onClose: () => void;
}) {
  const saveExercise = useSaveCatalogExercise();

  const [values, setValues] = useState<CatalogExerciseValues>(() =>
    exercise
      ? {
          name: exercise.name ?? "",
          category: exercise.category ?? "fuerza",
          muscle_group: exercise.muscle_group ?? "pecho",
          instructions: exercise.instructions ?? "",
          youtube_video_url: exercise.youtube_video_url ?? "",
          image_uri: exercise.image_uri ?? null,
          video_uri: exercise.video_uri ?? null,
          is_unilateral: !!exercise.is_unilateral,
        }
      : EMPTY_FORM
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const set =
    <K extends keyof CatalogExerciseValues>(key: K) =>
    (v: CatalogExerciseValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: v }));

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
    setIsSaving(true);
    try {
      let imageUri = values.image_uri;
      if (selectedFile) imageUri = await uploadImageWeb(selectedFile);
      let videoUri = values.video_uri;
      if (selectedVideo) videoUri = await uploadVideoWeb(selectedVideo);
      await saveExercise.mutateAsync({
        id: exercise?.id,
        values: { ...values, image_uri: imageUri, video_uri: videoUri },
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar el ejercicio.");
      setIsSaving(false);
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

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-jakarta text-[18px] font-bold tracking-tight text-ui-text-main">
          {exercise ? "Editar ejercicio" : "Nuevo ejercicio"}
        </h2>
        <button type="button" onClick={onClose}>
          <X size={18} className="text-ui-text-muted" />
        </button>
      </div>

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
            <MediaImage
              src={imgToShow}
              wrapperClassName="h-24 w-24 rounded-[18px]"
              fallback={
                <div className="flex h-24 w-24 items-center justify-center rounded-[18px] border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50">
                  <Plus size={22} className="text-brandPrimary-600" />
                </div>
              }
            />
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

      <FormActions
        onCancel={onClose}
        onSubmit={handleSubmit}
        isPending={saveExercise.isPending || isSaving}
      />
    </ModalShell>
  );
}

// ── Drawer lateral de detalle ──
function ExerciseDetailDrawer({
  exercise,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: CatalogExercise;
  onClose: () => void;
  onEdit: (ex: CatalogExercise) => void;
  onDelete: (ex: CatalogExercise) => void;
}) {
  const heroUrl = mediaUrl(exercise.image_uri);
  const videoUrl = mediaUrl(exercise.video_uri);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-[440px] overflow-y-auto border-l border-ui-input-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-jakarta text-[18px] font-bold tracking-tight text-ui-text-main">
              Detalle
            </h2>
            <button type="button" onClick={onClose}>
              <X size={18} className="text-ui-text-muted" />
            </button>
          </div>

          <MediaImage
            src={heroUrl}
            wrapperClassName="aspect-square w-full rounded-[18px]"
            fallback={
              <div className="flex aspect-square w-full items-center justify-center rounded-[18px] bg-brandPrimary-50">
                <Dumbbell size={40} className="text-brandPrimary-600" />
              </div>
            }
          />

          <h3 className="mt-4 font-jakarta text-[20px] font-bold tracking-tight text-ui-text-main">
            {exercise.name}
          </h3>
          <p className="mt-1 font-manrope text-[12px] text-ui-text-muted">
            {labelOf(EXERCISE_CATEGORIES, exercise.category)} ·{" "}
            {labelOf(MUSCLE_GROUPS, exercise.muscle_group)}
          </p>

          {exercise.is_unilateral ? (
            <span className="mt-3 inline-block rounded-full bg-brandPrimary-50 px-2.5 py-1 font-manrope text-[11px] font-bold text-brandPrimary-600">
              Unilateral
            </span>
          ) : null}

          {videoUrl ? (
            <div className="mt-6">
              <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
                VIDEO
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={videoUrl}
                controls
                className="max-h-[220px] w-full rounded-xl bg-black"
              />
            </div>
          ) : null}

          {exercise.youtube_video_url ? (
            <div className="mt-6">
              <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
                VIDEO YOUTUBE
              </p>
              <a
                href={exercise.youtube_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-ui-input-border bg-white p-3 transition hover:bg-ui-background-light"
              >
                <LinkIcon size={14} className="text-brandPrimary-600" />
                <span className="flex-1 truncate font-manrope text-[12px] font-semibold text-brandPrimary-600">
                  {exercise.youtube_video_url}
                </span>
              </a>
            </div>
          ) : null}

          {exercise.instructions ? (
            <div className="mt-6">
              <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
                INSTRUCCIONES
              </p>
              <p className="font-manrope text-[13px] leading-5 text-ui-text-main">
                {exercise.instructions}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => onEdit(exercise)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-brandPrimary-600 py-2.5 transition hover:bg-brandPrimary-700"
            >
              <Pencil size={14} color="#fff" />
              <span className="font-manrope text-[13px] font-bold text-white">
                Editar
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(exercise)}
              className="flex items-center justify-center gap-2 rounded-[11px] bg-red-50 px-5 py-2.5 transition hover:bg-red-100"
            >
              <Trash2 size={14} color="#dc2626" />
              <span className="font-manrope text-[13px] font-bold text-red-600">
                Eliminar
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
