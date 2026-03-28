import { View, Text, Pressable, Animated } from "react-native";
import { useEffect, useRef } from "react";

export default function ButtonUploadAnimated({
  children,
  isUploading,
  labelLoading,
  label,
  onPress,
  backgroundColor,
  textColor,
  backgroundColorAnimated,
  textColorAnimated,
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
    <View>
      {isUploading ? (
        <Animated.View
          className={`rounded-xl h-11 flex-row items-center justify-center gap-2 ${backgroundColorAnimated}`}
          style={{
            opacity: pulseAnim,
          }}
        >
          <Animated.View style={{ transform: [{ translateY: uploadAnim }] }}>
            {children}
          </Animated.View>
          <Text className={`font-manrope-semi ${textColorAnimated} text-xs`}>
            {labelLoading}
          </Text>
        </Animated.View>
      ) : (
        <Pressable
          onPress={onPress}
          className={` active:scale-[0.97] rounded-xl h-11 flex-row items-center justify-center gap-2 ${backgroundColor}`}
        >
          {children}
          <Text className={`font-manrope-semi ${textColor} text-xs`}>
            {label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
