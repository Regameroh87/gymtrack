// Sección SESIONES del catálogo (super_admin). Builder web reconstruido de cero que
// escribe directo a Supabase vía el RPC save_catalog_session. No reutiliza useSessionForm
// (ese persiste a SQLite local, inexistente en web). Ver [[project_default_catalog]].
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";

// Hooks
import {
  useCatalogSessionsAdmin,
  useSaveCatalogSession,
  useDeleteCatalogSession,
  fetchCatalogSessionExercises,
} from "../../../../../src/hooks/catalog/use-catalog-sessions-admin";
import { useCatalogExercisesAdmin } from "../../../../../src/hooks/catalog/use-catalog-admin";

// Form helpers
import { Field, Input, uploadImageWeb } from "../gyms/_form";
import {
  WebSelect,
  CoverPicker,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
} from "./_form-web";
import SessionDetailDrawer from "./_session-detail-web";

// Constantes / utils / tema
import { SESSION_LEVELS } from "../../../../../src/constants/sessionOptions";
import { getCloudinaryUrl } from "@gymtrack/core/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";

// Iconos
import {
  Barbell,
  Plus,
  Pencil,
  Trash,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "../../../../../assets/icons";

const EMPTY = {
  name: "",
  description: "",
  level: "",
  cover_image_uri: null,
  exercises: [],
};

export default function CatalogSessionsSection() {
  const { brandPrimary } = useGymTheme();
  const { data: sessions = [], isLoading } = useCatalogSessionsAdmin();
  const deleteSession = useDeleteCatalogSession();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [detail, setDetail] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteSession.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch {
      // El DeleteConfirmModal de sesiones no muestra error; cerramos y dejamos que la
      // invalidación de queries refleje el estado real.
      setConfirmDelete(null);
    }
  };

  return (
    <View>
      {/* Header de la sección */}
      <View className="mb-6 flex-row items-end justify-between gap-4">
        <Text className="text-xs font-manrope text-ui-text-muted flex-1">
          Rutinas pre-armadas con ejercicios del catálogo. Los gimnasios con el
          catálogo activado las ven read-only; para editarlas, las guardan en
          custom.
        </Text>
        <Pressable
          onPress={openCreate}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Nueva sesión
          </Text>
        </Pressable>
      </View>

      {/* Lista */}
      <View
        className="bg-white rounded-[20px] border border-ui-input-border self-center w-full overflow-hidden"
        style={{ maxWidth: 880 }}
      >
        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="small" color={brandPrimary[600]} />
          </View>
        ) : sessions.length === 0 ? (
          <EmptyState
            brandPrimary={brandPrimary}
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
              brandPrimary={brandPrimary}
            />
          ))
        )}
      </View>

      {/* Modal builder — montado condicionalmente para resetear su estado al cerrar */}
      {formOpen && (
        <SessionFormModal
          session={editing}
          onClose={() => setFormOpen(false)}
          brandPrimary={brandPrimary}
        />
      )}

      {/* Drawer de detalle */}
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

      {/* Confirmación de borrado */}
      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Eliminar sesión"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los días de planes de catálogo que la usaban quedarán sin sesión.`}
        isPending={deleteSession.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

// Modal del builder de sesión. Componente propio montado/desmontado con `formOpen`
// (patrón PlanBuilderModal): hidrata los ejercicios en edición y arranca limpio al crear.
function SessionFormModal({ session, onClose, brandPrimary }) {
  const saveSession = useSaveCatalogSession();
  const editingId = session?.id ?? null;

  const [values, setValues] = useState(() =>
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!session);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef(null);

  // Hidratar los ejercicios en edición (la lista solo trae el header de la sesión).
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
          setError(err?.message || "No se pudieron cargar los ejercicios.");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const addExercise = (ex) => {
    setValues((prev) => {
      if (prev.exercises.some((e) => e.exercise_id === ex.id)) return prev;
      return {
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            // sin id → session_exercise nuevo (el RPC lo genera)
            exercise_id: ex.id,
            name: ex.name,
            muscle_group: ex.muscle_group,
            image_uri: ex.image_uri,
          },
        ],
      };
    });
  };

  const removeExercise = (idx) =>
    setValues((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx),
    }));

  const moveExercise = (idx, dir) =>
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
      setError(err?.message || "No se pudo guardar la sesión.");
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <ScrollView
            className="bg-white rounded-[20px] border border-ui-input-border w-full"
            style={{ maxWidth: 560, maxHeight: "92%" }}
            contentContainerStyle={{ padding: 28 }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-jakarta-bold text-ui-text-main tracking-tight">
                {editingId ? "Editar sesión" : "Nueva sesión"}
              </Text>
              <Pressable onPress={onClose} style={{ cursor: "pointer" }}>
                <X size={18} color={ui.text.muted} />
              </Pressable>
            </View>

            <ErrorBanner message={error} />

            {loadingEdit ? (
              <View className="py-16 items-center">
                <ActivityIndicator size="small" color={brandPrimary[600]} />
              </View>
            ) : (
              <View className="gap-y-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
                <CoverPicker
                  previewUrl={previewUrl}
                  imageUri={values.cover_image_uri}
                  onPick={() => fileRef.current?.click()}
                  brandPrimary={brandPrimary}
                />

                <Field label="NOMBRE">
                  <Input
                    placeholder="Ej: Empuje superior"
                    value={values.name}
                    onChangeText={set("name")}
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
                  <TextInput
                    value={values.description}
                    onChangeText={set("description")}
                    placeholder="Breve descripción de la rutina..."
                    placeholderTextColor={ui.text.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className="font-manrope rounded-xl min-h-20 p-3.5 bg-white text-ui-text-main text-[13px] border border-ui-input-border"
                    style={{ outlineWidth: 0 }}
                  />
                </Field>

                {/* Ejercicios */}
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-[10px] font-manrope-bold text-ui-text-muted tracking-[1.2px] uppercase">
                    Ejercicios ({values.exercises.length})
                  </Text>
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brandPrimary-50 hover:bg-brandPrimary-100"
                    style={{ cursor: "pointer" }}
                  >
                    <Plus size={13} color={brandPrimary[600]} />
                    <Text className="text-[12px] font-manrope-bold text-brandPrimary-600">
                      Agregar
                    </Text>
                  </Pressable>
                </View>

                {values.exercises.length === 0 ? (
                  <View className="py-6 items-center border border-dashed border-ui-input-border rounded-xl">
                    <Text className="text-[12px] font-manrope text-ui-text-muted">
                      Todavía no agregaste ejercicios.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-y-2">
                    {values.exercises.map((ex, idx) => {
                      const thumb = ex.image_uri
                        ? getCloudinaryUrl(
                            ex.image_uri,
                            "w_72,h_72,c_fill,f_auto,q_auto"
                          ) || ex.image_uri
                        : null;
                      return (
                        <View
                          key={ex.exercise_id}
                          className="flex-row items-center gap-3 px-3 py-2 rounded-xl border border-ui-input-light bg-ui-background-light"
                        >
                          <Text className="text-[12px] font-manrope-bold text-ui-text-muted w-4">
                            {idx + 1}
                          </Text>
                          {thumb ? (
                            <Image
                              source={{ uri: thumb }}
                              style={{ width: 34, height: 34, borderRadius: 8 }}
                              contentFit="cover"
                            />
                          ) : (
                            <View className="w-[34px] h-[34px] rounded-lg bg-brandPrimary-50 items-center justify-center">
                              <Barbell size={14} color={brandPrimary[600]} />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                              {ex.name}
                            </Text>
                            <Text className="text-[11px] font-manrope text-ui-text-muted capitalize">
                              {ex.muscle_group}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => moveExercise(idx, -1)}
                            disabled={idx === 0}
                            className="w-7 h-7 rounded-lg items-center justify-center hover:bg-white"
                            style={{
                              cursor: idx === 0 ? "default" : "pointer",
                              opacity: idx === 0 ? 0.3 : 1,
                            }}
                          >
                            <ChevronLeft
                              size={14}
                              color={ui.text.main}
                              style={{ transform: [{ rotate: "90deg" }] }}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => moveExercise(idx, 1)}
                            disabled={idx === values.exercises.length - 1}
                            className="w-7 h-7 rounded-lg items-center justify-center hover:bg-white"
                            style={{
                              cursor:
                                idx === values.exercises.length - 1
                                  ? "default"
                                  : "pointer",
                              opacity:
                                idx === values.exercises.length - 1 ? 0.3 : 1,
                            }}
                          >
                            <ChevronRight
                              size={14}
                              color={ui.text.main}
                              style={{ transform: [{ rotate: "90deg" }] }}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => removeExercise(idx)}
                            className="w-7 h-7 rounded-lg items-center justify-center bg-red-50 hover:bg-red-100"
                            style={{ cursor: "pointer" }}
                          >
                            <Trash size={13} color="#dc2626" />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {!loadingEdit && (
              <FormActions
                onCancel={onClose}
                onSubmit={handleSubmit}
                isPending={saveSession.isPending || isSaving}
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Picker de ejercicios del catálogo */}
      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        selectedIds={values.exercises.map((e) => e.exercise_id)}
        brandPrimary={brandPrimary}
      />
    </>
  );
}

function SessionRow({
  session,
  first,
  onView,
  onEdit,
  onDelete,
  brandPrimary,
}) {
  const thumb = session.cover_image_uri
    ? getCloudinaryUrl(
        session.cover_image_uri,
        "w_96,h_96,c_fill,f_auto,q_auto"
      ) || session.cover_image_uri
    : null;
  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        first ? "" : "border-t border-ui-input-light"
      }`}
    >
      <Pressable
        onPress={onView}
        className="flex-1 flex-row items-center gap-3"
        style={{ cursor: "pointer" }}
      >
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={{ width: 44, height: 44, borderRadius: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-11 h-11 rounded-[10px] bg-brandPrimary-50 items-center justify-center">
            <Barbell size={16} color={brandPrimary[600]} />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-[14px] font-manrope-bold text-ui-text-main">
            {session.name}
          </Text>
          <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5 capitalize">
            {session.exercise_count} ejercicio
            {session.exercise_count === 1 ? "" : "s"}
            {session.level ? ` · ${session.level}` : ""}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onEdit}
        className="w-9 h-9 rounded-[10px] items-center justify-center bg-ui-background-light hover:bg-ui-input-light"
        style={{ cursor: "pointer" }}
      >
        <Pencil size={14} color={ui.text.main} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        className="w-9 h-9 rounded-[10px] items-center justify-center bg-red-50 hover:bg-red-100"
        style={{ cursor: "pointer" }}
      >
        <Trash size={14} color="#dc2626" />
      </Pressable>
    </View>
  );
}

function EmptyState({ brandPrimary, title, hint }) {
  return (
    <View className="py-20 items-center px-8">
      <View className="w-12 h-12 rounded-[14px] bg-brandPrimary-50 items-center justify-center mb-3">
        <Barbell size={20} color={brandPrimary[600]} />
      </View>
      <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
        {title}
      </Text>
      <Text className="text-xs font-manrope text-ui-text-muted">{hint}</Text>
    </View>
  );
}

// Modal para elegir ejercicios del catálogo con búsqueda.
export function ExercisePickerModal({
  visible,
  onClose,
  onPick,
  selectedIds = [],
  brandPrimary,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      >
        <View
          className="bg-white rounded-[20px] border border-ui-input-border w-full overflow-hidden"
          style={{ maxWidth: 480, maxHeight: "85%" }}
        >
          <View className="px-5 pt-5 pb-3 border-b border-ui-input-light">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[16px] font-jakarta-bold text-ui-text-main tracking-tight">
                Catálogo de ejercicios
              </Text>
              <Pressable onPress={onClose} style={{ cursor: "pointer" }}>
                <X size={18} color={ui.text.muted} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2.5 bg-ui-background-light rounded-xl px-3.5 py-2.5 border border-ui-input-border">
              <Search size={15} color={ui.text.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ejercicio..."
                placeholderTextColor={ui.text.muted}
                className="flex-1 text-[13px] font-manrope text-ui-text-main"
                style={{ outlineWidth: 0 }}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {isLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="small" color={brandPrimary[600]} />
              </View>
            ) : filtered.length === 0 ? (
              <Text className="text-center text-[12px] font-manrope text-ui-text-muted py-10">
                Sin resultados.
              </Text>
            ) : (
              filtered.map((ex) => {
                const added = selectedIds.includes(ex.id);
                const thumb = ex.image_uri
                  ? getCloudinaryUrl(
                      ex.image_uri,
                      "w_72,h_72,c_fill,f_auto,q_auto"
                    ) || ex.image_uri
                  : null;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => !added && onPick(ex)}
                    disabled={added}
                    className={`flex-row items-center gap-3 px-3 py-2 rounded-xl ${
                      added ? "opacity-40" : "hover:bg-ui-background-light"
                    }`}
                    style={{ cursor: added ? "default" : "pointer" }}
                  >
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={{ width: 36, height: 36, borderRadius: 8 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="w-9 h-9 rounded-lg bg-brandPrimary-50 items-center justify-center">
                        <Barbell size={14} color={brandPrimary[600]} />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-[13px] font-manrope-bold text-ui-text-main">
                        {ex.name}
                      </Text>
                      <Text className="text-[11px] font-manrope text-ui-text-muted capitalize">
                        {ex.category} · {ex.muscle_group}
                      </Text>
                    </View>
                    {added ? (
                      <Text className="text-[11px] font-manrope-semi text-ui-text-muted">
                        Agregado
                      </Text>
                    ) : (
                      <Plus size={16} color={brandPrimary[600]} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
