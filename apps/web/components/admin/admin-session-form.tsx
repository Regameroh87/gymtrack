"use client";

// Builder de SESIÓN del gym (página completa). Port a Next de apps/mobile
// admin/sessions/builder.jsx + FormSession. Reusa la UI del builder de catálogo
// (sessions-section.tsx) y los building blocks de catalog-ui. Cover, nombre, nivel,
// descripción y picker de ejercicios del gym con reorder ↑/↓.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

import {
  Field,
  Input,
  Textarea,
  WebSelect,
  CoverPicker,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
} from "@/components/platform/catalog/catalog-ui";
import { uploadImageWeb } from "@/lib/gyms";
import { cloudinaryUrl } from "@/lib/cloudinary";
import {
  useSaveAdminSession,
  useDeleteAdminSession,
  useGymExercisesForPicker,
  SESSION_LEVELS,
  type AdminSession,
  type AdminSessionValues,
  type SessionExerciseRow,
  type PickerExercise,
} from "@/lib/hooks/use-admin-sessions";

const EMPTY: AdminSessionValues = {
  name: "",
  description: "",
  level: "",
  cover_image_uri: null,
  exercises: [],
};

export function AdminSessionForm({
  gymId,
  initial,
}: {
  gymId: string | null;
  initial: AdminSession | null;
}) {
  const router = useRouter();
  const saveSession = useSaveAdminSession(gymId);
  const deleteSession = useDeleteAdminSession();
  const editingId = initial?.id ?? null;

  const [values, setValues] = useState<AdminSessionValues>(() =>
    initial
      ? {
          name: initial.name ?? "",
          description: initial.description ?? "",
          level: initial.level ?? "",
          cover_image_uri: initial.cover_image_uri ?? null,
          exercises: initial.exercises ?? [],
        }
      : EMPTY
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set =
    <K extends keyof AdminSessionValues>(key: K) =>
    (v: AdminSessionValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const addExercise = (ex: PickerExercise) => {
    setValues((prev) => {
      if (prev.exercises.some((e) => e.exercise_id === ex.id)) return prev;
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            id: null,
            exercise_id: ex.id,
            name: ex.name,
            muscle_group: ex.muscle_group,
            image_uri: ex.image_uri,
          },
        ],
      };
    });
  };

  const removeExercise = (idx: number) =>
    setValues((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx),
    }));

  const moveExercise = (idx: number, dir: number) =>
    setValues((prev) => {
      const next = [...prev.exercises];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, exercises: next };
    });

  const handleSubmit = async () => {
    setError(null);
    if (values.name.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (values.exercises.length === 0) {
      setError("Agregá al menos un ejercicio.");
      return;
    }
    if (!editingId && !gymId) {
      setError("No hay un gimnasio activo.");
      return;
    }
    setIsSaving(true);
    try {
      let coverUri = values.cover_image_uri;
      if (selectedFile) coverUri = await uploadImageWeb(selectedFile);
      await saveSession.mutateAsync({
        id: editingId,
        values: { ...values, cover_image_uri: coverUri },
      });
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar la sesión.");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setDeleteError(null);
    try {
      await deleteSession.mutateAsync(editingId);
      router.push("/admin/sessions");
      router.refresh();
    } catch (err) {
      setDeleteError(
        (err as Error)?.message || "No se pudo eliminar la sesión."
      );
    }
  };

  const coverSrc = previewUrl ?? cloudinaryUrl(values.cover_image_uri);
  const pending = saveSession.isPending || isSaving;

  return (
    <div className="p-4 pb-14 md:p-9">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/sessions")}
          className="mb-1.5 flex items-center gap-1 transition hover:opacity-70"
        >
          <ArrowLeft size={11} className="text-ui-text-muted" />
          <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-ui-text-muted">
            Sesiones
          </span>
        </button>
        <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-ui-text-main">
          {editingId ? "Editar sesión" : "Armar sesión"}
        </h1>
        <p className="mt-1 font-manrope text-xs text-ui-text-muted">
          Plantilla técnica reutilizable para armar planes semanales
        </p>
      </div>

      <div className="mx-auto w-full max-w-[560px] rounded-[20px] border border-ui-input-border bg-white p-8">
        <ErrorBanner message={error} />

        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            className="hidden"
            onChange={handleFile}
          />
          <CoverPicker src={coverSrc} onPick={() => fileRef.current?.click()} />

          <Field label="NOMBRE">
            <Input
              placeholder="Ej: Full Body Fuerza A"
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
            />
          </Field>

          <Field label="NIVEL">
            <WebSelect
              value={values.level}
              onChange={set("level")}
              options={SESSION_LEVELS}
              placeholder="Sin nivel"
            />
          </Field>

          <Field label="DESCRIPCIÓN (OPCIONAL)">
            <Textarea
              value={values.description}
              onChange={(e) => set("description")(e.target.value)}
              placeholder="Filosofía de la sesión, cómo progresar, notas..."
              rows={3}
            />
          </Field>

          <div className="mt-1 flex items-center justify-between">
            <span className="font-manrope text-[10px] font-bold uppercase tracking-[1.2px] text-ui-text-muted">
              Ejercicios ({values.exercises.length})
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brandPrimary-50 px-3 py-1.5 transition hover:bg-brandPrimary-100"
            >
              <Plus size={13} className="text-brandPrimary-600" />
              <span className="font-manrope text-[12px] font-bold text-brandPrimary-600">
                Agregar
              </span>
            </button>
          </div>

          {values.exercises.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-ui-input-border py-6">
              <span className="font-manrope text-[12px] text-ui-text-muted">
                Buscá y agregá ejercicios del catálogo del gym.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {values.exercises.map((ex, idx) => (
                <SessionExerciseItem
                  key={ex.exercise_id}
                  ex={ex}
                  idx={idx}
                  last={idx === values.exercises.length - 1}
                  onUp={() => moveExercise(idx, -1)}
                  onDown={() => moveExercise(idx, 1)}
                  onRemove={() => removeExercise(idx)}
                />
              ))}
            </div>
          )}
        </div>

        <FormActions
          onCancel={() => router.push("/admin/sessions")}
          onSubmit={handleSubmit}
          isPending={pending}
          submitLabel={editingId ? "Guardar cambios" : "Guardar sesión"}
        />

        {editingId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[11px] border border-red-200 bg-white py-2.5 font-manrope text-[13px] font-bold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={14} color="#dc2626" />
            Eliminar sesión
          </button>
        )}
      </div>

      <ExercisePickerModal
        visible={pickerOpen}
        gymId={gymId}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        selectedIds={values.exercises.map((e) => e.exercise_id)}
      />

      <DeleteConfirmModal
        visible={confirmDelete}
        title="Eliminar sesión"
        message={`Vas a eliminar “${values.name}”. Los días de planes que la usaban quedarán sin sesión. Esta acción no se puede deshacer.`}
        error={deleteError}
        isPending={deleteSession.isPending}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function SessionExerciseItem({
  ex,
  idx,
  last,
  onUp,
  onDown,
  onRemove,
}: {
  ex: SessionExerciseRow;
  idx: number;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const thumb = cloudinaryUrl(ex.image_uri, "w_72,h_72,c_fill,f_auto,q_auto");
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ui-input-light bg-ui-background-light px-3 py-2">
      <span className="w-4 font-manrope text-[12px] font-bold text-ui-text-muted">
        {idx + 1}
      </span>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="h-[34px] w-[34px] rounded-lg object-cover" />
      ) : (
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg bg-brandPrimary-50">
          <Dumbbell size={14} className="text-brandPrimary-600" />
        </div>
      )}
      <div className="flex-1">
        <p className="font-manrope text-[13px] font-bold text-ui-text-main">
          {ex.name}
        </p>
        <p className="font-manrope text-[11px] capitalize text-ui-text-muted">
          {ex.muscle_group}
        </p>
      </div>
      <button
        type="button"
        onClick={onUp}
        disabled={idx === 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white disabled:opacity-30"
      >
        <ChevronUp size={14} className="text-ui-text-main" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={last}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white disabled:opacity-30"
      >
        <ChevronDown size={14} className="text-ui-text-main" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 transition hover:bg-red-100"
      >
        <Trash2 size={13} color="#dc2626" />
      </button>
    </div>
  );
}

