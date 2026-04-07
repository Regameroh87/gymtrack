import { Pressable, Text, View, FlatList } from "react-native";
import {
  Trash,
  X,
  Barbell,
  CameraPlus,
  CloudUpload,
  Plus,
} from "../../../assets/icons";
import CustomSelect from "../../components/CustomSelect";
import FormField from "../../components/forms/FormField";
import PreviewImage from "../../components/images/PreviewImage";
import StyledTextInput from "../../components/forms/StyledTextInput";
import { useTheme } from "../../theme/theme";

export default function AddEquipment({
  form,
  dbEquipments,
  equipmentOptions,
  selectedEquipmentValue,
  setSelectedEquipmentValue,
  currentEquipment,
  setCurrentEquipment,
  HandlePickImage,
  pickMedia,
  Haptics,
  ui,
}) {
  const { isDark } = useTheme();

  const renderEquipmentItem = ({ item, index }, field) => (
    <View
      key={index}
      className="flex-row items-center bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark rounded-xl p-2 border border-ui-input-light dark:border-ui-input-dark mr-2"
    >
      <View className="w-10 h-10 rounded-lg overflow-hidden mr-2">
        <PreviewImage value={item.local_image_uri || item.image_public_id} />
      </View>
      <View>
        <Text className="text-[10px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
          EQUIPO
        </Text>
        <Text className="text-xs font-jakarta-semi text-ui-text-main dark:text-ui-text-mainDark">
          {item.name}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          const newList = [...field.state.value];
          newList.splice(index, 1);
          field.handleChange(newList);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        className="ml-3 p-1"
      >
        <Trash color="#ef4444" size={14} />
      </Pressable>
    </View>
  );

  return (
    <FormField label="EQUIPAMIENTO REQUERIDO">
      <form.Field name="equipments">
        {(field) => (
          <View className="gap-y-4">
            {/* Lista de equipos agregados con FlatList */}
            {field.state.value.length > 0 && (
              <View className="mb-2">
                <FlatList
                  data={field.state.value}
                  renderItem={(props) => renderEquipmentItem(props, field)}
                  keyExtractor={(_, index) => index.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}

            <CustomSelect
              label=""
              placeholder="Seleccionar equipamiento..."
              options={equipmentOptions}
              value={selectedEquipmentValue}
              onChange={(val) => {
                setSelectedEquipmentValue(val);
                if (val !== "NEW" && val) {
                  const eq = dbEquipments.find((e) => e.id === val);
                  if (eq && !field.state.value.some((e) => e.id === eq.id)) {
                    field.handleChange([
                      ...field.state.value,
                      { ...eq, isNew: false },
                    ]);
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success
                    );
                  }
                  setSelectedEquipmentValue("");
                }
              }}
            />

            {selectedEquipmentValue === "NEW" && (
              <View className="rounded-2xl p-4 border border-ui-input-light dark:border-ui-input-dark bg-ui-surface-light dark:bg-ui-surface-dark/30 mt-2">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[10px] font-jakarta-bold text-ui-text-muted dark:text-ui-text-mutedDark uppercase tracking-widest">
                    Crear Nuevo Equipo
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedEquipmentValue("");
                      setCurrentEquipment({
                        name: "",
                        image_public_id: "",
                      });
                    }}
                    className="bg-ui-surfaceSecondary-light dark:bg-ui-surfaceSecondary-dark p-1.5 rounded-full"
                  >
                    <X
                      color={isDark ? ui.text.mainDark : ui.text.main}
                      size={14}
                    />
                  </Pressable>
                </View>

                <StyledTextInput
                  value={currentEquipment.name}
                  onChangeText={(text) =>
                    setCurrentEquipment((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Nombre (ej: Barra Olímpica)"
                  icon={<Barbell color={ui.text.mutedDark} />}
                />

                <View className="flex-row gap-4 mt-3 items-center">
                  <View className="w-24 h-24">
                    <PreviewImage value={currentEquipment.image_public_id}>
                      <CameraPlus color={ui.text.mutedDark} size={24} />
                    </PreviewImage>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          HandlePickImage({
                            pickMedia,
                            source: "gallery",
                            onChange: (uri) =>
                              setCurrentEquipment((prev) => ({
                                ...prev,
                                image_public_id: uri,
                              })),
                          });
                        }}
                        className="flex-1 flex-row border border-brandSecondary-500/20 justify-center items-center gap-2 bg-brandSecondary-600/10 rounded-xl p-2.5"
                      >
                        <CloudUpload
                          color={isDark ? "#62fae3" : "#059669"}
                          size={14}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          HandlePickImage({
                            pickMedia,
                            source: "camera",
                            onChange: (uri) =>
                              setCurrentEquipment((prev) => ({
                                ...prev,
                                image_public_id: uri,
                              })),
                          });
                        }}
                        className="flex-1 flex-row border border-brandPrimary-500/20 justify-center items-center gap-2 bg-brandPrimary-600/10 rounded-xl p-2.5"
                      >
                        <CameraPlus
                          color={isDark ? "#a5b4fc" : "#3023cd"}
                          size={14}
                        />
                      </Pressable>
                    </View>

                    <Pressable
                      disabled={!currentEquipment.name}
                      onPress={() => {
                        if (!currentEquipment.name) return;
                        field.handleChange([
                          ...field.state.value,
                          { ...currentEquipment, isNew: true },
                        ]);
                        setCurrentEquipment({
                          name: "",
                          image_public_id: "",
                        });
                        setSelectedEquipmentValue("");
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success
                        );
                      }}
                      className={`flex-row justify-center items-center gap-2 rounded-xl p-3 mt-2 ${currentEquipment.name ? "bg-brandPrimary-600" : "bg-ui-input-light dark:bg-ui-input-dark opacity-50"}`}
                    >
                      <Plus color="white" size={14} />
                      <Text className="text-white text-xs font-jakarta-bold">
                        AGREGAR EQUIPO
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </form.Field>
    </FormField>
  );
}
