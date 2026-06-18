// React / libs
import { useMemo, useRef, useState } from "react";
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
  useCatalogExercisesAdmin,
  useSaveCatalogExercise,
  useDeleteCatalogExercise,
} from "../../../../../src/hooks/catalog/use-catalog-admin";

// Form helpers compartidos (web)
import { Field, Input, Toggle, uploadImageWeb } from "../gyms/_form";

// Constantes / utils / tema
import {
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
} from "../../../../../src/constants/exerciseOptions";
import { getCloudinaryUrl } from "../../../../../src/utils/cloudinary";
import { ui } from "../../../../../src/theme/colors";
import { useGymTheme } from "../../../../../src/contexts/gym-theme-context";

// Iconos
import {
  Barbell,
  Plus,
  Pencil,
  Trash,
  CheckCircle,
  X,
} from "../../../../../assets/icons";

const EMPTY_FORM = {
  name: "",
  category: "fuerza",
  muscle_group: "pecho",
  instructions: "",
  youtube_video_url: "",
  image_uri: null,
  is_unilateral: false,
};

// Gestión del catálogo central de EJERCICIOS (super_admin). Escribe directo a
// Supabase (is_catalog=true, gym_id=null); los gyms con default_catalog lo reciben
// read-only. Sesiones y planes de catálogo son un follow-up (reutilizan los builders).
export default function CatalogAdminWeb() {
  const { brandPrimary } = useGymTheme();
  const { data: exercises = [], isLoading } = useCatalogExercisesAdmin();
  const saveExercise = useSaveCatalogExercise();
  const deleteExercise = useDeleteCatalogExercise();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // fila en edición o null (alta)
  const [values, setValues] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const openCreate = () => {
    setEditing(null);
    setValues(EMPTY_FORM);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (ex) => {
    setEditing(ex);
    setValues({
      name: ex.name ?? "",
      category: ex.category ?? "fuerza",
      muscle_group: ex.muscle_group ?? "pecho",
      instructions: ex.instructions ?? "",
      youtube_video_url: ex.youtube_video_url ?? "",
      image_uri: ex.image_uri ?? null,
      is_unilateral: !!ex.is_unilateral,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setFormOpen(true);
  };

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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
    try {
      let imageUri = values.image_uri;
      if (selectedFile) {
        imageUri = await uploadImageWeb(selectedFile);
      }
      await saveExercise.mutateAsync({
        id: editing?.id,
        values: { ...values, image_uri: imageUri },
      });
      setFormOpen(false);
    } catch (err) {
      setError(err?.message || "No se pudo guardar el ejercicio.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExercise.mutateAsync(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setError(err?.message || "No se pudo eliminar.");
      setConfirmDelete(null);
    }
  };

  const imgToShow = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (values.image_uri)
      return (
        getCloudinaryUrl(
          values.image_uri,
          "w_160,h_160,c_fill,f_auto,q_auto"
        ) || values.image_uri
      );
    return null;
  }, [previewUrl, values.image_uri]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 36, paddingBottom: 56 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-8 flex-row items-end justify-between gap-4">
        <View>
          <Text className="text-[11px] font-manrope-semi text-brandPrimary-600 tracking-[1.4px] uppercase mb-1">
            Plataforma
          </Text>
          <Text className="text-[26px] font-jakarta-bold text-ui-text-main tracking-tight">
            Catálogo de ejercicios
          </Text>
          <Text className="text-xs font-manrope text-ui-text-muted mt-1">
            Biblioteca central read-only. Los gimnasios con el catálogo activado
            la ven en sus pickers; para editar, sus coaches la guardan en
            custom.
          </Text>
        </View>
        <Pressable
          onPress={openCreate}
          className="flex-row items-center gap-2 px-4 py-2.5 rounded-[11px] bg-brandPrimary-600 hover:bg-brandPrimary-700 shadow-md shadow-brandPrimary-600/30"
          style={{ cursor: "pointer" }}
        >
          <Plus size={15} color="#fff" />
          <Text className="text-[13px] font-manrope-bold text-white">
            Nuevo ejercicio
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
        ) : exercises.length === 0 ? (
          <View className="py-20 items-center px-8">
            <View className="w-12 h-12 rounded-[14px] bg-brandPrimary-50 items-center justify-center mb-3">
              <Barbell size={20} color={brandPrimary[600]} />
            </View>
            <Text className="text-sm font-manrope-bold text-ui-text-main mb-1">
              El catálogo está vacío
            </Text>
            <Text className="text-xs font-manrope text-ui-text-muted">
              Agregá el primer ejercicio con “Nuevo ejercicio”.
            </Text>
          </View>
        ) : (
          exercises.map((ex, i) => {
            const thumb = ex.image_uri
              ? getCloudinaryUrl(
                  ex.image_uri,
                  "w_96,h_96,c_fill,f_auto,q_auto"
                ) || ex.image_uri
              : null;
            return (
              <View
                key={ex.id}
                className={`flex-row items-center gap-3 px-5 py-3.5 ${
                  i > 0 ? "border-t border-ui-input-light" : ""
                }`}
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
                    {ex.name}
                  </Text>
                  <Text className="text-[11px] font-manrope text-ui-text-muted mt-0.5 capitalize">
                    {ex.category} · {ex.muscle_group}
                    {ex.is_unilateral ? " · unilateral" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openEdit(ex)}
                  className="w-9 h-9 rounded-[10px] items-center justify-center bg-ui-background-light hover:bg-ui-input-light"
                  style={{ cursor: "pointer" }}
                >
                  <Pencil size={14} color={ui.text.main} />
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete(ex)}
                  className="w-9 h-9 rounded-[10px] items-center justify-center bg-red-50 hover:bg-red-100"
                  style={{ cursor: "pointer" }}
                >
                  <Trash size={14} color="#dc2626" />
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      {/* Modal form alta/edición */}
      <Modal
        visible={formOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFormOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <ScrollView
            className="bg-white rounded-[20px] border border-ui-input-border w-full"
            style={{ maxWidth: 520, maxHeight: "90%" }}
            contentContainerStyle={{ padding: 28 }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-jakarta-bold text-ui-text-main tracking-tight">
                {editing ? "Editar ejercicio" : "Nuevo ejercicio"}
              </Text>
              <Pressable
                onPress={() => setFormOpen(false)}
                style={{ cursor: "pointer" }}
              >
                <X size={18} color={ui.text.muted} />
              </Pressable>
            </View>

            {error && (
              <View className="flex-row items-center gap-2 p-3 rounded-xl mb-4 bg-red-50 border border-red-200">
                <X size={14} color="#dc2626" />
                <Text className="flex-1 text-xs font-manrope-semi text-red-600">
                  {error}
                </Text>
              </View>
            )}

            <View className="gap-y-4">
              {/* Imagen */}
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                style={{ display: "none" }}
                onChange={handleFile}
              />
              <View className="items-center">
                <Pressable
                  onPress={() => fileRef.current?.click()}
                  style={{ cursor: "pointer" }}
                >
                  {imgToShow ? (
                    <Image
                      source={{ uri: imgToShow }}
                      style={{ width: 96, height: 96, borderRadius: 18 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-24 h-24 rounded-[18px] bg-brandPrimary-50 items-center justify-center border-2 border-dashed border-brandPrimary-300">
                      <Plus size={22} color={brandPrimary[600]} />
                    </View>
                  )}
                </Pressable>
                <Text className="text-[11px] font-manrope text-ui-text-muted mt-2">
                  Imagen (opcional)
                </Text>
              </View>

              {/* Nombre */}
              <Field label="NOMBRE">
                <Input
                  placeholder="Ej: Press de banca"
                  value={values.name}
                  onChangeText={set("name")}
                />
              </Field>

              {/* Categoría + grupo muscular */}
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Field label="CATEGORÍA">
                    <WebSelect
                      value={values.category}
                      onChange={set("category")}
                      options={EXERCISE_CATEGORIES}
                    />
                  </Field>
                </View>
                <View className="flex-1">
                  <Field label="GRUPO MUSCULAR">
                    <WebSelect
                      value={values.muscle_group}
                      onChange={set("muscle_group")}
                      options={MUSCLE_GROUPS}
                    />
                  </Field>
                </View>
              </View>

              {/* YouTube */}
              <Field label="VIDEO YOUTUBE (OPCIONAL)">
                <Input
                  placeholder="https://youtube.com/..."
                  value={values.youtube_video_url}
                  onChangeText={set("youtube_video_url")}
                  autoCapitalize="none"
                />
              </Field>

              {/* Instrucciones */}
              <Field label="INSTRUCCIONES">
                <TextInput
                  value={values.instructions}
                  onChangeText={set("instructions")}
                  placeholder="Describí la ejecución..."
                  placeholderTextColor={ui.text.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="font-manrope rounded-xl min-h-24 p-3.5 bg-white text-ui-text-main text-[13px] border border-ui-input-border"
                  style={{ outlineWidth: 0 }}
                />
              </Field>

              {/* Unilateral */}
              <Toggle
                label="Ejercicio unilateral"
                hint="Se ejecuta un lado a la vez (ej. mancuerna a una mano)."
                value={values.is_unilateral}
                onChange={set("is_unilateral")}
              />
            </View>

            {/* Acciones */}
            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => setFormOpen(false)}
                className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
                style={{ cursor: "pointer" }}
              >
                <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={saveExercise.isPending}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
                  saveExercise.isPending
                    ? "bg-brandPrimary-400"
                    : "bg-brandPrimary-600 hover:bg-brandPrimary-700"
                }`}
                style={{
                  cursor: saveExercise.isPending ? "default" : "pointer",
                }}
              >
                {saveExercise.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CheckCircle size={15} color="#fff" />
                )}
                <Text className="text-[13px] font-manrope-bold text-white">
                  {saveExercise.isPending ? "Guardando..." : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Confirmación de borrado */}
      <Modal
        visible={!!confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(null)}
      >
        <View
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <View
            className="bg-white rounded-[20px] border border-ui-input-border p-7 w-full"
            style={{ maxWidth: 420 }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                <Trash size={18} color="#dc2626" />
              </View>
              <Text className="text-[16px] font-jakarta-bold text-ui-text-main tracking-tight">
                Eliminar del catálogo
              </Text>
            </View>
            <Text className="text-[12px] font-manrope text-ui-text-muted leading-5 mb-5">
              Vas a quitar “{confirmDelete?.name}” del catálogo. Los gimnasios
              dejarán de verlo. Los forks a custom que ya lo referencian podrían
              quedar sin resolver.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setConfirmDelete(null)}
                className="flex-1 items-center py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
                style={{ cursor: "pointer" }}
              >
                <Text className="text-[13px] font-manrope-semi text-ui-text-main">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={deleteExercise.isPending}
                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] ${
                  deleteExercise.isPending
                    ? "bg-red-300"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                style={{
                  cursor: deleteExercise.isPending ? "default" : "pointer",
                }}
              >
                {deleteExercise.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Trash size={14} color="#fff" />
                )}
                <Text className="text-[13px] font-manrope-bold text-white">
                  Eliminar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Select nativo del navegador, estilado para encajar con los Input del panel.
function WebSelect({ value, onChange, options }) {
  return (
    <View className="bg-white rounded-xl border border-ui-input-border px-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 8px",
          border: "none",
          background: "transparent",
          fontFamily: "Manrope",
          fontSize: 13,
          color: ui.text.main,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </View>
  );
}
