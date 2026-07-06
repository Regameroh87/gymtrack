"use client";

// Sección SESIONES del catálogo (super_admin). Port a Next de apps/mobile
// platform/catalog/_sessions-section-web.jsx: lista + builder (cover, ejercicios
// ordenables vía picker del catálogo) + drawer de detalle. Guarda por el RPC
// save_catalog_session. Ver [[project_default_catalog]].

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";

import {
  useCatalogSessionsAdmin,
  useSaveCatalogSession,
  useDeleteCatalogSession,
  useCatalogSessionExercises,
  fetchCatalogSessionExercises,
  SESSION_LEVELS,
  type CatalogSession,
  type CatalogSessionValues,
  type SessionExerciseRow,
} from "@/lib/hooks/use-catalog-sessions";
import {
  useCatalogExercisesAdmin,
  type CatalogExercise,
} from "@/lib/hooks/use-catalog-admin";
import { uploadImageWeb } from "@/lib/gyms";
import { mediaUrl } from "@/lib/media";
import { labelOf } from "@/lib/catalog-options";
import {
  Field,
  Input,
  Textarea,
  WebSelect,
  CoverPicker,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
  ModalShell,
} from "./catalog-ui";

const EMPTY: CatalogSessionValues = {
  name: "",
  description: "",
  level: "",
  cover_image_uri: null,
  exercises: [],
};

