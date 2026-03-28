import { View, Text, Pressable, Animated } from "react-native";
import { useEffect, useRef } from "react";

export default function ButtonUploadAnimated({
  children,
  isUploading,
  labelLoading,
  label,
  onPress,
  themeColor = "brandPrimary",
}) {
  const uploadAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let animation;
    let pulse;
    if (isUploading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(uploadAnim, {
            toValue: -10,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(uploadAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      pulse.start();
    } else {
      uploadAnim.setValue(0);
      pulseAnim.setValue(0.6);
    }
    return () => {
      animation?.stop();
      pulse?.stop();
    };
  }, [isUploading]);

  return (
    <View className={` bg-${themeColor}-500/20 rounded-xl overflow-hidden`}>
      {isUploading ? (
        <Animated.View
          className="rounded-xl h-11 flex-row items-center justify-center gap-2 bg-brandPrimary-300 dark:bg-ui-uploadBg-dark"
          style={{
            opacity: pulseAnim,
          }}
        >
          <Animated.View style={{ transform: [{ translateY: uploadAnim }] }}>
            {children}
          </Animated.View>
          <Text className="font-manrope-semi text-ui-text-main dark:text-ui-text-mainDark text-xs">
            {labelLoading}
          </Text>
        </Animated.View>
      ) : (
        <Pressable
          onPress={onPress}
          className={` active:scale-[0.97] rounded-xl h-11 flex-row items-center justify-center gap-2`}
        >
          {children}
          <Text className={`font-manrope-semi text-${themeColor}-300 text-xs`}>
            {label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
