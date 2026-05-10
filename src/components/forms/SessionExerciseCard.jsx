// React Native
import { View, Text, Pressable } from "react-native";

// Librerías externas
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";

// Utils
import { getCloudinaryUrl } from "../../utils/cloudinary";

// Tema / assets
import { brandPrimary, ui } from "../../theme/colors";
import { Barbell, Trash, ChevronRight } from "../../../assets/icons";

export default function SessionExerciseCard({
  exercise,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const mutedColor = isDark ? ui.text.mutedDark : ui.text.muted;
  const disabledColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

  const imageUri = getCloudinaryUrl(exercise.image_uri) ?? exercise.image_uri;

  return (
    <View className="mb-2.5 border border-ui-input-border rounded-xl overflow-hidden bg-ui-surface-light dark:bg-ui-surface-dark">
      <View className="flex-row items-center p-3">
        {/* Move buttons */}
        <View className="pr-2 -ml-1 justify-center">
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            hitSlop={6}
            className="active:opacity-50"
          >
            <ChevronRight
              size={14}
              color={canMoveUp ? mutedColor : disabledColor}
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            hitSlop={6}
            className="active:opacity-50"
          >
            <ChevronRight
              size={14}
              color={canMoveDown ? mutedColor : disabledColor}
              style={{ transform: [{ rotate: "90deg" }] }}
            />
          </Pressable>
        </View>

        {/* Thumbnail */}
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-10 h-10 rounded-lg items-center justify-center mr-2.5 bg-brandPrimary-50 dark:bg-brandPrimary-950">
            <Barbell size={18} color={brandPrimary[600]} />
          </View>
        )}

        {/* Name + muscle group */}
        <View className="flex-1">
          <Text
            className="font-jakarta-semi text-[13px] text-ui-text-main dark:text-ui-text-mainDark"
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
          {exercise.muscle_group ? (
            <Text
              className="text-[11px] font-manrope text-ui-text-muted dark:text-ui-text-mutedDark mt-0.5"
              numberOfLines={1}
            >
              {exercise.muscle_group}
            </Text>
          ) : null}
        </View>

        {/* Delete */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          className="p-2"
          hitSlop={8}
        >
          <Trash size={15} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}
