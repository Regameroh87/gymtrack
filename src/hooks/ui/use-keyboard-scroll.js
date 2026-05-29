import { useRef, useEffect } from "react";
import { Keyboard, Animated, Platform } from "react-native";

/**
 * Hook para manejar el scroll del formulario cuando el teclado aparece.
 *
 * Retorna:
 * - scrollViewRef: ref para asignar al <ScrollView>
 * - keyboardHeight: valor animado para el <Animated.View> del final
 * - scrollToField(fieldRef): hace scroll hasta un campo específico
 * - scrollToEnd(): hace scroll hasta el final (útil para el último campo)
 * - createFieldRef(): crea y retorna un nuevo ref para un campo
 */
export function useKeyboardScroll() {
  const scrollViewRef = useRef(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration : 300,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /**
   * Hace scroll hasta un campo específico dentro del ScrollView.
   * @param {React.RefObject} fieldRef - ref del View contenedor del campo
   * @param {number} offset - píxeles extra de margen arriba del campo (default: 16)
   */
  const scrollToField = (fieldRef, offset = 16) => {
    if (!fieldRef?.current || !scrollViewRef?.current) return;
    setTimeout(() => {
      fieldRef.current.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - offset, animated: true });
        },
        () => {}
      );
    }, 150);
  };

  /**
   * Hace scroll hasta el final del ScrollView.
   * Útil para el último campo del formulario, para que se vea el botón.
   * @param {number} delay - ms a esperar antes de scrollear (default: 400)
   */
  const scrollToEnd = (delay = 400) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, delay);
  };

  return { scrollViewRef, keyboardHeight, scrollToField, scrollToEnd };
}
