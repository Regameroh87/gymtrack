import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { Pencil } from "../../../assets/icons";
import { ui } from "../../theme/colors";
import { getCloudinaryUrl } from "../../utils/cloudinary";

export default function PreviewImage({
  value,
  children,
  onPress,
  sizeIconEdit = 16,
}) {
  return (
    <View className="items-center justify-center bg-ui-surfaceSecondary-light dark:bg-slate-950 h-full rounded-xl">
      {value ? (
        <>
          <Image
            source={{ uri: getCloudinaryUrl(value) ?? `${value}` }}
            style={{ width: "100%", height: "100%", borderRadius: 12 }}
          />
          <View className=" absolute -bottom-1 -right-1 z-20">
            <Pressable
              className="bg-brandPrimary-300 w-7 h-7 rounded-full items-center justify-center border-2 border-ui-surface-light dark:border-ui-surface-dark shadow-md active:scale-90 transition-all"
              onPress={onPress}
            >
              <Pencil color={ui.text.mutedDark} size={sizeIconEdit} />
            </Pressable>
          </View>
        </>
      ) : (
        <>{children}</>
      )}
    </View>
  );
}