export function CatalogSessionsSection() {
  const { data: sessions = [], isLoading } = useCatalogSessionsAdmin();
  const deleteSession = useDeleteCatalogSession();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogSession | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CatalogSession | null>(
    null
  );
  const [detail, setDetail] = useState<CatalogSession | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: CatalogSession) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSession.mutateAsync(confirmDelete.id);
    } catch {
      // La invalidación reflejará el estado real; cerramos igual.
    }
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <p className="flex-1 font-manrope text-xs text-ui-text-muted">
          Rutinas pre-armadas con ejercicios del catálogo. Los gimnasios con el
          catálogo activado las ven read-only; para editarlas, las guardan en
          custom.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-600 px-4 py-2.5 shadow-md shadow-brandPrimary-600/30 transition hover:bg-brandPrimary-700"
        >
          <Plus size={15} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Nueva sesión
          </span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-[880px] overflow-hidden rounded-[20px] border border-ui-input-border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-brandPrimary-600" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No hay sesiones de catálogo"
            hint="Creá la primera con “Nueva sesión”."
          />
        ) : (
          sessions.map((s, i) => (
            <SessionRow
              key={s.id}
              session={s}
              first={i === 0}
              onView={() => setDetail(s)}
              onEdit={() => openEdit(s)}
              onDelete={() => setConfirmDelete(s)}
            />
          ))
        )}
      </div>

      {formOpen && (
        <SessionFormModal
          session={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      {detail && (
        <SessionDetailDrawer
          session={detail}
          onClose={() => setDetail(null)}
          onEdit={(s) => {
            setDetail(null);
            openEdit(s);
          }}
          onDelete={(s) => {
            setDetail(null);
            setConfirmDelete(s);
          }}
        />
      )}

      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Eliminar sesión"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los días de planes de catálogo que la usaban quedarán sin sesión.`}
        isPending={deleteSession.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ── Builder de sesión ──
function SessionFormModal({
  session,
  onClose,
}: {
  session: CatalogSession | null;
  onClose: () => void;
}) {
  const saveSession = useSaveCatalogSession();
  const editingId = session?.id ?? null;

  const [values, setValues] = useState<CatalogSessionValues>(() =>
    session
      ? {
          name: session.name ?? "",
          description: session.description ?? "",
          level: session.level ?? "",
          cover_image_uri: session.cover_image_uri ?? null,
          exercises: [],
        }
      : EMPTY
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!session);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hidratar ejercicios en edición (la lista solo trae el header de la sesión).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const exercises = await fetchCatalogSessionExercises(session.id);
        if (cancelled) return;
        setValues((prev) => ({ ...prev, exercises }));
      } catch (err) {
        if (!cancelled)
          setError(
            (err as Error)?.message || "No se pudieron cargar los ejercicios."
          );
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const set =
    <K extends keyof CatalogSessionValues>(key: K) =>
    (v: CatalogSessionValues[K]) =>
      setValues((prev) => ({ ...prev, [key]: v }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const addExercise = (ex: CatalogExercise) => {
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
    setIsSaving(true);
    try {
      let coverUri = values.cover_image_uri;
      if (selectedFile) coverUri = await uploadImageWeb(selectedFile);
      await saveSession.mutateAsync({
        id: editingId,
        values: { ...values, cover_image_uri: coverUri },
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo guardar la sesión.");
      setIsSaving(false);
    }
  };

  const coverSrc = previewUrl ?? mediaUrl(values.cover_image_uri);

  return (
    <>
      <ModalShell maxWidth={560} onClose={onClose}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-jakarta text-[18px] font-bold tracking-tight text-ui-text-main">
            {editingId ? "Editar sesión" : "Nueva sesión"}
          </h2>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-ui-text-muted" />
          </button>
        </div>

        <ErrorBanner message={error} />

        {loadingEdit ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-brandPrimary-600" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              className="hidden"
              onChange={handleFile}
            />
            <CoverPicker
              src={coverSrc}
              onPick={() => fileRef.current?.click()}
            />

            <Field label="NOMBRE">
              <Input
                placeholder="Ej: Empuje superior"
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
                placeholder="Breve descripción de la rutina..."
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
                  Todavía no agregaste ejercicios.
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
        )}

        {!loadingEdit && (
          <FormActions
            onCancel={onClose}
            onSubmit={handleSubmit}
            isPending={saveSession.isPending || isSaving}
          />
        )}
      </ModalShell>

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        selectedIds={values.exercises.map((e) => e.exercise_id)}
      />
    </>
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
  const thumb = mediaUrl(ex.image_uri);
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

function SessionRow({
  session,
  first,
  onView,
  onEdit,
  onDelete,
}: {
  session: CatalogSession;
  first: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = mediaUrl(session.cover_image_uri);
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 ${
        first ? "" : "border-t border-ui-input-light"
      }`}
    >
      <button
        type="button"
        onClick={onView}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-11 w-11 rounded-[10px] object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-brandPrimary-50">
            <Dumbbell size={16} className="text-brandPrimary-600" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-manrope text-[14px] font-bold text-ui-text-main">
            {session.name}
          </p>
          <p className="mt-0.5 font-manrope text-[11px] capitalize text-ui-text-muted">
            {session.exercise_count} ejercicio
            {session.exercise_count === 1 ? "" : "s"}
            {session.level ? ` · ${session.level}` : ""}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ui-background-light transition hover:bg-ui-input-light"
      >
        <Pencil size={14} className="text-ui-text-main" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-red-50 transition hover:bg-red-100"
      >
        <Trash2 size={14} color="#dc2626" />
      </button>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-brandPrimary-50">
        <Dumbbell size={20} className="text-brandPrimary-600" />
      </div>
      <p className="mb-1 font-manrope text-sm font-bold text-ui-text-main">
        {title}
      </p>
      <p className="font-manrope text-xs text-ui-text-muted">{hint}</p>
    </div>
  );
}

// ── Picker de ejercicios del catálogo con búsqueda ──
export function ExercisePickerModal({
  visible,
  onClose,
  onPick,
  selectedIds = [],
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (ex: CatalogExercise) => void;
  selectedIds?: string[];
}) {
  const { data: exercises = [], isLoading } = useCatalogExercisesAdmin();
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
              Catálogo de ejercicios
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
              Sin resultados.
            </p>
          ) : (
            filtered.map((ex) => {
              const added = selectedIds.includes(ex.id);
              const thumb = mediaUrl(ex.image_uri);
              return (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => !added && onPick(ex)}
                  disabled={added}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                    added ? "opacity-40" : "transition hover:bg-ui-background-light"
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
                      {ex.category} · {ex.muscle_group}
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

// ── Drawer de detalle ──
function SessionDetailDrawer({
  session,
  onClose,
  onEdit,
  onDelete,
}: {
  session: CatalogSession;
  onClose: () => void;
  onEdit: (s: CatalogSession) => void;
  onDelete: (s: CatalogSession) => void;
}) {
  const { data: exercises = [], isLoading } = useCatalogSessionExercises(
    session.id
  );
  const heroUrl = mediaUrl(session.cover_image_uri);
  const count = session.exercise_count ?? exercises.length;

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

          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt=""
              className="aspect-square w-full rounded-[18px] object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-[18px] bg-brandPrimary-50">
              <Dumbbell size={40} className="text-brandPrimary-600" />
            </div>
          )}

          <h3 className="mt-4 font-jakarta text-[20px] font-bold tracking-tight text-ui-text-main">
            {session.name}
          </h3>
          <p className="mt-1 font-manrope text-[12px] text-ui-text-muted">
            {count} ejercicio{count === 1 ? "" : "s"}
            {session.level ? ` · ${labelOf(SESSION_LEVELS, session.level)}` : ""}
          </p>

          {session.description ? (
            <div className="mt-6">
              <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
                DESCRIPCIÓN
              </p>
              <p className="font-manrope text-[13px] leading-5 text-ui-text-main">
                {session.description}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="mb-2 font-manrope text-[11px] font-bold text-ui-text-muted">
              EJERCICIOS
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-brandPrimary-600" />
              </div>
            ) : exercises.length === 0 ? (
              <p className="py-2 font-manrope text-[12px] text-ui-text-muted">
                Esta sesión no tiene ejercicios.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {exercises.map((ex, idx) => {
                  const thumb = mediaUrl(ex.image_uri);
                  return (
                    <div
                      key={ex.id ?? idx}
                      className="flex items-center gap-3 rounded-xl border border-ui-input-light bg-ui-background-light px-3 py-2"
                    >
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => onEdit(session)}
              className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-brandPrimary-600 py-2.5 transition hover:bg-brandPrimary-700"
            >
              <Pencil size={14} color="#fff" />
              <span className="font-manrope text-[13px] font-bold text-white">
                Editar
              </span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(session)}
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
