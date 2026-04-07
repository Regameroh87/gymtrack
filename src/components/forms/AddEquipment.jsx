import { Pressable, Text, View } from "react-native";
import { CameraPlus, CloudUpload, Plus } from "../../../assets/icons";

import FormField from "../../components/forms/FormField";
import PreviewImage from "../../components/images/PreviewImage";
import { useTheme } from "../../theme/theme";
import { useForm } from "@tanstack/react-form";

import { ui } from "../../theme/colors";
import HandlePickImage from "../../utils/handlePickImage";
import { useMediaPicker } from "../../hooks/useMediaPicker";
import * as Haptics from "expo-haptics";
import StyledTextInput from "./StyledTextInput";
import { Barbell } from "../../../assets/icons";

export default function AddEquipment() {
  const { isDark } = useTheme();
  const { pickMedia } = useMediaPicker();

  const formEquipment = useForm({
    defaultValues: {
      equipments: [],
    },
  });

  return (
    <FormField label="EQUIPAMIENTO REQUERIDO">
      <formEquipment.Field name="equipments">
        {(field) => (
          <View className="gap-y-4 w-full p-4 bg-ui-surface-light dark:bg-ui-surface-dark rounded-xl">
            <View className="flex-row justify-center items-center gap-2 mt-3">
              <View className="w-24 h-24">
                <PreviewImage value={field.state.value.image_public_id}>
                  <CameraPlus color={ui.text.mutedDark} size={24} />
                </PreviewImage>
              </View>
              <StyledTextInput
                value={field.state.value.name}
                onChangeText={(text) =>
                  field.handleChange((prev) => ({ ...prev, name: text }))
                }
                placeholder="Nombre (ej: Barra Olímpica)"
                icon={<Barbell color={ui.text.mutedDark} />}
              />
            </View>

            <View className="flex-1">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    HandlePickImage({
                      pickMedia,
                      source: "gallery",
                      onChange: (uri) => {
                        field.handleChange({
                          ...field.state.value,
                          image_public_id: uri,
                        });
                      },
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    HandlePickImage({
                      pickMedia,
                      source: "camera",
                      onChange: (uri) => {
                        field.handleChange({
                          ...field.state.value,
                          image_public_id: uri,
                        });
                      },
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
                disabled={!field.state.value.name}
                onPress={() => {
                  if (!field.state.value.name) return;
                  field.handleChange([
                    ...field.state.value,
                    { ...field.state.value, isNew: true },
                  ]);
                  field.handleChange({
                    name: "",
                    image_public_id: "",
                  });
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                }}
                className={`flex-row justify-center items-center gap-2 rounded-xl p-3 mt-2 ${field.state.value.name ? "bg-brandPrimary-600" : "bg-ui-input-light dark:bg-ui-input-dark opacity-50"}`}
              >
                <Plus color="white" size={14} />
                <Text className="text-white text-xs font-jakarta-bold">
                  AGREGAR EQUIPO
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </formEquipment.Field>
    </FormField>
  );
}
