// Sección EJERCICIOS del catálogo (super_admin). Escribe directo a Supabase
// (is_catalog=true, gym_id=null); los gyms con default_catalog lo reciben read-only.
// Ver [[project_default_catalog]].
import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";

// Hooks
import {
  useCatalogExercisesAdmin,
  useSaveCatalogExercise,
  useDeleteCatalogExercise,
} from "../../../../../src/hooks/catalog/use-catalog-admin";

// Form helpers
import {
  Field,
  Input,
  Toggle,
  uploadImageWeb,
  uploadVideoWeb,
} from "../gyms/_form";
import {
  WebSelect,
  ErrorBanner,
  FormActions,
  DeleteConfirmModal,
} from "./_form-web";

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
  X,
  Movie,
  Upload,
} from "../../../../../assets/icons";

// Límite de tamaño del video, alineado con el picker mobile (use-media-picker 50MB).
const MAX_VIDEO_MB = 50;

const EMPTY_FORM = {
  name: "",
  category: "fuerza",
  muscle_group: "pecho",
  instructions: "",
  youtube_video_url: "",
  image_uri: null,
  video_uri: null,
  is_unilateral: false,
};

export default function CatalogExercisesSection() {
  const { brandPrimary } = useGymTheme();
  const { data: exercises = [], isLoading } = useCatalogExercisesAdmin();
  const saveExercise = useSaveCatalogExercise();
  const deleteExercise = useDeleteCatalogExercise();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const openCreate = () => {
    setEditing(null);
    setValues(EMPTY_FORM);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
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
      video_uri: ex.video_uri ?? null,
      is_unilateral: !!ex.is_unilateral,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
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

  const handleVideoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`El video supera el límite de ${MAX_VIDEO_MB} MB.`);
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
    try {
      let imageUri = values.image_uri;
      if (selectedFile) imageUri = await uploadImageWeb(selectedFile);
      let videoUri = values.video_uri;
      if (selectedVideo) videoUri = await uploadVideoWeb(selectedVideo);
      await saveExercise.mutateAsync({
        id: editing?.id,
        values: { ...values, image_uri: imageUri, video_uri: videoUri },
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

  // Fuente del preview de video: archivo recién elegido o el video ya guardado.
  const videoToShow = useMemo(() => {
    if (videoPreviewUrl) return videoPreviewUrl;
    if (values.video_uri)
      return getCloudinaryUrl(values.video_uri) || values.video_uri;
    return null;
  }, [videoPreviewUrl, values.video_uri]);

  return (
    <View>
      <View className="mb-6 flex-row items-end justify-between gap-4">
        <Text className="text-xs font-manrope text-ui-text-muted flex-1">
          Biblioteca central read-only. Los gimnasios con el catálogo activado
          la ven en sus pickers; para editar, sus coaches la guardan en custom.
        </Text>
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
          <ScrollViewModal>
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

            <ErrorBanner message={error} />

            <View className="gap-y-4">
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

              <Field label="NOMBRE">
                <Input
                  placeholder="Ej: Press de banca"
                  value={values.name}
                  onChangeText={set("name")}
                />
              </Field>

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

              <Field label="VIDEO YOUTUBE (OPCIONAL)">
                <Input
                  placeholder="https://youtube.com/..."
                  value={values.youtube_video_url}
                  onChangeText={set("youtube_video_url")}
                  autoCapitalize="none"
                />
              </Field>

              {/* Video propio (subido directo a Cloudinary en el guardado) */}
              <Field label="VIDEO PROPIO (OPCIONAL)">
                <input
                  type="file"
                  accept="video/*"
                  ref={videoRef}
                  style={{ display: "none" }}
                  onChange={handleVideoFile}
                />
                {videoToShow ? (
                  <View className="gap-y-2">
                    <video
                      src={videoToShow}
                      controls
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        borderRadius: 12,
                        background: "#000",
                      }}
                    />
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => videoRef.current?.click()}
                        className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-[11px] border border-ui-input-border bg-white hover:bg-ui-background-light"
                        style={{ cursor: "pointer" }}
                      >
                        <Upload size={14} color={ui.text.main} />
                        <Text className="text-[12px] font-manrope-semi text-ui-text-main">
                          Reemplazar
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={removeVideo}
                        className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] bg-red-50 hover:bg-red-100"
                        style={{ cursor: "pointer" }}
                      >
                        <Trash size={14} color="#dc2626" />
                        <Text className="text-[12px] font-manrope-semi text-red-600">
                          Quitar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => videoRef.current?.click()}
                    className="flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brandPrimary-300 bg-brandPrimary-50 hover:bg-brandPrimary-100"
                    style={{ cursor: "pointer" }}
                  >
                    <Movie size={16} color={brandPrimary[600]} />
                    <Text className="text-[12px] font-manrope-bold text-brandPrimary-600">
                      Subir video (máx {MAX_VIDEO_MB} MB)
                    </Text>
                  </Pressable>
                )}
              </Field>

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

              <Toggle
                label="Ejercicio unilateral"
                hint="Se ejecuta un lado a la vez (ej. mancuerna a una mano)."
                value={values.is_unilateral}
                onChange={set("is_unilateral")}
              />
            </View>

            <FormActions
              onCancel={() => setFormOpen(false)}
              onSubmit={handleSubmit}
              isPending={saveExercise.isPending}
            />
          </ScrollViewModal>
        </View>
      </Modal>

      <DeleteConfirmModal
        visible={!!confirmDelete}
        title="Eliminar del catálogo"
        message={`Vas a quitar “${confirmDelete?.name}” del catálogo. Los gimnasios dejarán de verlo. Los forks a custom que ya lo referencian podrían quedar sin resolver.`}
        isPending={deleteExercise.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

// ScrollView contenedora del modal (extraída para no repetir estilo).
function ScrollViewModal({ children }) {
  return (
    <ScrollView
      className="bg-white rounded-[20px] border border-ui-input-border w-full"
      style={{ maxWidth: 520, maxHeight: "90%" }}
      contentContainerStyle={{ padding: 28 }}
    >
      {children}
    </ScrollView>
  );
}