// Picker de ejercicios del GYM con búsqueda (adaptado del catálogo).
function ExercisePickerModal({
  visible,
  gymId,
  onClose,
  onPick,
  selectedIds = [],
}: {
  visible: boolean;
  gymId: string | null;
  onClose: () => void;
  onPick: (ex: PickerExercise) => void;
  selectedIds?: string[];
}) {
  const { data: exercises = [], isLoading } = useGymExercisesForPicker(gymId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.muscle_group?.toLowerCase().includes(q)
    );
  }, [exercises, query]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[20px] border border-ui-input-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-ui-input-light px-5 pb-3 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-jakarta text-[16px] font-bold tracking-tight text-ui-text-main">
              Ejercicios del gym
            </h3>
            <button type="button" onClick={onClose}>
              <X size={18} className="text-ui-text-muted" />
            </button>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-ui-input-border bg-ui-background-light px-3.5 py-2.5">
            <Search size={15} className="text-ui-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="flex-1 bg-transparent font-manrope text-[13px] text-ui-text-main outline-none placeholder:text-ui-text-muted"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-brandPrimary-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center font-manrope text-[12px] text-ui-text-muted">
              {exercises.length === 0
                ? "Este gym todavía no tiene ejercicios."
                : "Sin resultados."}
            </p>
          ) : (
            filtered.map((ex) => {
              const added = selectedIds.includes(ex.id);
              const thumb = cloudinaryUrl(
                ex.image_uri,
                "w_72,h_72,c_fill,f_auto,q_auto"
              );
              return (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => !added && onPick(ex)}
                  disabled={added}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                    added
                      ? "opacity-40"
                      : "transition hover:bg-ui-background-light"
                  }`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brandPrimary-50">
                      <Dumbbell size={14} className="text-brandPrimary-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-manrope text-[13px] font-bold text-ui-text-main">
                      {ex.name}
                    </p>
                    <p className="font-manrope text-[11px] capitalize text-ui-text-muted">
                      {ex.muscle_group}
                    </p>
                  </div>
                  {added ? (
                    <span className="font-manrope text-[11px] font-semibold text-ui-text-muted">
                      Agregado
                    </span>
                  ) : (
                    <Plus size={16} className="text-brandPrimary-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
